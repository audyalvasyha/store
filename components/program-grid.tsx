"use client"

import { Suspense, useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { GAMES, lowestPrice, formatIDR, formatPriceShort, type GameItem } from "@/lib/catalog"
import { GamesSearchInput } from "@/components/games-search-input"

// Landing cuma render MAX_ROWS baris awal — sisanya via /games biar web ga berat.
const MAX_ROWS = 12

export function GameGrid({ games = GAMES }: { games?: GameItem[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

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

  const totalItems = games.reduce((sum, g) => sum + g.denominations.length, 0)

  return (
    <section
      id="games"
      ref={sectionRef}
      className="relative px-4 md:px-8 lg:px-12 py-5 md:py-20 overflow-hidden"
    >
      <div className="max-w-[1400px] mx-auto">
        {/* Search bar — filter game via ?q= (server-side) */}
        <div className="flex items-center justify-between gap-4 mb-2 md:mb-6">
          <div className="w-full sm:max-w-md md:max-w-xl">
            <Suspense fallback={null}>
              <GamesSearchInput />
            </Suspense>
          </div>
          <Link
            href="/games"
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
                  { v: String(games.length).padStart(2, "0"), l: "Games" },
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

          {/* Right: Info panel (synthetic, no photo) */}
          <div className={`relative lg:pl-8 ${visible ? "anim-wipe-right" : "opacity-0"}`} style={{ animationDelay: "0.4s" }}>
            <div className="relative aspect-[16/9] overflow-hidden">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse at 80% 20%, hsl(258 85% 30% / 0.5), transparent 60%), radial-gradient(ellipse at 20% 90%, hsl(0 100% 30% / 0.4), transparent 55%), linear-gradient(180deg, hsl(0 0% 7%), hsl(0 0% 3%))",
                }}
              />
              <div
                className="absolute inset-0 opacity-[0.12]"
                aria-hidden="true"
                style={{
                  backgroundImage:
                    "linear-gradient(hsl(0 0% 95% / 1) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 95% / 1) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center font-sans text-[18vw] md:text-[8rem] text-foreground/25 tracking-tighter uppercase">
                Gas.
              </span>
              <div className="absolute top-0 left-0 w-3 h-3 md:w-6 md:h-6 border-t-2 border-l-2 border-accent" />
              <div className="absolute bottom-0 right-0 w-3 h-3 md:w-6 md:h-6 border-b-2 border-r-2 border-accent" />
              <div className="absolute bottom-2 left-2 bg-background/90 px-1.5 py-0.5 md:px-2 md:py-1">
                <span className="font-mono text-[9px] md:text-[10px] text-foreground/60 tracking-[0.12em] md:tracking-[0.2em] uppercase">
                  Semua Server Aktif
                </span>
              </div>
            </div>
            <div className={`h-[2px] bg-accent mt-1 md:mt-2 ${visible ? "line-expand" : "w-0"}`} style={{ animationDelay: "0.8s" }} />
          </div>
        </div>

        {/* Game rows — dibatasi MAX_ROWS biar DOM & animasi enteng */}
        <div className="border-t border-border">
          {games.slice(0, MAX_ROWS).map((game, idx) => (
            <Link
              key={game.slug}
              href={`/top-up/${game.slug}`}
              className={`block border-b border-border group relative ${visible ? "anim-counter-pop" : "opacity-0"}`}
              style={{ animationDelay: `${Math.min(0.7 + idx * 0.08, 1.8)}s` }}
              onMouseEnter={() => setHoveredId(game.slug)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-accent transition-transform duration-300 origin-top ${hoveredId === game.slug ? "scale-y-100" : "scale-y-0"}`} />

              <div className="flex items-center justify-between py-3 md:py-6 pl-0 md:pl-4">
                {/* Thumbnail artwork (optimizer Next -> kecil & cepat) */}
                <div className={`relative overflow-hidden shrink-0 mr-3 md:mr-4 w-10 aspect-[3/4] md:w-16 transition-opacity duration-300 ${hoveredId === game.slug ? "opacity-100" : "opacity-75"}`}>
                  {game.image ? (
                    <Image src={game.image} alt={game.name} fill sizes="64px" className={`object-cover transition-transform duration-300 ${hoveredId === game.slug ? "scale-105" : ""}`} />
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `radial-gradient(ellipse at 30% 25%, hsl(${game.hue} / 0.55), transparent 60%), radial-gradient(ellipse at 75% 85%, hsl(${game.hue} / 0.35), transparent 55%), linear-gradient(180deg, hsl(0 0% 8%), hsl(0 0% 4%))`,
                      }}
                    />
                  )}
                  <div className="absolute inset-0 border border-border/60" />
                </div>

                {/* Left: ID + Title */}
                <div className="flex items-center gap-2 md:gap-4 min-w-0">
                  <span className="font-mono text-[10px] md:text-xs text-foreground/30 tabular-nums">{String(idx + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className={`font-sans text-xl md:text-6xl lg:text-7xl tracking-tighter leading-none uppercase transition-colors duration-300 ${hoveredId === game.slug ? "text-accent" : "text-foreground"}`}>
                      {game.short}
                    </h3>
                    <span className="font-mono text-[9px] md:text-[11px] text-foreground/50 tracking-[0.08em] md:tracking-[0.2em] uppercase block truncate">
                      {game.name} &mdash; {game.publisher}
                    </span>
                  </div>
                </div>

                {/* Description - desktop only */}
                <p className={`font-mono text-xs max-w-xs leading-relaxed text-foreground/60 transition-all duration-300 hidden lg:block ${hoveredId === game.slug ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"}`}>
                  {game.denominations.length} nominal {game.currency.toLowerCase()} siap kirim. Proses otomatis, jalur resmi.
                </p>

                {/* Meta */}
                <div className="flex items-center gap-2 md:gap-6 shrink-0">
                  <div className="hidden sm:block">
                    <span className="font-mono text-[9px] md:text-[11px] text-foreground/35 block tracking-[0.08em] md:tracking-[0.2em] uppercase mb-0.5">Kategori</span>
                    <span className="font-mono text-[10px] md:text-xs text-foreground/75">{game.category.toUpperCase()}</span>
                  </div>
                  <div className="w-[1px] h-4 md:h-8 bg-border hidden sm:block" />
                  <div className="text-right">
                    <span className="font-mono text-[9px] md:text-[11px] text-foreground/35 block tracking-[0.08em] md:tracking-[0.2em] uppercase mb-0.5">Mulai dari</span>
                    <span className={`font-mono text-[10px] md:text-xs ${hoveredId === game.slug ? "text-accent" : "text-foreground/75"}`}>
                      {formatIDR(lowestPrice(game))} <span className="text-foreground/35">({formatPriceShort(lowestPrice(game))})</span>
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {/* Lihat semua — sisanya di halaman /games */}
          {games.length > MAX_ROWS && (
            <Link
              href="/games"
              className="flex items-center justify-between border-b border-border py-4 md:py-6 pl-0 md:pl-4 group"
            >
              <span className="font-sans text-lg md:text-4xl tracking-tighter text-foreground/60 group-hover:text-accent transition-colors uppercase leading-none">
                Lihat semua game
              </span>
              <span className="font-mono text-[10px] md:text-xs text-foreground/40 group-hover:text-accent transition-colors tracking-[0.15em] uppercase flex items-center gap-2 md:gap-4">
                {games.length - MAX_ROWS} game lagi
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
