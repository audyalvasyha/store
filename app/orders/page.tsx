"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function OrdersPage() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault()
    const clean = code.trim().toUpperCase()
    if (!clean) return
    setChecking(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders?code=${encodeURIComponent(clean)}`)
      if (!res.ok) {
        setError("Order tidak ditemukan. Cek lagi kode-nya.")
        setChecking(false)
        return
      }
      router.push(`/orders/${clean}`)
    } catch {
      setError("Koneksi bermasalah, coba lagi.")
      setChecking(false)
    }
  }

  return (
    <main className="relative min-h-screen">
      <div className="noise-overlay" aria-hidden="true" />

      <header className="px-4 md:px-8 lg:px-12 py-3 md:py-6 border-b border-border flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div className="absolute inset-0 bg-accent" />
            <span className="relative font-sans text-lg text-accent-foreground leading-none">G$</span>
          </div>
          <span className="font-mono text-[10px] tracking-[0.3em] text-foreground uppercase">Gas Store</span>
        </Link>
        <Link
          href="/"
          className="font-mono text-[9px] md:text-[11px] tracking-[0.25em] text-foreground/50 hover:text-foreground uppercase transition-colors"
        >
          &larr; Beranda
        </Link>
      </header>

      <section className="px-4 md:px-8 lg:px-12 pt-8 md:pt-20 pb-8 md:pb-24 max-w-[1400px] mx-auto w-full">
        <div className="max-w-2xl">
          <span className="font-mono text-[8px] md:text-[10px] text-accent tracking-[0.2em] md:tracking-[0.3em] uppercase block mb-1 md:mb-2">
            [Riwayat] &mdash; Cek Status Order
          </span>
          <h1 className="font-sans text-[13vw] sm:text-6xl md:text-8xl tracking-tighter text-foreground leading-[0.85] uppercase mb-4 md:mb-8">
            Riwayat<br />Order<span className="text-accent">.</span>
          </h1>
          <p className="font-mono text-[9px] md:text-xs text-muted-foreground leading-relaxed mb-6 md:mb-10 max-w-md">
            Masukin kode order yang kamu terima (format <span className="text-foreground">GAS-XXXXXX</span>) buat lihat status pembayaran &amp; instruksi selanjutnya.
          </p>

          <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-2 md:gap-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="GAS-XXXXXX"
              autoComplete="off"
              className="flex-1 bg-card border border-border p-3 md:p-4 font-mono text-sm md:text-lg text-foreground uppercase placeholder:text-foreground/25 focus:outline-none focus:border-accent transition-colors"
            />
            <button
              type="submit"
              disabled={!code.trim() || checking}
              className={`inline-flex items-center justify-center font-mono text-[10px] md:text-sm tracking-[0.2em] uppercase px-6 md:px-8 py-3.5 md:py-4 min-h-[48px] transition-all ${
                code.trim() && !checking
                  ? "bg-accent text-accent-foreground hover-glitch hover:scale-[1.02]"
                  : "bg-foreground/10 text-foreground/30 cursor-not-allowed"
              }`}
            >
              {checking ? "MENGECEK..." : "Cek Order"}
            </button>
          </form>

          {error && (
            <p className="mt-4 font-mono text-[9px] md:text-xs text-destructive border border-destructive/40 p-3 leading-relaxed">
              {error}
            </p>
          )}

          <div className="mt-6 md:mt-10 border border-border bg-card p-4 md:p-6">
            <span className="font-mono text-[9px] md:text-xs text-accent tracking-[0.25em] uppercase block mb-3">
              [Info] &mdash; Flow Pembayaran MVP
            </span>
            <p className="font-mono text-[9px] md:text-xs text-muted-foreground leading-relaxed">
              Karena integrasi payment gateway (QRIS/e-wallet otomatis) belum aktif, order yang kamu buat berstatus{" "}
              <span className="text-foreground">MENUNGGU PEMBAYARAN</span> dengan instruksi transfer di halaman detail order.
              Confirm via WhatsApp, dan item diproses manual oleh mekanis dalam hitungan menit &mdash; paket MVP ini tetap jalan end-to-end.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
