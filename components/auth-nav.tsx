"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

export type AuthUser = {
  kind: "email" | "phone"
  provider?: "otp" | "google" | "password" | null
  masked: string
  name?: string | null
}

type AuthState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "user"; user: AuthUser }

/**
 * Navigasi auth di header:
 * - Tamu: tombol Masuk + Daftar.
 * - Login: chip nama/identitas + dropdown akun & keluar.
 *
 * Sengaja client-side: halaman publik pakai ISR, jadi status sesi nggak boleh
 * ikut di-cache di HTML. Endpoint /api/akun/me cuma balikin versi tersamar.
 */
export function AuthNav({
  initialUser,
  menuAlign = "right",
}: {
  initialUser?: AuthUser | null
  menuAlign?: "left" | "center" | "right"
}) {
  const router = useRouter()
  // Halaman yang sudah tahu sesi dari server (mis. /akun) bisa kirim initialUser
  // biar chip akun nggak sempat berkedip jadi tombol tamu.
  const [state, setState] = useState<AuthState>(
    initialUser === undefined
      ? { status: "loading" }
      : initialUser
        ? { status: "user", user: initialUser }
        : { status: "guest" }
  )
  const [open, setOpen] = useState(false)
  const [version, setVersion] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  // Refetch saat login/logout/ganti nama dari komponen lain di halaman yang sama.
  useEffect(() => {
    function refresh() {
      setVersion((v) => v + 1)
    }
    window.addEventListener("gas-auth-updated", refresh)
    return () => window.removeEventListener("gas-auth-updated", refresh)
  }, [])

  useEffect(() => {
    let active = true
    fetch("/api/akun/me", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Gagal cek sesi")
        return (await res.json()) as { user: AuthUser | null }
      })
      .then((data) => {
        if (!active) return
        setState(data.user ? { status: "user", user: data.user } : { status: "guest" })
      })
      .catch(() => {
        // Kalau sebelumnya sudah yakin login (initialUser), jangan turunkan ke
        // tampilan tamu cuma karena API sesi lagi error/rate-limited.
        if (active) {
          setState((prev) => (prev.status === "user" ? prev : { status: "guest" }))
        }
      })
    return () => {
      active = false
    }
  }, [version])

  // Tutup dropdown kalau klik di luar / tekan Escape.
  useEffect(() => {
    if (!open) return
    function onPointer(e: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointer)
    document.addEventListener("touchstart", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointer)
      document.removeEventListener("touchstart", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  async function logout() {
    setOpen(false)
    setState({ status: "guest" })
    await fetch("/api/akun/logout", { method: "POST" }).catch(() => null)
    window.dispatchEvent(new Event("gas-auth-updated"))
    router.refresh()
  }

  // Saat loading, tampilkan tombol tamu dulu — CTA langsung kelihatan dan
  // konsisten dengan HTML awal (hindari layout shift). Kalau ternyata login,
  // state berganti ke menu akun begitu /api/akun/me selesai.
  if (state.status !== "user") {
    return (
      <div className="flex items-center gap-1.5">
        <Link
          href="/akun?mode=login"
          prefetch={false}
          className="inline-flex min-h-[36px] items-center whitespace-nowrap border border-border px-2 md:px-3 font-mono text-[9px] md:text-[10px] tracking-[0.12em] uppercase text-foreground/70 transition-colors hover:border-accent hover:text-foreground"
        >
          Masuk
        </Link>
        <Link
          href="/akun?mode=daftar"
          prefetch={false}
          className="inline-flex min-h-[36px] items-center whitespace-nowrap bg-accent px-2 md:px-3 font-mono text-[9px] md:text-[10px] tracking-[0.12em] uppercase text-accent-foreground transition-opacity hover:opacity-85"
        >
          Daftar
        </Link>
      </div>
    )
  }

  const { user } = state
  const displayName = user.name?.trim() || user.masked
  const initial = (
    user.name?.trim()?.[0] ??
    (user.kind === "email" ? user.masked[0] : "W")
  ).toUpperCase()

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu akun"
        className="flex min-h-[36px] items-center gap-1.5 border border-border bg-card px-1.5 md:px-2 transition-colors hover:border-accent"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-accent font-sans text-xs leading-none text-accent-foreground">
          {initial}
        </span>
        <span className="hidden max-w-[96px] truncate font-mono text-[9px] uppercase tracking-[0.08em] text-foreground/75 md:text-[10px] sm:block">
          {displayName}
        </span>
        <span className="text-[8px] text-foreground/40" aria-hidden="true">
          ▼
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute z-50 mt-2 w-60 border border-border bg-background shadow-2xl ${
            menuAlign === "center"
              ? "left-1/2 -translate-x-1/2"
              : menuAlign === "left"
                ? "left-0"
                : "right-0"
          }`}
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.1em] text-foreground">
              {displayName}
            </p>
            <p className="mt-0.5 truncate font-mono text-[9px] tracking-[0.08em] text-foreground/40">
              {user.masked}
            </p>
          </div>
          <Link
            href="/akun"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-foreground/60 transition-colors hover:bg-card hover:text-foreground"
          >
            Akun Saya
          </Link>
          <Link
            href="/orders"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-foreground/60 transition-colors hover:bg-card hover:text-foreground"
          >
            Riwayat Order
          </Link>
          <Link
            href="/games"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-foreground/60 transition-colors hover:bg-card hover:text-foreground"
          >
            Top Up Lagi
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => void logout()}
            className="block w-full border-t border-border px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-destructive transition-colors hover:bg-destructive/10"
          >
            Keluar
          </button>
        </div>
      )}
    </div>
  )
}
