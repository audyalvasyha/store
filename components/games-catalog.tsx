"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { GAMES, lowestPrice, formatIDR, type GameItem } from "@/lib/catalog"

/**
 * Halaman katalog lengkap: SEMUA game beserta artwork-nya.
 * Sumber data dikirim server (katalog dinamis dari admin/DB),
 * fallback statis GAMES dari lib/catalog.
 * Tampil bertahap — awal BATCH awal, sisanya lewat tombol "Lihat Lainnya".
 */
const BATCH = 16

export function GamesCatalog({ games = GAMES }: { games?: GameItem[] }) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [showCount, setShowCount] = useState(BATCH)

  const shownGames = games.slice(0, showCount)
  const remaining = games.length - shownGames.length

  function loadMore() {
    setShowCount((c) => Math.min(c + BATCH, games.length))
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.05 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  const totalItems = games.reduce((sum, g) => sum + g.denominations.length, 0)

  return (
    <section ref={sectionRef} className="relative px-4 md:px-8 lg:px-12 py-6 md:py-14 overflow-hidden">
      {/* Header */}
      <div className="max-w-[1400px] mx-auto mb-4 md:mb-10">
        <span
          className={`font-mono text-[10px] md:text-[11px] text-accent tracking-[0.2em] md:tracking-[0.3em] uppercase block mb-1 md:mb-3 ${visible ? "anim-cut-in" : "opacity-0"}`}
        >
          [Katalog] {String(games.length).padStart(3, "0")} Games // {totalItems} Item Top Up
        </span>
        <h1 className="font-sans tracking-tighter text-foreground leading-none uppercase overflow-hidden">
          <span className={`block text-[13vw] sm:text-[9vw] md:text-8xl lg:text-9xl whitespace-nowrap ${visible ? "anim-shutter-up" : "opacity-0"}`}>
            Semua Game<span className="text-accent">.</span>
          </span>
        </h1>
        <p
          className={`font-mono text-[10px] md:text-xs text-foreground/50 max-w-md leading-relaxed mt-2 md:mt-4 ${visible ? "anim-cut-in" : "opacity-0"}`}
          style={{ animationDelay: "0.4s" }}
        >
          Pilih game di bawah, isi ID akun, pilih nominal &mdash; diamond &amp; currency masuk akun lo lewat jalur resmi publisher.
        </p>
      </div>

      {/* Grid game cards */}
      <div className="max-w-[1400px] mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 md:gap-3">
        {shownGames.map((game, i) => (
          <div
            key={game.slug}
            className={visible ? "anim-counter-pop" : "opacity-0"}
            style={{ animationDelay: `${i < BATCH ? 0.3 + i * 0.08 : 0.05}s` }}
          >
            <GameCard game={game} />
          </div>
        ))}
      </div>

      {/* Empty state: hasil cari ga ketemu */}
      {games.length === 0 && (
        <div className="max-w-[1400px] mx-auto border border-border bg-card p-6 md:p-10 text-center">
          <p className="font-sans text-xl md:text-3xl text-foreground uppercase tracking-tight">
            Ga ada game yang cocok<span className="text-accent">.</span>
          </p>
          <p className="font-mono text-[10px] md:text-xs text-foreground/50 leading-relaxed mt-2">
            Coba kata kunci lain — misal &ldquo;diamond&rdquo;, &ldquo;valorant&rdquo;, atau nama publishernya.
          </p>
        </div>
      )}

      {/* Tombol lihat lainnya — sisanya jangan dilempar langsung */}
      {remaining > 0 && visible && (
        <div className="max-w-[1400px] mx-auto mt-6 md:mt-10 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={loadMore}
            className="group relative inline-flex items-center justify-center gap-3 bg-accent text-accent-foreground font-mono text-[10px] md:text-xs tracking-[0.2em] md:tracking-[0.25em] uppercase px-6 md:px-10 py-3.5 md:py-4 min-h-[48px] hover-glitch hover:scale-[1.02] transition-transform cursor-pointer"
          >
            <span className="relative z-10">
              Lihat Lainnya{remaining > BATCH ? ` (+${BATCH})` : ` (${remaining})`}
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="relative z-10 group-hover:translate-y-0.5 transition-transform" aria-hidden="true">
              <path d="M6 1v10M1 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <span className="font-mono text-[9px] md:text-[10px] text-foreground/40 tracking-[0.15em] uppercase">
            {shownGames.length} / {games.length} game ditampilin
          </span>
        </div>
      )}

      {/* Info strip bawah */}
      <div className="max-w-[1400px] mx-auto mt-6 md:mt-12 border-y border-border py-2 md:py-3 flex items-center justify-between gap-4 flex-wrap">
        <span className="font-mono text-[9px] md:text-[10px] text-foreground/40 tracking-[0.15em] uppercase">
          Harga berubah sesuai nominal &amp; provider &mdash; tampil di halaman top up
        </span>
        <span className="font-mono text-[9px] md:text-[10px] text-accent tracking-[0.15em] uppercase flex items-center gap-2">
          <span className="w-2 h-2 bg-accent inline-block" />
          Update live dari katalog admin
        </span>
      </div>
    </section>
  )
}

function GameCard({ game }: { game: GameItem }) {
  return (
    <Link href={`/top-up/${game.slug}`} className="relative group block">
      {/* Artwork: gambar asli (Gamestone/admin), fallback gradient pakai hue game */}
      <div className="relative overflow-hidden aspect-[3/4]">
        {game.image ? (
          <Image
            src={game.image}
            alt={game.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
          />
        ) : (
          <div
            className="absolute inset-0 transition-transform duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
            style={{
              background: `radial-gradient(ellipse at 30% 25%, hsl(${game.hue} / 0.55), transparent 60%), radial-gradient(ellipse at 75% 85%, hsl(${game.hue} / 0.35), transparent 55%), linear-gradient(180deg, hsl(0 0% 8%), hsl(0 0% 4%))`,
            }}
          />
        )}

        {/* Overlay & aksen hover (tema brutalist) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
        <div className="absolute bottom-0 left-0 w-full h-[3px] bg-accent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] origin-left" />
        <div className="absolute top-0 left-0 w-4 h-4 md:w-6 md:h-6 border-t-2 border-l-2 border-accent/0 group-hover:border-accent transition-colors duration-300" />
        <div className="absolute bottom-0 right-0 w-4 h-4 md:w-6 md:h-6 border-b-2 border-r-2 border-accent/0 group-hover:border-accent transition-colors duration-300" />

        {/* Badge kategori + jumlah nominal */}
        <span className="absolute top-2 md:top-3 left-2 md:left-3 bg-background/85 px-1.5 py-0.5 font-mono text-[8px] md:text-[9px] text-foreground/70 tracking-[0.15em] uppercase">
          {game.category}
        </span>
        <span className="absolute top-2 md:top-3 right-2 md:right-3 font-mono text-[8px] md:text-[9px] text-foreground/60 tracking-[0.1em] uppercase">
          {String(game.denominations.length).padStart(2, "0")} ITEM
        </span>

        {/* Nama panjang di dalam kartu (desktop) */}
        <span className="hidden md:block absolute bottom-2 left-3 right-3 font-mono text-[9px] text-foreground/60 tracking-[0.15em] uppercase truncate">
          {game.publisher}
        </span>
      </div>

      {/* Label bawah kartu */}
      <div className="mt-1.5 md:mt-2.5 flex items-center justify-between px-0.5">
        <span className="font-sans text-lg md:text-2xl text-foreground/90 font-bold tracking-tight uppercase truncate">
          {game.short}
        </span>
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          <span className="font-mono text-[9px] md:text-[10px] text-muted-foreground">
            {formatIDR(lowestPrice(game))}
          </span>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-accent" aria-hidden="true">
            <path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      </div>
    </Link>
  )
}
