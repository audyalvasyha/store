import Link from "next/link"
import { formatIDR, PAYMENT_METHODS } from "@/lib/catalog"
import type { GameItem } from "@/lib/catalog"
import { GameArtwork } from "@/components/game-artwork"
import type { TopUpJugaConfig } from "@/lib/content"

/** Maks tile per blok — admin bisa isi lebih, tapi dibatasi biar gak mbuhor. */
const MAX_TILES = 8 as const

/**
 * Blok konten + internal link di bawah form top up.
 *
 * Kenapa ada: halaman top up sebelumnya tipis (header + form aja) — buat
 * Google itu thin content. Blok ini nambahin copy deskriptif per-game kayak
 * harga rendahnya, publisher, metode bayar, plus link internal ke game
 * lain biar crawl equity ngalir antar halaman top up.
 */
export function GameInfoBlock({
  game,
  allGames,
  topUpJuga,
}: {
  game: GameItem
  allGames: GameItem[]
  topUpJuga: TopUpJugaConfig | null
}) {
  const prices = game.denominations.map((d) => d.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const payLine = [
    ...PAYMENT_METHODS.map((p) => (typeof p === "string" ? p : p.label)),
    "QRIS",
  ]
    .filter((p, i, arr) => arr.indexOf(p) === i)
    .slice(0, 6)
    .join(", ")

  // Related: prioritaskan game se-kategori, sisanya game featured. Max 4.
  // Related: config admin menang (per-game override, lalu urutan global).
  // Tanpa config, jatuh ke urutan otomatis: game se-kategori, lalu featured.
  const bySlug = new Map(allGames.map((g) => [g.slug, g] as const))
  const configSlugs = topUpJuga?.perGame?.[game.slug] ?? topUpJuga?.global ?? null
  const related: GameItem[] =
    configSlugs && configSlugs.length > 0
      ? configSlugs
          .map((slug) => bySlug.get(slug))
          .filter((g): g is GameItem => Boolean(g) && g!.slug !== game.slug)
      : [
          ...allGames.filter((g) => g.slug !== game.slug && g.category === game.category),
          ...allGames.filter((g) => g.slug !== game.slug && g.featured && g.category !== game.category),
        ]

  const shown = related.slice(0, MAX_TILES)

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

      {/* Internal links: game terkait — rasio tile sama dengan "Paling Sering
          Di-Top Up" (aspect 3/4 + artwork asli), tapi grid dibatasi lebih
          sempit biar tile-nya sedikit lebih kecil. */}
      <div className="mt-4 md:mt-8">
        <span className="font-mono text-[10px] md:text-[11px] text-accent tracking-[0.25em] uppercase block mb-2 md:mb-3">
          [Top Up Juga] &mdash; Game Lainnya
        </span>
        <div className="md:max-w-[1000px] grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {shown.map((r) => (
            <Link
              key={r.slug}
              href={`/top-up/${r.slug}`}
              className="group relative"
            >
              <div className="relative overflow-hidden border border-border group-hover:border-accent transition-colors aspect-[3/4]">
                <GameArtwork
                  game={r}
                  sizes="50vw, 220px"
                  className="object-cover"
                  initialsClassName="text-2xl"
                />
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-accent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-accent/0 group-hover:border-accent transition-colors duration-300" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-accent/0 group-hover:border-accent transition-colors duration-300" />
              </div>
              <div className="pt-2">
                <span className="block font-sans text-base md:text-lg text-foreground/90 font-bold tracking-tight group-hover:text-accent transition-colors uppercase truncate">
                  {r.short}
                </span>
                <span className="block font-mono text-[9px] md:text-[10px] text-foreground/40 tracking-[0.1em] uppercase">
                  Mulai {formatIDR(Math.min(...r.denominations.map((d) => d.price)))}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
