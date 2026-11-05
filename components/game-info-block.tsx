import Link from "next/link"
import { GAMES, formatIDR, PAYMENT_METHODS } from "@/lib/catalog"
import type { GameItem } from "@/lib/catalog"

/**
 * Blok konten + internal link di bawah form top up.
 *
 * Kenapa ada: halaman top up sebelumnya tipis (header + form aja) — buat
 * Google itu thin content. Blok ini nambahin copy deskriptif per-game kayak
 * harga rendahnya, publisher, metode bayar, plus 4 link internal ke game
 * lain biar crawl equity ngalir Antar halaman top up.
 */
export function GameInfoBlock({ game }: { game: GameItem }) {
  const prices = game.denominations.map((d) => d.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)

  const payLine = [...PAYMENT_METHODS, "QRIS"]
    .filter((p, i, arr) => arr.indexOf(p) === i)
    .slice(0, 6)
    .join(", ")

  // Related: prioritaskan game se-kategori, sisanya game featured. Max 4.
  const related = [
    ...GAMES.filter((g) => g.slug !== game.slug && g.category === game.category),
    ...GAMES.filter((g) => g.slug !== game.slug && g.featured && g.category !== game.category),
  ].slice(0, 4)

  return (
    <section aria-label={`Info lengkap top up ${game.name}`} className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 pb-10 md:pb-16">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
        {/* Copy deskriptif per-game */}
        <div className="lg:col-span-2 border border-border bg-card p-5 md:p-8">
          <span className="font-mono text-[10px] md:text-[11px] text-accent tracking-[0.25em] uppercase block mb-2">
            [Informasi] &mdash; Top Up {game.name}
          </span>
          <h2 className="font-sans text-[7vw] sm:text-3xl md:text-5xl tracking-tighter text-foreground leading-[0.9] uppercase mb-3 md:mb-5">
            {game.name} {game.currency} <span className="text-accent">Murah.</span>
          </h2>
          <div className="font-mono text-[10px] md:text-xs text-foreground/60 leading-relaxed space-y-2.5 max-w-prose">
            <p>
              Top up {game.currency} {game.name} (publisher {game.publisher}) mulai{" "}
              <span className="text-foreground">{formatIDR(minPrice)}</span> sampai{" "}
              {formatIDR(maxPrice)} per transaksi. Cukup masukin {game.needsServer ? "User ID + Server ID" : "User ID"}, pilih
              nominal, bayar &mdash; item masuk akun dalam hitungan menit lewat jalur resmi publisher, tanpa perlu login akun game.
            </p>
            <p>
              Pembayaran: {payLine} &amp; metode lainnya. Order diproses 24 jam &mdash; rata-rata di bawah 3 menit
              setelah pembayaran terverifikasi. Kalau item belum masuk dalam 15 menit, status order bisa dipantau di
              halaman Riwayat dan CS siap bantu via WhatsApp.
            </p>
            <p>
              GASTROS menghitung harga {game.currency} kompetitif tiap hari &mdash; sering cek halaman ini atau pantau
              kupon promo di halaman checkout biar gak kelewat potongan harganya.
            </p>
          </div>
        </div>

        {/* Payment/assurance panel */}
        <div className="border border-border bg-card p-5 md:p-8 flex flex-col gap-3 md:gap-4">
          <span className="font-mono text-[10px] md:text-[11px] text-accent tracking-[0.25em] uppercase">
            [Jaminan]
          </span>
          {[
            { k: "PUBLISHER", v: game.publisher },
            { k: "KATEGORI", v: game.category },
            { k: "ITEM", v: game.currency },
            { k: "PROSES", v: "< 3 MENIT" },
            { k: "GARANSI", v: "DANA KEMBALI 100%" },
          ].map((row) => (
            <div key={row.k} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0 font-mono text-[10px] md:text-xs tracking-[0.1em] uppercase">
              <span className="text-foreground/40">{row.k}</span>
              <span className="text-foreground">{row.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Internal links: game terkait */}
      <div className="mt-4 md:mt-8">
        <span className="font-mono text-[10px] md:text-[11px] text-accent tracking-[0.25em] uppercase block mb-2 md:mb-3">
          [Top Up Juga] &mdash; Game Lainnya
        </span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {related.map((r) => (
            <Link
              key={r.slug}
              href={`/top-up/${r.slug}`}
              className="group border border-border bg-card p-3 md:p-4 hover:border-accent transition-colors"
            >
              <div className="flex items-center gap-2 md:gap-2.5">
                <div
                  className="w-8 h-8 md:w-9 md:h-9 shrink-0 flex items-center justify-center font-sans text-[10px] md:text-xs text-background"
                  style={{ backgroundColor: `hsl(${r.hue})` }}
                >
                  {r.glyph}
                </div>
                <div className="min-w-0">
                  <span className="block font-mono text-[10px] md:text-xs text-foreground group-hover:text-accent transition-colors uppercase truncate">
                    {r.short}
                  </span>
                  <span className="block font-mono text-[9px] md:text-[10px] text-foreground/40 truncate">
                    Mulai {formatIDR(Math.min(...r.denominations.map((d) => d.price)))}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
