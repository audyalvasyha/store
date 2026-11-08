"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

/** Login email + password. Fallback OTP buat akun lama / lupa password. */
export function PasswordLogin() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    const cleanEmail = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || !password) {
      setError("Isi email dan password yang valid.")
      return
    }

    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/akun/password/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? "Email atau password salah.")
        setBusy(false)
        return
      }
      window.dispatchEvent(new Event("gas-auth-updated"))
      router.replace("/akun")
      router.refresh()
    } catch {
      setError("Koneksi bermasalah, coba lagi.")
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-3">
      <label
        htmlFor="password-email"
        className="font-mono text-[9px] md:text-[10px] text-foreground/45 tracking-[0.2em] uppercase"
      >
        Email
      </label>
      <input
        id="password-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="kamu@gmail.com"
        className="bg-background border border-border p-3 font-mono text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-accent min-h-[48px]"
      />

      <label
        htmlFor="password-current"
        className="font-mono text-[9px] md:text-[10px] text-foreground/45 tracking-[0.2em] uppercase"
      >
        Password
      </label>
      <input
        id="password-current"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password kamu"
        className="bg-background border border-border p-3 font-mono text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-accent min-h-[48px]"
      />

      <button
        type="submit"
        disabled={busy}
        className={`font-mono text-[10px] tracking-[0.2em] uppercase px-5 py-3 min-h-[48px] ${
          busy
            ? "bg-foreground/10 text-foreground/30 cursor-not-allowed"
            : "bg-accent text-accent-foreground hover-glitch"
        }`}
      >
        {busy ? "Memeriksa..." : "Masuk dengan Password"}
      </button>

      {error && <p className="font-mono text-[10px] text-destructive leading-relaxed">{error}</p>}

      <p className="font-mono text-[9px] md:text-[10px] text-foreground/35 leading-relaxed">
        Lupa atau belum punya password?{" "}
        <a href="#otp" className="text-accent hover:text-foreground transition-colors">
          Masuk pakai kode OTP
        </a>{" "}
        dulu, lalu atur password baru di halaman akun.
      </p>
    </form>
  )
}
