"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function AdminLoginForm({ first }: { first: boolean }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          action: first ? "register" : "login",
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Gagal login")
        setBusy(false)
        return
      }
      router.replace("/admin")
      router.refresh()
    } catch {
      setError("Koneksi bermasalah, coba lagi.")
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm border border-border bg-card p-5 md:p-8 flex flex-col gap-3"
    >
      <span className="font-mono text-[10px] text-accent tracking-[0.3em] uppercase">
        {first ? "[Setup] Buat Akun Admin Pertama" : "[Admin] Login"}
      </span>
      <h1 className="font-sans text-3xl md:text-4xl text-foreground tracking-tighter uppercase leading-none">
        Admin<span className="text-accent">.</span>
      </h1>
      <label className="flex flex-col gap-1.5 mt-2">
        <span className="font-mono text-[10px] text-foreground/60 tracking-[0.15em] uppercase">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          className="bg-background border border-border p-3 font-mono text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] text-foreground/60 tracking-[0.15em] uppercase">Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={first ? "new-password" : "current-password"}
          required
          className="bg-background border border-border p-3 font-mono text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
        />
      </label>
      {error && (
        <p className="font-mono text-[10px] text-destructive border border-destructive/40 p-2 leading-relaxed">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className={`mt-2 w-full inline-flex items-center justify-center font-mono text-[11px] tracking-[0.2em] uppercase px-5 py-3.5 min-h-[48px] transition-all ${
          busy
            ? "bg-foreground/10 text-foreground/30 cursor-not-allowed"
            : "bg-accent text-accent-foreground hover-glitch hover:scale-[1.02]"
        }`}
      >
        {busy ? "Memproses..." : first ? "Buat Akun & Masuk" : "Masuk"}
      </button>
      <p className="font-mono text-[9px] text-foreground/30 leading-relaxed">
        Password di-hash (scrypt) & session pakai httpOnly cookie. Akun admin pertama cuma bisa dibuat pas database belum punya admin.
      </p>
    </form>
  )
}
