"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const MIN_PASSWORD = 8

/** Daftar email + password; OTP cuma sekali buat verifikasi kepemilikan email. */
export function PasswordRegister() {
  const router = useRouter()
  const [step, setStep] = useState<"form" | "code">("form")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  function validateForm(): string | null {
    const cleanEmail = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return "Email tidak valid."
    if (password.length < MIN_PASSWORD) return `Password minimal ${MIN_PASSWORD} karakter.`
    if (password.length > 128) return "Password maksimal 128 karakter."
    if (password !== confirm) return "Konfirmasi password belum sama."
    return null
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault()
    if (busy) return
    const formError = validateForm()
    if (formError) {
      setError(formError)
      return
    }

    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/akun/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "email", value: email.trim() }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? "Gagal mengirim kode verifikasi.")
      } else {
        setStep("code")
        setCode("")
        setCooldown(30)
      }
    } catch {
      setError("Koneksi bermasalah, coba lagi.")
    }
    setBusy(false)
  }

  async function register() {
    if (busy) return
    if (code.length !== 6) {
      setError("Masukkan kode 6 digit dari email.")
      return
    }

    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/akun/password/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          code,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? "Gagal membuat password. Coba lagi.")
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

  if (step === "form") {
    return (
      <form onSubmit={sendCode} className="flex w-full max-w-sm flex-col gap-3">
        <label
          htmlFor="register-email"
          className="font-mono text-[9px] md:text-[10px] text-foreground/45 tracking-[0.2em] uppercase"
        >
          Email
        </label>
        <input
          id="register-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="kamu@gmail.com"
          className="bg-background border border-border p-3 font-mono text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-accent min-h-[48px]"
        />

        <label
          htmlFor="register-password"
          className="font-mono text-[9px] md:text-[10px] text-foreground/45 tracking-[0.2em] uppercase"
        >
          Password
        </label>
        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={`Minimal ${MIN_PASSWORD} karakter`}
          maxLength={128}
          className="bg-background border border-border p-3 font-mono text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-accent min-h-[48px]"
        />

        <label
          htmlFor="register-confirm"
          className="font-mono text-[9px] md:text-[10px] text-foreground/45 tracking-[0.2em] uppercase"
        >
          Ulangi Password
        </label>
        <input
          id="register-confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Ulangi password"
          maxLength={128}
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
          {busy ? "Mengirim kode..." : "Buat Akun dengan Password"}
        </button>

        {error && <p className="font-mono text-[10px] text-destructive leading-relaxed">{error}</p>}
        <p className="font-mono text-[9px] md:text-[10px] text-foreground/35 leading-relaxed">
          Kita kirim kode 6 digit sekali buat memastikan email ini benar punya kamu.
          Setelah terverifikasi, login tinggal pakai password.
        </p>
      </form>
    )
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <p className="font-mono text-[10px] text-foreground/50 leading-relaxed">
        Kode verifikasi dikirim ke{" "}
        <span className="text-foreground/75">{email.trim()}</span>. Berlaku 10 menit,
        cek inbox/spam.
      </p>

      <label
        htmlFor="register-code"
        className="font-mono text-[9px] md:text-[10px] text-foreground/45 tracking-[0.2em] uppercase"
      >
        Kode Verifikasi
      </label>
      <input
        id="register-code"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="••••••"
        className="bg-background border border-border p-3 font-mono text-xl tracking-[0.5em] text-foreground text-center placeholder:text-foreground/20 focus:outline-none focus:border-accent min-h-[56px]"
      />

      <button
        type="button"
        onClick={() => void register()}
        disabled={busy || code.length !== 6}
        className={`font-mono text-[10px] tracking-[0.2em] uppercase px-5 py-3 min-h-[48px] ${
          busy || code.length !== 6
            ? "bg-foreground/10 text-foreground/30 cursor-not-allowed"
            : "bg-accent text-accent-foreground hover-glitch"
        }`}
      >
        {busy ? "Memverifikasi..." : "Verifikasi & Buat Akun"}
      </button>

      {error && <p className="font-mono text-[10px] text-destructive leading-relaxed">{error}</p>}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            setStep("form")
            setCode("")
            setError(null)
          }}
          className="font-mono text-[9px] text-foreground/40 hover:text-foreground uppercase tracking-[0.15em]"
        >
          &larr; Ganti email
        </button>
        <button
          type="button"
          onClick={() => void sendCode()}
          disabled={busy || cooldown > 0}
          className="font-mono text-[9px] text-accent disabled:text-foreground/30 uppercase tracking-[0.15em]"
        >
          {cooldown > 0 ? `Kirim ulang (${cooldown}s)` : "Kirim ulang kode"}
        </button>
      </div>
    </div>
  )
}
