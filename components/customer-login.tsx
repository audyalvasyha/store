"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type Channel = "email" | "wa"

const CHANNELS: { key: Channel; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "wa", label: "WhatsApp" },
]

/** Login/daftar pembeli: email (Resend) atau nomor WhatsApp → kode OTP 6 digit. */
export function CustomerLogin({
  mode = "login",
}: {
  mode?: "login" | "daftar"
}) {
  const router = useRouter()
  const isRegister = mode === "daftar"
  const [channel, setChannel] = useState<Channel>("email")
  const [step, setStep] = useState<"identity" | "code">("identity")
  const [value, setValue] = useState("")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  const isEmail = channel === "email"
  const validValue = isEmail
    ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    : value.replace(/\D/g, "").length >= 9

  function switchChannel(next: Channel) {
    setChannel(next)
    setStep("identity")
    setCode("")
    setMsg(null)
    setCooldown(0)
  }

  async function sendOtp() {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch("/api/akun/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, value: value.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg(data.error ?? "Gagal mengirim kode")
      } else {
        setStep("code")
        setCode("")
        setCooldown(30)
        setMsg(null)
      }
    } catch {
      setMsg("Koneksi bermasalah, coba lagi.")
    }
    setBusy(false)
  }

  async function verify() {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch("/api/akun/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, value: value.trim(), code }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg(data.error ?? "Kode salah")
      } else {
        // Sinkronkan chip akun di header tanpa perlu reload penuh.
        window.dispatchEvent(new Event("gas-auth-updated"))
        router.replace("/akun")
        router.refresh()
      }
    } catch {
      setMsg("Koneksi bermasalah, coba lagi.")
    }
    setBusy(false)
  }

  return (
    <div className="flex flex-col gap-4 max-w-sm">
      {/* Pilihan channel */}
      <div className="grid grid-cols-2 gap-2">
        {CHANNELS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => switchChannel(c.key)}
            className={`flex items-center justify-center border px-3 py-2.5 min-h-[48px] transition-colors ${
              channel === c.key
                ? "border-accent bg-accent/10"
                : "border-border hover:border-foreground/40"
            }`}
          >
            <span
              className={`font-mono text-[10px] tracking-[0.15em] uppercase ${
                channel === c.key ? "text-accent" : "text-foreground/60"
              }`}
            >
              {c.label}
            </span>
          </button>
        ))}
      </div>

      {step === "identity" ? (
        <>
          <label className="font-mono text-[9px] md:text-[10px] text-foreground/45 tracking-[0.2em] uppercase">
            {isEmail ? "Alamat Email" : "Nomor WhatsApp"}
          </label>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            type={isEmail ? "email" : "tel"}
            inputMode={isEmail ? "email" : "tel"}
            autoComplete={isEmail ? "email" : "tel"}
            placeholder={isEmail ? "kamu@gmail.com" : "081234567890"}
            className="bg-background border border-border p-3 font-mono text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-accent min-h-[48px]"
          />
          <button
            type="button"
            onClick={sendOtp}
            disabled={busy || !validValue}
            className={`font-mono text-[10px] tracking-[0.2em] uppercase px-5 py-3 min-h-[48px] ${
              busy || !validValue
                ? "bg-foreground/10 text-foreground/30 cursor-not-allowed"
                : "bg-accent text-accent-foreground hover-glitch"
            }`}
          >
            {busy ? "Mengirim..." : isEmail ? "Kirim Kode ke Email" : "Kirim Kode via WhatsApp"}
          </button>
          {msg && <p className="font-mono text-[10px] text-destructive leading-relaxed">{msg}</p>}
          <p className="font-mono text-[9px] md:text-[10px] text-foreground/35 leading-relaxed">
            Masuk cepat tanpa password — cukup kode 6 digit. Email/nomor dipakai buat
            nyambungin riwayat order kamu, termasuk order sebelum punya akun.
          </p>
        </>
      ) : (
        <>
          <label className="font-mono text-[9px] md:text-[10px] text-foreground/45 tracking-[0.2em] uppercase">
            Kode dari {isEmail ? "email" : "WhatsApp"}
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="••••••"
            className="bg-background border border-border p-3 font-mono text-xl tracking-[0.5em] text-foreground text-center placeholder:text-foreground/20 focus:outline-none focus:border-accent min-h-[56px]"
          />
          <button
            type="button"
            onClick={verify}
            disabled={busy || code.length !== 6}
            className={`font-mono text-[10px] tracking-[0.2em] uppercase px-5 py-3 min-h-[48px] ${
              busy || code.length !== 6
                ? "bg-foreground/10 text-foreground/30 cursor-not-allowed"
                : "bg-accent text-accent-foreground hover-glitch"
            }`}
          >
            {busy ? "Memverifikasi..." : isRegister ? "Buat Akun & Masuk" : "Masuk ke Akun"}
          </button>
          {msg && <p className="font-mono text-[10px] text-destructive leading-relaxed">{msg}</p>}
          <p className="font-mono text-[9px] text-foreground/40 leading-relaxed">
            Kode dikirim ke <span className="text-foreground/70">{value.trim()}</span>. Cek
            {isEmail ? " inbox/spam" : " WhatsApp"} — berlaku 10 menit.
          </p>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setStep("identity")
                setCode("")
                setMsg(null)
              }}
              className="font-mono text-[9px] text-foreground/40 hover:text-foreground uppercase tracking-[0.15em]"
            >
              &larr; Ganti {isEmail ? "email" : "nomor"}
            </button>
            <button
              type="button"
              onClick={sendOtp}
              disabled={busy || cooldown > 0}
              className="font-mono text-[9px] text-accent disabled:text-foreground/30 uppercase tracking-[0.15em]"
            >
              {cooldown > 0 ? `Kirim ulang (${cooldown}s)` : "Kirim ulang kode"}
            </button>
          </div>
        </>
      )}

    </div>
  )
}
