"use client"

import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { UserAvatar } from "@/components/user-avatar"

const NAME_EXP = /^[\p{L}\p{N} .'_-]{2,40}$/u
const MAX_FILE_BYTES = 8 * 1024 * 1024
const AVATAR_SIZE = 256
const MAX_AVATAR_DATA_URL = 300_000
const PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
])
const PHOTO_EXTENSION_EXP = /\.(?:jpe?g|png|webp|heic|heif)$/i

type AvatarSource = "google" | "custom" | null

function readImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Foto nggak bisa dibaca. Coba file lain."))
    }
    image.src = url
  })
}

/** Crop tengah + resize 256px di browser, biar payload DB tetap kecil. */
async function makeAvatarDataUrl(file: File): Promise<string> {
  if (!PHOTO_TYPES.has(file.type) && !PHOTO_EXTENSION_EXP.test(file.name)) {
    throw new Error("Format foto harus JPG, PNG, WebP, atau HEIC.")
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("Ukuran foto maksimal 8 MB.")
  }

  const image = await readImage(file)
  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error("Foto nggak bisa dibaca. Coba file lain.")
  }

  const side = Math.min(image.naturalWidth, image.naturalHeight)
  const canvas = document.createElement("canvas")
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Browser nggak mendukung edit foto.")

  // Foto transparan tetap punya background yang nyambung dengan tema gelap.
  ctx.fillStyle = "#080808"
  ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(
    image,
    (image.naturalWidth - side) / 2,
    (image.naturalHeight - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE
  )

  const dataUrl = canvas.toDataURL("image/webp", 0.82)
  if (!dataUrl.startsWith("data:image/")) {
    throw new Error("Foto gagal diproses. Coba file lain.")
  }
  if (dataUrl.length > MAX_AVATAR_DATA_URL) {
    throw new Error("Foto masih terlalu besar setelah dikompres. Coba foto lain.")
  }
  return dataUrl
}

export function ProfileEditor({
  initialName,
  initialAvatarUrl,
  initialAvatarSource,
  hasGoogleAvatar = false,
  identityLabel,
}: {
  initialName?: string
  initialAvatarUrl?: string
  initialAvatarSource?: "google" | "custom"
  hasGoogleAvatar?: boolean
  identityLabel: string
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(initialName ?? "")
  const [nameBusy, setNameBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl ?? null)
  const [avatarSource, setAvatarSource] = useState<AvatarSource>(initialAvatarSource ?? null)
  const [googleAvatar, setGoogleAvatar] = useState(hasGoogleAvatar)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoMsg, setPhotoMsg] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const displayName = name.trim() || "Pembeli Gastros"
  const avatarName = name.trim() || identityLabel.split(" · ")[0] || "Pembeli Gastros"
  const sourceLabel =
    avatarSource === "google"
      ? "Foto otomatis dari Google"
      : avatarSource === "custom"
        ? "Foto kustom"
        : null

  async function sendAvatar(next: string | null): Promise<boolean> {
    try {
      const res = await fetch("/api/akun/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: next }),
      })
      if (res.status === 401) {
        setPhotoError("Sesi habis. Masuk lagi ya.")
        router.replace("/akun?mode=login")
        router.refresh()
        return false
      }
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        avatarUrl?: string | null
        avatarSource?: "google" | "custom" | null
        hasGoogleAvatar?: boolean
      }
      if (!res.ok) {
        setPhotoError(data.error ?? "Gagal menyimpan foto profil.")
        return false
      }

      setAvatarUrl(data.avatarUrl ?? null)
      setAvatarSource(
        data.avatarSource === "google" || data.avatarSource === "custom"
          ? data.avatarSource
          : null
      )
      setGoogleAvatar(Boolean(data.hasGoogleAvatar))
      setPhotoMsg(
        data.avatarSource === "google"
          ? "Foto Google dipakai."
          : next
            ? "Foto profil tersimpan."
            : "Foto profil dihapus."
      )
      window.dispatchEvent(new Event("gas-auth-updated"))
      // Refresh data server tanpa me-remount client component, jadi draft nama
      // yang belum disimpan tetap aman dan halaman lain ikut dapat foto baru.
      router.refresh()
      return true
    } catch {
      setPhotoError("Koneksi bermasalah, coba lagi.")
      return false
    }
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Reset value supaya file yang sama tetap bisa dipilih lagi.
    e.target.value = ""
    if (!file || photoBusy) return

    setPhotoBusy(true)
    setPhotoError(null)
    setPhotoMsg(null)
    const previousUrl = avatarUrl
    const previousSource = avatarSource
    try {
      const dataUrl = await makeAvatarDataUrl(file)
      setAvatarUrl(dataUrl)
      const saved = await sendAvatar(dataUrl)
      if (!saved) {
        setAvatarUrl(previousUrl)
        setAvatarSource(previousSource)
      }
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Foto gagal diproses.")
    } finally {
      setPhotoBusy(false)
    }
  }

  async function removePhoto() {
    if (photoBusy) return
    setPhotoBusy(true)
    setPhotoError(null)
    setPhotoMsg(null)
    try {
      await sendAvatar(null)
    } finally {
      setPhotoBusy(false)
    }
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    if (nameBusy) return
    const clean = name.replace(/\s+/g, " ").trim()
    if (clean && !NAME_EXP.test(clean)) {
      setError("Nama 2–40 karakter: huruf, angka, spasi, titik, apostrof, _ atau -.")
      setMsg(null)
      return
    }

    setNameBusy(true)
    setError(null)
    setMsg(null)
    try {
      const res = await fetch("/api/akun/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: clean }),
      })
      if (res.status === 401) {
        setError("Sesi habis. Masuk lagi ya.")
        setNameBusy(false)
        router.replace("/akun?mode=login")
        router.refresh()
        return
      }
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        name?: string | null
      }
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan nama.")
      } else {
        setName(data.name ?? "")
        setMsg(data.name ? "Nama tersimpan." : "Nama dihapus.")
        window.dispatchEvent(new Event("gas-auth-updated"))
        router.refresh()
      }
    } catch {
      setError("Koneksi bermasalah, coba lagi.")
    }
    setNameBusy(false)
  }

  return (
    <div className="mt-4">
      <div className="flex items-start gap-3">
        <UserAvatar
          src={avatarUrl}
          name={avatarName}
          className="h-16 w-16 shrink-0"
          fallbackClassName="text-2xl"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-sans text-xl uppercase tracking-tight text-foreground md:text-2xl">
            {displayName}
          </p>
          <p className="truncate font-mono text-[10px] text-foreground/45">{identityLabel}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={photoBusy}
              className={`min-h-[36px] border border-border px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors ${
                photoBusy
                  ? "cursor-not-allowed text-foreground/30"
                  : "text-foreground/60 hover:border-accent hover:text-foreground"
              }`}
            >
              {photoBusy ? "Menyimpan..." : "Ganti foto"}
            </button>
            {avatarSource === "custom" && (
              <button
                type="button"
                onClick={() => void removePhoto()}
                disabled={photoBusy}
                className="min-h-[36px] border border-border px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-foreground/45 transition-colors hover:border-accent hover:text-foreground disabled:cursor-not-allowed disabled:text-foreground/25"
              >
                {googleAvatar ? "Pakai foto Google" : "Hapus foto"}
              </button>
            )}
          </div>
          {sourceLabel && (
            <span className="mt-1.5 block font-mono text-[8px] uppercase tracking-[0.15em] text-foreground/30">
              {sourceLabel}
            </span>
          )}
          {photoError && (
            <p className="mt-1.5 font-mono text-[10px] text-destructive">{photoError}</p>
          )}
          {photoMsg && (
            <p className="mt-1.5 font-mono text-[10px] text-accent">{photoMsg}</p>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif"
        onChange={onPickFile}
        className="sr-only"
        aria-label="Pilih foto profil"
        tabIndex={-1}
      />

      <form onSubmit={saveName} className="mt-4">
        <label
          htmlFor="profile-name"
          className="font-mono text-[9px] text-foreground/45 uppercase tracking-[0.2em] md:text-[10px]"
        >
          Nama tampilan
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 40))}
            placeholder="cth: Budi"
            autoComplete="nickname"
            maxLength={40}
            className="min-h-[42px] min-w-0 flex-1 border border-border bg-background p-2.5 font-mono text-xs text-foreground placeholder:text-foreground/25 focus:border-accent focus:outline-none md:text-sm"
          />
          <button
            type="submit"
            disabled={nameBusy}
            className={`min-h-[42px] shrink-0 px-4 font-mono text-[10px] uppercase tracking-[0.15em] ${
              nameBusy
                ? "cursor-not-allowed bg-foreground/10 text-foreground/30"
                : "bg-accent text-accent-foreground hover:opacity-85"
            }`}
          >
            {nameBusy ? "..." : "Simpan"}
          </button>
        </div>
        <p className="mt-1.5 font-mono text-[9px] leading-relaxed text-foreground/35">
          Dipakai buat sapaan di akun. Nggak tampil di ulasan publik.
        </p>
        {error && <p className="mt-1.5 font-mono text-[10px] text-destructive">{error}</p>}
        {msg && <p className="mt-1.5 font-mono text-[10px] text-accent">{msg}</p>}
      </form>
    </div>
  )
}
