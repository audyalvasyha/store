"use client"

import { Suspense, useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import {
  filterGames,
  formatIDR,
  formatPriceShort,
  type CatalogGame,
} from "@/lib/catalog"
import { GameArtwork } from "@/components/game-artwork"
import { GAMES_SEARCH_EVENT, GamesSearchInput } from "@/components/games-search-input"
import { RatingBadge } from "@/components/rating-badge"
import { EventCarousel } from "@/components/event-carousel"
import type { EventSlide } from "@/lib/event-carousel"

// Landing cuma render MAX_ROWS baris awal — sisanya via /games biar web ga berat.
const MAX_ROWS = 12

export function GameGrid({
  games,
  sold,
  ratings,
  slides = [],
}: {
  games: CatalogGame[]
  /** Map slug -> total item terjual bulan ini (dari Mongo). Kosong = sembunyikan badge. */
  sold?: Record<string, number>
  /** Map slug -> rating rata-rata + jumlah ulasan asli. */
  ratings?: Record<string, { average: number; count: number }>
  /** Slide carousel event dari admin; kosong = panel "Gas." bawaan. */
  slides?: EventSlide[]
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [query, setQuery] = useState("")

  // Search homepage difilter di browser. URL ?q= tetap disinkronkan untuk
  // refresh/share, tapi halaman nggak perlu request server per ketikan.
  const filteredGames = useMemo(() => filterGames(games, query), [games, query])
  const catalogHref = query.trim()
    ? `/games?q=${encodeURIComponent(query.trim())}`
    : "/games"

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { threshold: 0.1 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const syncFromUrl = () => {
      setQuery(new URLSearchParams(window.location.search).get("q") ?? "")
    }
    syncFromUrl()

    const onSearch = (event: Event) => {
      setQuery((event as CustomEvent<string>).detail ?? "")
    }
    window.addEventListener("popstate", syncFromUrl)
    window.addEventListener(GAMES_SEARCH_EVENT, onSearch)
    return () => {
      window.removeEventListener("popstate", syncFromUrl)
      window.removeEventListener(GAMES_SEARCH_EVENT, onSearch)
    }
  }, [])

  const totalItems = filteredGames.reduce((sum, g) => sum + g.denominationCount, 0)

  return (
    <section
      id="games"
      ref={sectionRef}
      className="relative py-5 md:py-20 overflow-hidden"
    >
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
        {/* Search bar — filter katalog langsung di browser */}
        <div className="flex items-center justify-between gap-4 mb-2 md:mb-6">
          <div className="w-full sm:max-w-md md:max-w-xl">
            <Suspense fallback={null}>
              <GamesSearchInput />
            </Suspense>
          </div>
          <Link
            href={catalogHref}
            className="hidden sm:inline-flex items-center gap-2 font-mono text-[10px] md:text-[11px] text-foreground/50 hover:text-accent transition-colors tracking-[0.2em] uppercase shrink-0"
          >
            Semua Game
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </Link>
        </div>

        {/* Header */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-0 mb-3 md:mb-8">
          {/* Left: Title + description */}
          <div className="flex flex-col justify-between">
            <div>
              <span
                className={`font-mono text-[10px] md:text-[11px] text-accent tracking-[0.2em] md:tracking-[0.3em] uppercase block mb-1 md:mb-3 ${visible ? "anim-cut-in" : "opacity-0"}`}
                style={{ animationDelay: "0.1s" }}
              >
                [Games]
              </span>
              <h2 className="font-sans tracking-tighter text-foreground leading-none uppercase overflow-hidden">
                <span className={`block text-[13vw] sm:text-[10vw] md:text-8xl lg:text-9xl whitespace-nowrap ${visible ? "anim-shutter-up" : "opacity-0"}`} style={{ animationDelay: "0.2s" }}>
                  Pilih Game<span className="text-accent">.</span>
                </span>
              </h2>
            </div>

            <div className={`mt-2 lg:mt-0 lg:pb-2 ${visible ? "anim-cut-in" : "opacity-0"}`} style={{ animationDelay: "0.6s" }}>
              <p className="font-mono text-[10px] md:text-xs text-foreground/50 max-w-[260px] md:max-w-xs leading-relaxed mb-2 md:mb-5">
                Klik game-nya, isi ID akun, pilih nominal. Diamond &amp; currency masuk akun lo lewat jalur resmi publisher.
              </p>
              <div className="flex items-center gap-3 md:gap-6">
                {[
                  { v: String(filteredGames.length).padStart(2, "0"), l: "Games" },
                  { v: String(totalItems), l: "Item Top Up" },
                  { v: "24/7", l: "Layanan" },
                ].map((s) => (
                  <div key={s.l} className="flex items-baseline gap-1">
                    <span className="font-sans text-base md:text-2xl text-accent leading-none">{s.v}</span>
                    <span className="font-mono text-[9px] md:text-[10px] text-foreground/35 tracking-[0.1em] uppercase">{s.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Carousel info event (gambar & teks dari /admin) */}
          <div className={`relative lg:pl-8 ${visible ? "anim-wipe-right" : "opacity-0"}`} style={{ animationDelay: "0.4s" }}>
            <EventCarousel slides={slides} />
            <div className={`h-[2px] bg-accent mt-1 md:mt-2 ${visible ? "line-expand" : "w-0"}`} style={{ animationDelay: "0.8s" }} />
          </div>
        </div>

        {/* Game rows — dibatasi MAX_ROWS biar DOM & animasi enteng */}
        <div className="border-t border-border">
          {filteredGames.slice(0, MAX_ROWS).map((game, idx) => (
            <Link
              key={game.slug}
              href={`/top-up/${game.slug}`}
              className={`block border-b border-border group relative ${visible ? "anim-counter-pop" : "opacity-0"}`}
              style={{ animationDelay: `${Math.min(0.7 + idx * 0.08, 1.8)}s` }}
              onMouseEnter={() => setHoveredId(game.slug)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-accent transition-transform duration-300 origin-top ${hoveredId === game.slug ? "scale-y-100" : "scale-y-0"}`} />

              <div className="flex items-center justify-between gap-3 md:gap-5 py-3 md:py-6 pl-0 md:pl-4">

                {/* Thumbnail artwork (optimizer Next -> kecil & cepat) */}
                <div className={`relative overflow-hidden shrink-0 mr-3 md:mr-4 w-10 aspect-[3/4] md:w-16 transition-opacity duration-300 ${hoveredId === game.slug ? "opacity-100" : "opacity-75"}`}>
                  <GameArtwork
                    game={game}
                    sizes="64px"
                    className={`object-cover transition-transform duration-300 ${hoveredId === game.slug ? "scale-105" : ""}`}
                    fallbackClassName={`transition-transform duration-300 ${hoveredId === game.slug ? "scale-105" : ""}`}
                    initialsClassName="text-[11px] md:text-lg"
                  />
                  <div className="absolute inset-0 border border-border/60" />
                </div>

                {/* Left: ID + Title — judul selalu 1 baris, nggak pernah nabrak kolom meta */}
                <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                  <span className="font-mono text-[10px] md:text-xs text-foreground/30 tabular-nums shrink-0">{String(idx + 1).padStart(2, "0")}</span>
                  <div className="min-w-0">
                    <h3 className={`font-sans text-xl md:text-6xl lg:text-7xl tracking-tighter leading-none uppercase transition-colors duration-300 truncate ${hoveredId === game.slug ? "text-accent" : "text-foreground"}`}>
                      {game.short}
                    </h3>
                    <span className="font-mono text-[9px] md:text-[11px] text-foreground/50 tracking-[0.08em] md:tracking-[0.2em] uppercase block truncate">
                      {game.name} &mdash; {game.publisher}
                    </span>
                  </div>
                </div>

                {/* Description - desktop only, lebar tetap biar jarak antar-baris konsisten */}
                <p className={`font-mono text-xs w-48 lg:w-64 shrink-0 leading-relaxed text-foreground/60 transition-all duration-300 hidden lg:block ${hoveredId === game.slug ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"}`}>
                  {game.denominationCount} nominal {game.currency.toLowerCase()} siap kirim. Proses otomatis, jalur resmi.
                </p>

                {/* Meta */}
                <div className="flex items-center gap-2 md:gap-6 shrink-0">
                  <RatingBadge rating={ratings?.[game.slug]} className="hidden sm:inline-flex" />
                  {/* Social proof: jumlah terjual bulan ini (badge hanya kalau ada data) */}
                  {typeof sold?.[game.slug] === "number" && sold[game.slug]! > 0 && (
                    <span className="hidden md:inline-flex items-center gap-1.5 border border-accent/40 bg-accent/10 px-2 py-1 font-mono text-[9px] md:text-[10px] text-accent tracking-[0.1em] uppercase tabular-nums">
                      <span className="w-1 h-1 bg-accent rounded-full animate-pulse" />
                      {sold[game.slug]!} terjual
                    </span>
                  )}
                  <div className="hidden sm:block min-w-0 max-w-[92px] md:max-w-[120px]">
                    <span className="font-mono text-[9px] md:text-[11px] text-foreground/35 block tracking-[0.08em] md:tracking-[0.2em] uppercase mb-0.5">Kategori</span>
                    <span className="font-mono text-[10px] md:text-xs text-foreground/75 truncate block">{game.category.toUpperCase()}</span>
                  </div>
                  <div className="w-[1px] h-4 md:h-8 bg-border hidden sm:block" />
                  <div className="text-right">
                    <span className="font-mono text-[9px] md:text-[11px] text-foreground/35 block tracking-[0.08em] md:tracking-[0.2em] uppercase mb-0.5">Mulai dari</span>
                    <span className={`font-mono text-[10px] md:text-xs ${hoveredId === game.slug ? "text-accent" : "text-foreground/75"}`}>
                      {formatIDR(game.lowestPrice)} <span className="text-foreground/35">({formatPriceShort(game.lowestPrice)})</span>
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {filteredGames.length === 0 && (
            <div className="border-b border-border py-8 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/45">
                Ga ada game yang cocok. Coba kata kunci lain.
              </p>
            </div>
          )}

          {/* Lihat semua — sisanya di halaman /games */}
          {filteredGames.length > MAX_ROWS && (
            <Link
              href={catalogHref}
              className="flex items-center justify-between border-b border-border py-4 md:py-6 pl-0 md:pl-4 group"
            >
              <span className="font-sans text-lg md:text-4xl tracking-tighter text-foreground/60 group-hover:text-accent transition-colors uppercase leading-none">
                Lihat semua game
              </span>
              <span className="font-mono text-[10px] md:text-xs text-foreground/40 group-hover:text-accent transition-colors tracking-[0.15em] uppercase flex items-center gap-2 md:gap-4">
                {filteredGames.length - MAX_ROWS} game lagi
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none" className="text-accent" aria-hidden="true">
                  <path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </span>
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
