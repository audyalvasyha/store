"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { GAMES, formatIDR, formatPriceShort, type GameItem } from "@/lib/catalog";

function StockIndicator({ index }: { index: number }) {
  const isHot = index < 2;
  return (
    <span
      className={`font-mono text-[8px] md:text-[10px] tracking-[0.1em] md:tracking-[0.15em] ${isHot ? "text-accent" : index < 4 ? "text-accent/70" : "text-foreground/40"}`}
    >
      {isHot ? "BEST SELLER" : index < 4 ? "AVAILABLE" : "READY"}
    </span>
  );
}

export function PriceList() {
  const [activeSlug, setActiveSlug] = useState<string>(GAMES[0].slug);
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 },
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const activeGame: GameItem = GAMES.find((g) => g.slug === activeSlug) ?? GAMES[0];
  const denoms = activeGame.denominations;

  return (
    <section
      ref={sectionRef}
      id="harga"
      className="relative px-4 md:px-8 lg:px-12 py-5 md:py-20 bg-card overflow-hidden"
    >
      <div
        className="absolute top-6 md:top-8 right-2 md:right-12 font-sans text-[25vw] md:text-[18vw] leading-none text-foreground/[0.02] tracking-tighter select-none pointer-events-none"
        aria-hidden="true"
      >
        {String(denoms.length).padStart(2, "0")}
      </div>

      <div className="max-w-[1400px] mx-auto relative">
        <div
          className={`mb-3 md:mb-8 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 md:gap-4">
            <div>
              <span className="font-mono text-[8px] md:text-[10px] text-accent tracking-[0.2em] md:tracking-[0.3em] uppercase block mb-1 md:mb-2">
                [Harga]
              </span>
              <h2 className="font-sans text-[11vw] sm:text-5xl md:text-7xl lg:text-8xl tracking-tighter text-foreground leading-none uppercase whitespace-nowrap">
                Price List<span className="text-accent">.</span>
              </h2>
            </div>
            <div className="flex flex-col items-start md:items-end gap-1 md:gap-2">
              <p className="font-mono text-[9px] md:text-xs text-foreground/50 max-w-xs leading-relaxed text-left md:text-right">
                Harga final, tanpa biaya tersembunyi. Semua item dikirim lewat jalur resmi publisher.
              </p>
              <div className="flex items-center gap-2 md:gap-4">
                <div className="flex items-center gap-1 md:gap-2">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-accent" />
                  <span className="font-mono text-[7px] md:text-[10px] text-foreground/60 tracking-[0.1em]">
                    {denoms.length} NOMINAL
                  </span>
                </div>
                <div className="w-[1px] h-2 md:h-3 bg-foreground/15" />
                <div className="flex items-center gap-1 md:gap-2">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-foreground/30" />
                  <span className="font-mono text-[7px] md:text-[10px] text-foreground/60 tracking-[0.1em]">
                    {activeGame.currency.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`h-[1px] bg-foreground/10 transition-all duration-1000 origin-left ${visible ? "scale-x-100" : "scale-x-0"}`}
        />

        <div
          className={`transition-all duration-700 delay-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <div className="flex border-b border-border overflow-x-auto">
            {GAMES.map((game) => (
              <button
                key={game.slug}
                onClick={() => setActiveSlug(game.slug)}
                className={`flex-none md:flex-1 py-2 md:py-4 px-3 md:px-0 font-mono text-[8px] md:text-xs tracking-[0.08em] md:tracking-[0.2em] text-center transition-all relative min-h-[40px] ${
                  activeSlug === game.slug
                    ? "text-accent"
                    : "text-foreground/30 hover:text-foreground/70 active:text-foreground"
                }`}
              >
                {game.short}
                {activeSlug === game.slug && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="border-b border-border">
          {denoms.map((denom, i) => (
            <Link
              key={`${activeSlug}-${denom.id}`}
              href={`/top-up/${activeSlug}`}
              className={`flex items-center justify-between py-2.5 md:py-5 border-t border-foreground/5 group hover:bg-foreground/[0.02] transition-all px-0 md:px-4 ${
                visible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-3"
              }`}
              style={{
                transitionDuration: "500ms",
                transitionDelay: visible ? `${300 + i * 80}ms` : "0ms",
              }}
            >
              <div className="flex items-center gap-2 md:gap-8 min-w-0">
                <span className="font-mono text-[9px] md:text-base text-foreground/50 w-8 md:w-16 tabular-nums shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex items-center gap-1 md:gap-3">
                  <span
                    className={`w-0.5 md:w-1 h-4 md:h-8 transition-colors ${i < 2 ? "bg-accent/50" : "bg-foreground/15"} group-hover:bg-accent`}
                  />
                  <span className="font-sans text-base sm:text-lg md:text-3xl lg:text-4xl text-foreground tracking-tighter uppercase group-hover:text-accent transition-colors truncate">
                    {denom.label}
                  </span>
                  {denom.detail && (
                    <span className="font-mono text-[7px] md:text-[9px] text-foreground/30 tracking-[0.1em] hidden md:inline uppercase">
                      // {denom.detail}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-8 shrink-0">
                <span className="font-mono text-[7px] md:text-[9px] text-foreground/30 tracking-[0.1em] hidden md:block uppercase">
                  {activeGame.short} / INSTANT
                </span>
                <StockIndicator index={i} />
                <span className="font-sans text-base md:text-2xl text-foreground group-hover:text-accent transition-colors tabular-nums whitespace-nowrap">
                  {formatIDR(denom.price)}
                  <span className="font-mono text-[7px] md:text-[10px] text-foreground/35 ml-1 md:ml-2">({formatPriceShort(denom.price)})</span>
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div
          className={`flex items-center justify-between pt-1.5 md:pt-4 transition-all duration-700 ${visible ? "opacity-100 delay-700" : "opacity-0"}`}
        >
          <span className="font-mono text-[6px] md:text-[10px] text-foreground/25 tracking-[0.08em] md:tracking-[0.2em] uppercase">
            HARGA FINAL // TANPA BIAYA TERSEMBUNYI
          </span>
          <span className="font-mono text-[6px] md:text-[10px] text-foreground/25 tracking-[0.08em] md:tracking-[0.2em] uppercase hidden md:block">
            STOK &amp; HARGA UPDATE 24/7
          </span>
        </div>
      </div>
    </section>
  );
}
