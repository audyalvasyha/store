"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

const NAME_EXP = /^[\p{L}\p{N} .'_-]{2,40}$/u

export function ProfileEditor({ initialName }: { initialName?: string }) {
  const router = useRouter()
  const [name, setName] = useState(initialName ?? "")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    const clean = name.replace(/\s+/g, " ").trim()
    if (clean && !NAME_EXP.test(clean)) {
      setError("Nama 2–40 karakter: huruf, angka, spasi, titik, apostrof, _ atau -.")
      setMsg(null)
      return
    }

    setBusy(true)
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
        setBusy(false)
        router.replace("/akun?mode=login")
        router.refresh()
        return
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string; name?: string | null }
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
    setBusy(false)
  }

  return (
    <form onSubmit={save} className="mt-4">
      <label
        htmlFor="profile-name"
        className="font-mono text-[9px] md:text-[10px] text-foreground/45 tracking-[0.2em] uppercase"
      >
        Nama tampilan
      </label>
      <div className="flex gap-2 mt-1.5">
        <input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 40))}
          placeholder="cth: Budi"
          autoComplete="nickname"
          maxLength={40}
          className="min-w-0 flex-1 bg-background border border-border p-2.5 font-mono text-xs md:text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-accent min-h-[42px]"
        />
        <button
          type="submit"
          disabled={busy}
          className={`shrink-0 px-4 font-mono text-[10px] tracking-[0.15em] uppercase min-h-[42px] ${
            busy
              ? "bg-foreground/10 text-foreground/30 cursor-not-allowed"
              : "bg-accent text-accent-foreground hover:opacity-85"
          }`}
        >
          {busy ? "..." : "Simpan"}
        </button>
      </div>
      <p className="mt-1.5 font-mono text-[9px] text-foreground/35 leading-relaxed">
        Dipakai buat sapaan di akun. Nggak tampil di ulasan publik.
      </p>
      {error && <p className="mt-1.5 font-mono text-[10px] text-destructive">{error}</p>}
      {msg && <p className="mt-1.5 font-mono text-[10px] text-accent">{msg}</p>}
    </form>
  )
}
