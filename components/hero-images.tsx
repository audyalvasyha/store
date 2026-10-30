"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { GAMES, lowestPrice, formatIDR, formatPriceShort } from "@/lib/catalog"

export function FeaturedGames() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  const games = GAMES.filter((g) => g.featured)

  return (
    <section
      ref={sectionRef}
      className="relative bg-background overflow-hidden"
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 h-[2px] bg-accent transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ width: isVisible ? "100%" : "0%" }}
      />

      {/* Section label */}
      <div className="px-4 md:px-8 lg:px-12 pt-6 md:pt-16 pb-3 md:pb-8 max-w-[1400px] mx-auto w-full">
        <div
          className="flex items-center justify-between transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateX(0)" : "translateX(-30px)",
          }}
        >
          <div className="flex items-center gap-2 md:gap-4">
            <div className="w-5 md:w-8 h-[2px] bg-accent" />
            <span className="font-mono text-[8px] md:text-[10px] text-accent tracking-[0.2em] md:tracking-[0.4em] uppercase">
              Paling Sering Di-Top Up
            </span>
          </div>
          <span className="font-mono text-[7px] md:text-[10px] text-muted-foreground tracking-[0.15em] hidden md:block">
            {String(games.length).padStart(3, "0")} TILES
          </span>
        </div>
      </div>

      {/* Game Tile Grid */}
      <div className="px-4 md:px-8 lg:px-12 pb-6 md:pb-20 max-w-[1400px] mx-auto w-full">
        {/* Desktop: 4-column staggered */}
        <div className="hidden md:grid grid-cols-4 gap-3">
          {games.map((game, i) => {
            const offsets = [0, 48, 16, 64]
            return (
              <Link
                key={game.slug}
                href={`/top-up/${game.slug}`}
                className="relative group"
                style={{ marginTop: `${offsets[i]}px` }}
              >
                <div
                  className="transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible
                      ? "translateY(0) skewY(0deg)"
                      : "translateY(60px) skewY(2deg)",
                    transitionDelay: `${i * 150}ms`,
                  }}
                >
                  <div className={`relative overflow-hidden ${i % 2 === 0 ? "aspect-[3/4]" : "aspect-[4/5]"}`}>
                    {/* Synthetic game tile art */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `radial-gradient(ellipse at 30% 25%, hsl(${game.hue} / 0.55), transparent 60%), radial-gradient(ellipse at 75% 85%, hsl(${game.hue} / 0.35), transparent 55%), linear-gradient(180deg, hsl(0 0% 8%), hsl(0 0% 4%))`,
                      }}
                    />
                    <div
                      className="absolute inset-0 opacity-[0.15]"
                      aria-hidden="true"
                      style={{
                        backgroundImage:
                          "linear-gradient(hsl(0 0% 95% / 1) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 95% / 1) 1px, transparent 1px)",
                        backgroundSize: "28px 28px",
                      }}
                    />
                    <div
                      className="absolute inset-0 bg-background/25 group-hover:bg-background/0 transition-colors duration-500"
                    />
                    {/* Glyph */}
                    <span
                      className="absolute inset-0 flex items-center justify-center font-sans text-[6rem] lg:text-[7rem] text-foreground/80 group-hover:text-foreground transition-colors duration-300 tracking-tighter group-hover:scale-110 transition-transform duration-700"
                    >
                      {game.glyph}
                    </span>
                    <div className="absolute bottom-0 left-0 w-full h-[3px] bg-accent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] origin-left" />
                    <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-accent/0 group-hover:border-accent transition-colors duration-300" />
                    <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-accent/0 group-hover:border-accent transition-colors duration-300" />
                    <span className="absolute top-3 right-3 font-mono text-[10px] text-foreground/40 group-hover:text-accent transition-colors duration-300 tracking-widest">
                      0{i + 1}
                    </span>
                    <span className="absolute bottom-3 left-3 font-mono text-[8px] text-foreground/60 tracking-[0.15em] uppercase">
                      from {formatPriceShort(lowestPrice(game))}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-sans text-2xl lg:text-3xl text-foreground/70 group-hover:text-foreground transition-colors duration-300 tracking-tight uppercase">
                      {game.short}
                    </span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-4 h-[1px] bg-accent" />
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-accent" aria-hidden="true">
                        <path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </div>
                  </div>
                  <span className="font-mono text-[8px] md:text-[9px] text-muted-foreground block tracking-[0.1em] uppercase mt-1">
                    mulai {formatIDR(lowestPrice(game))}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Mobile: 2-column tight, equal height, no stagger offset */}
        <div className="grid grid-cols-2 gap-1.5 md:hidden">
          {games.map((game, i) => (
            <Link
              key={game.slug}
              href={`/top-up/${game.slug}`}
              className="relative"
            >
              <div
                className="transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? "translateY(0)" : "translateY(30px)",
                  transitionDelay: `${i * 80}ms`,
                }}
              >
                <div className="relative overflow-hidden aspect-[3/4]">
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `radial-gradient(ellipse at 30% 25%, hsl(${game.hue} / 0.55), transparent 60%), radial-gradient(ellipse at 75% 85%, hsl(${game.hue} / 0.35), transparent 55%), linear-gradient(180deg, hsl(0 0% 8%), hsl(0 0% 4%))`,
                    }}
                  />
                  <div className="absolute inset-0 bg-background/15" />
                  <span className="absolute inset-0 flex items-center justify-center font-sans text-6xl text-foreground/80 tracking-tighter">
                    {game.glyph}
                  </span>
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-accent" />
                  <span className="absolute top-1.5 right-1.5 font-mono text-[7px] text-foreground/40 tracking-widest">
                    0{i + 1}
                  </span>
                  <span className="absolute bottom-2 left-2 font-mono text-[7px] text-foreground/60 tracking-[0.15em] uppercase">
                    mulai {formatPriceShort(lowestPrice(game))}
                  </span>
                </div>
                <span className="mt-1.5 block font-sans text-sm text-foreground/70 tracking-tight uppercase">
                  {game.short}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom divider */}
      <div className="h-[1px] bg-border" />
    </section>
  )
}
