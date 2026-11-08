"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

/** Atur password baru. Sesi password wajib konfirmasi password lama. */
export function PasswordEditor({
  hasPassword,
  provider,
}: {
  hasPassword: boolean
  provider?: "otp" | "google" | "password"
}) {
  const router = useRouter()
  const needsCurrent = hasPassword && provider === "password"
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    if (needsCurrent && !current) {
      setError("Masukkan password sekarang.")
      setMsg(null)
      return
    }
    if (next.length < 8) {
      setError("Password baru minimal 8 karakter.")
      setMsg(null)
      return
    }
    if (next.length > 128) {
      setError("Password maksimal 128 karakter.")
      setMsg(null)
      return
    }
    if (next !== confirm) {
      setError("Konfirmasi password baru belum sama.")
      setMsg(null)
      return
    }

    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      const res = await fetch("/api/akun/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword: next,
          ...(needsCurrent ? { currentPassword: current } : {}),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan password.")
      } else {
        setCurrent("")
        setNext("")
        setConfirm("")
        setMsg("Password tersimpan. Login berikutnya bisa pakai email + password.")
        router.refresh()
      }
    } catch {
      setError("Koneksi bermasalah, coba lagi.")
    }
    setBusy(false)
  }

  return (
    <form onSubmit={save} className="mt-4 border-t border-border pt-4">
      <p className="font-mono text-[9px] md:text-[10px] text-foreground/45 tracking-[0.2em] uppercase">
        {hasPassword ? "Ganti password" : "Buat password"}
      </p>
      <p className="mt-1 font-mono text-[9px] text-foreground/30 leading-relaxed">
        {needsCurrent
          ? "Masukkan password sekarang lalu password baru."
          : hasPassword
            ? "Sesi ini sudah terverifikasi lewat OTP/Google, jadi kamu bisa langsung bikin password baru."
            : "Biar login berikutnya nggak perlu nunggu kode OTP."}
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {needsCurrent && (
          <input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Password sekarang"
            className="bg-background border border-border p-2.5 font-mono text-xs text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-accent min-h-[42px]"
          />
        )}
        <input
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="Password baru (min. 8 karakter)"
          maxLength={128}
          className="bg-background border border-border p-2.5 font-mono text-xs text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-accent min-h-[42px]"
        />
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Ulangi password baru"
          maxLength={128}
          className="bg-background border border-border p-2.5 font-mono text-xs text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-accent min-h-[42px]"
        />
        <button
          type="submit"
          disabled={busy}
          className={`self-start px-4 font-mono text-[10px] tracking-[0.15em] uppercase min-h-[40px] ${
            busy
              ? "bg-foreground/10 text-foreground/30 cursor-not-allowed"                  : "bg-accent text-accent-foreground hover:opacity-90"
          }`}
        >
          {busy ? "Menyimpan..." : "Simpan Password"}
        </button>
      </div>

      {error && <p className="mt-2 font-mono text-[10px] text-destructive leading-relaxed">{error}</p>}
      {msg && <p className="mt-2 font-mono text-[10px] text-accent leading-relaxed">{msg}</p>}
    </form>
  )
}
