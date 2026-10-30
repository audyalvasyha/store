"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { GameItem } from "@/lib/catalog"
import { PAYMENT_METHODS, formatIDR } from "@/lib/catalog"

const MAX_QTY = 5

export function TopupForm({ game }: { game: GameItem }) {
  const router = useRouter()

  const [denomId, setDenomId] = useState(game.denominations[0].id)
  const [quantity, setQuantity] = useState(1)
  const [userId, setUserId] = useState("")
  const [server, setServer] = useState("")
  const [email, setEmail] = useState("")
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0].id)
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const denom = useMemo(
    () => game.denominations.find((d) => d.id === denomId) ?? game.denominations[0],
    [game.denominations, denomId]
  )
  const total = denom.price * quantity

  const uidValid = /^[A-Za-z0-9._:\-]{4,24}$/.test(userId.trim())
  const serverValid = !game.needsServer || /^[A-Za-z0-9]{1,16}$/.test(server.trim())
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const canSubmit = uidValid && serverValid && emailValid && agree && !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameSlug: game.slug,
          denomId,
          quantity,
          userId: userId.trim(),
          server: game.needsServer ? server.trim() : undefined,
          email: email.trim(),
          method,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Gagal membuat order, coba lagi.")
        setSubmitting(false)
        return
      }
      router.push(`/orders/${data.order.code}`)
    } catch {
      setError("Koneksi bermasalah, coba lagi.")
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 md:gap-8 items-start">
      <div className="flex flex-col gap-4 md:gap-6">
        {/* STEP 1: nominal */}
        <fieldset className="border border-border bg-card p-4 md:p-6">
          <legend className="font-mono text-[9px] md:text-xs text-accent tracking-[0.25em] uppercase px-2">
            01 &mdash; Pilih Nominal ({game.currency})
          </legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3 mt-2 md:mt-3">
            {game.denominations.map((d) => (
              <button
                type="button"
                key={d.id}
                onClick={() => setDenomId(d.id)}
                aria-pressed={denomId === d.id}
                className={`relative text-left border p-2.5 md:p-4 transition-colors duration-200 min-h-[64px] md:min-h-[96px] ${
                  denomId === d.id
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-foreground/50"
                }`}
              >
                <span className={`block font-sans text-sm md:text-xl tracking-tighter uppercase leading-tight ${denomId === d.id ? "text-accent" : "text-foreground"}`}>
                  {d.label}
                </span>
                <span className="block font-mono text-[8px] md:text-[10px] text-foreground/40 mt-1">{formatIDR(d.price)}</span>
                {d.detail && (
                  <span className="block font-mono text-[7px] md:text-[8px] text-accent/70 mt-0.5 leading-snug">{d.detail}</span>
                )}
                {denomId === d.id && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent" />}
              </button>
            ))}
          </div>
        </fieldset>

        {/* STEP 2: akun */}
        <fieldset className="border border-border bg-card p-4 md:p-6">
          <legend className="font-mono text-[9px] md:text-xs text-accent tracking-[0.25em] uppercase px-2">
            02 &mdash; Data Akun {game.short}
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mt-2 md:mt-3">
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[8px] md:text-[10px] text-foreground/60 tracking-[0.15em] uppercase">
                User ID *
              </span>
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="cth: 12345678"
                autoComplete="off"
                className={`bg-background border p-2.5 md:p-3 font-mono text-xs md:text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-accent transition-colors ${userId && !uidValid ? "border-destructive" : "border-border"}`}
              />
              {userId && !uidValid && (
                <span className="font-mono text-[7px] md:text-[9px] text-destructive">4-24 karakter, huruf/angka/._:-</span>
              )}
            </label>
            {game.needsServer && (
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[8px] md:text-[10px] text-foreground/60 tracking-[0.15em] uppercase">
                  Server / Zone ID *
                </span>
                <input
                  value={server}
                  onChange={(e) => setServer(e.target.value)}
                  placeholder="cth: 1234"
                  autoComplete="off"
                  className={`bg-background border p-2.5 md:p-3 font-mono text-xs md:text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-accent transition-colors ${server && !serverValid ? "border-destructive" : "border-border"}`}
                />
                {server && !serverValid && (
                  <span className="font-mono text-[7px] md:text-[9px] text-destructive">Angka/huruf tanpa spasi</span>
                )}
              </label>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[8px] md:text-[10px] text-foreground/60 tracking-[0.15em] uppercase">
                Email Notifikasi *
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kamu@email.com"
                autoComplete="email"
                className={`bg-background border p-2.5 md:p-3 font-mono text-xs md:text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-accent transition-colors ${email && !emailValid ? "border-destructive" : "border-border"}`}
              />
            </label>
          </div>
        </fieldset>

        {/* STEP 3: pembayaran */}
        <fieldset className="border border-border bg-card p-4 md:p-6">
          <legend className="font-mono text-[9px] md:text-xs text-accent tracking-[0.25em] uppercase px-2">
            03 &mdash; Metode Pembayaran
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 mt-2 md:mt-3">
            {PAYMENT_METHODS.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setMethod(m.id)}
                aria-pressed={method === m.id}
                className={`relative border p-2.5 md:p-4 text-left transition-colors duration-200 min-h-[56px] ${
                  method === m.id ? "border-accent bg-accent/10" : "border-border hover:border-foreground/50"
                }`}
              >
                <span className={`block font-sans text-sm md:text-lg tracking-tight uppercase ${method === m.id ? "text-accent" : "text-foreground"}`}>
                  {m.label}
                </span>
                <span className="block font-mono text-[7px] md:text-[9px] text-foreground/40 mt-0.5">{m.detail}</span>
                {method === m.id && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent" />}
              </button>
            ))}
          </div>
          <label className="flex items-start gap-2 mt-3 md:mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 accent-[hsl(var(--accent))] w-4 h-4 shrink-0"
            />
            <span className="font-mono text-[8px] md:text-[10px] text-foreground/50 leading-relaxed">
              Data akun yang saya isi benar. Item dikirim otomatis setelah pembayaran terverifikasi &mdash; salah ID bukan tanggung jawab Gas Store.
            </span>
          </label>
        </fieldset>
      </div>

      {/* ORDER SUMMARY */}
      <aside className="lg:sticky lg:top-4 border border-border bg-card p-4 md:p-6">
        <span className="font-mono text-[9px] md:text-xs text-accent tracking-[0.25em] uppercase block mb-3 md:mb-5">
          [Ringkasan]
        </span>
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 md:w-14 md:h-14 shrink-0 flex items-center justify-center font-sans text-xl md:text-2xl text-foreground/80 tracking-tighter border border-border"
            style={{ background: `radial-gradient(ellipse at 30% 25%, hsl(${game.hue} / 0.55), transparent 65%), hsl(0 0% 6%)` }}
          >
            {game.glyph}
          </div>
          <div className="min-w-0">
            <h2 className="font-sans text-lg md:text-2xl text-foreground tracking-tighter uppercase truncate">{game.short}</h2>
            <span className="font-mono text-[7px] md:text-[9px] text-foreground/40 uppercase tracking-[0.1em] block truncate">
              {game.currency}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 font-mono text-[9px] md:text-xs border-t border-border pt-3 md:pt-4">
          <div className="flex justify-between gap-2">
            <span className="text-foreground/50">Nominal</span>
            <span className="text-foreground text-right">{denom.label}</span>
          </div>
          <div className="flex justify-between gap-2 items-center">
            <span className="text-foreground/50">Jumlah</span>
            <span className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="border border-border w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-foreground hover:border-accent hover:text-accent transition-colors"
                aria-label="Kurangi jumlah"
              >
                -
              </button>
              <span className="text-foreground tabular-nums w-5 text-center">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(MAX_QTY, q + 1))}
                className="border border-border w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-foreground hover:border-accent hover:text-accent transition-colors"
                aria-label="Tambah jumlah"
              >
                +
              </button>
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-foreground/50">Bayar via</span>
            <span className="text-foreground uppercase">{PAYMENT_METHODS.find((m) => m.id === method)?.label}</span>
          </div>
        </div>

        <div className="border-t border-border mt-3 md:mt-4 pt-3 md:pt-4 flex items-baseline justify-between gap-2">
          <span className="font-mono text-[8px] md:text-[10px] text-foreground/50 tracking-[0.2em] uppercase">Total</span>
          <span className="font-sans text-2xl md:text-3xl text-accent tabular-nums">{formatIDR(total)}</span>
        </div>

        {error && (
          <p className="mt-3 font-mono text-[8px] md:text-[10px] text-destructive border border-destructive/40 p-2 leading-relaxed">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full mt-4 inline-flex items-center justify-center font-mono text-[10px] md:text-sm tracking-[0.2em] uppercase px-5 py-3.5 md:py-4 min-h-[48px] transition-all ${
            canSubmit
              ? "bg-accent text-accent-foreground hover-glitch hover:scale-[1.02]"
              : "bg-foreground/10 text-foreground/30 cursor-not-allowed"
          }`}
        >
          {submitting ? "MEMPROSES..." : "Buat Order"}
        </button>

        <Link
          href="/"
          className="block text-center font-mono text-[8px] md:text-[10px] text-foreground/40 hover:text-accent transition-colors tracking-[0.15em] uppercase mt-3 py-1"
        >
          &larr; Pilih game lain
        </Link>
      </aside>
    </form>
  )
}
