"use client"

import React from "react"
import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { AuthNav } from "@/components/auth-nav"

function Counter({
  target,
  suffix = "",
  go = false,
}: {
  target: number
  suffix?: string
  go?: boolean
}) {
  const [val, setVal] = useState(0)
  const raf = useRef<number>(0)

  useEffect(() => {
    if (!go) return
    const dur = 900
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setVal(Math.floor(ease * target))
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [go, target])

  return (
    <span>
      {val}
      {suffix}
    </span>
  )
}

function d(ms: number): React.CSSProperties {
  return { animationDelay: `${ms}ms` }
}

/**
 * Sebagian sumber (contoh: egw.news) memblokir URL optimizer /_next/image
 * mereka saat di-hotlink dari domain lain (403). Kalau polanya ketemu,
 * pakai URL asli dari query `url` supaya foto hero tetap tampil.
 */
function resolveHeroImage(raw: string): string {
  try {
    const parsed = new URL(raw)
    if (parsed.pathname === "/_next/image") {
      const original = parsed.searchParams.get("url")
      if (original && /^https:\/\//.test(original)) return original
    }
  } catch {
    // URL relatif / nggak valid — pakai apa adanya.
  }
  return raw
}

const NAV_LINKS: Array<{ item: string; href: string }> = [
  { item: "Games", href: "#games" },
  { item: "Harga", href: "#harga" },
  { item: "Cara Order", href: "#cara" },
  { item: "Artikel", href: "/artikel" },
  { item: "Riwayat", href: "/orders" },
]

export function Hero({ event }: { event?: import("@/lib/content").HeroEvent | null }) {
  const heroImage = event?.imageUrl ? resolveHeroImage(event.imageUrl) : null

  // Render langsung dari server. Sebelumnya seluruh hero ditahan sampai
  // requestAnimationFrame jalan, jadi LCP dan konten utama ikut menunggu JS.
  return (
    <section className="relative h-[100svh] flex flex-col overflow-hidden bg-background select-none">
      {/* ── Background: foto event dari admin, fallback gradient ── */}
      <div className="absolute inset-0 anim-cut-in" style={d(100)} aria-hidden="true">
        {/* Gradient fallback selalu dirender sebagai base layer — supaya kalau
            gambar event gagal dimuat (CDN mati / 404) background TIDAK kosong. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,hsl(258_85%_25%_/_0.35),transparent_55%),radial-gradient(ellipse_at_30%_80%,hsl(0_100%_30%_/_0.3),transparent_55%),linear-gradient(160deg,transparent_45%,hsl(45_90%_50%_/_0.08)_46%,transparent_47%)]" />
        {heroImage && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={heroImage}
            alt=""
            aria-hidden="true"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none"
            }}
          />
        )}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(0 0% 95% / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 95% / 0.5) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at 60% 40%, black 35%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at 60% 40%, black 35%, transparent 75%)",
          }}
        />
        {/* Mobile: scrim pekat di area teks — heading putih & kata merah harus
            tetap kebaca walau foto event dari admin terang. */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-background/45 md:hidden" />
        {/* Desktop: scrim lokal saja — kiri buat heading, bawah buat stats.
            Area kanan-atas dibiarkan terang supaya foto event nggak terlihat
            seperti kotak hitam kosong. */}
        <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-background via-background/60 to-transparent hidden md:block" />
        <div className="absolute inset-y-0 left-0 w-[72%] lg:w-[60%] bg-gradient-to-r from-background/95 via-background/45 to-transparent hidden md:block" />
      </div>

      {/* Event banner chip (dari admin) */}
      {event?.label && (
        <div className="absolute top-14 md:top-20 left-4 md:left-12 z-10 anim-slide-left" style={d(500)}>
          {event.href ? (
            <Link
              href={event.href}
              className="block bg-accent/90 text-accent-foreground px-3 py-1.5 font-mono text-[9px] md:text-[10px] tracking-[0.2em] uppercase hover:bg-foreground hover:text-background transition-colors"
            >
              {event.label}
            </Link>
          ) : (
            <span className="block bg-accent/90 text-accent-foreground px-3 py-1.5 font-mono text-[9px] md:text-[10px] tracking-[0.2em] uppercase">
              {event.label}
            </span>
          )}
          {event.note && (
            <span className="block mt-1 bg-background/80 px-3 py-1 font-mono text-[8px] md:text-[9px] text-foreground/70 tracking-[0.1em] uppercase">
              {event.note}
            </span>
          )}
        </div>
      )}

      {/* Accent shard */}
      <div className="absolute top-[8%] md:top-[15%] left-0 w-[3px] h-[12vh] md:h-[40vh] bg-accent anim-grow-down z-10" style={d(400)} />

      {/* Grid lines desktop */}
      {[14, 28, 42].map((pos, i) => (
        <div
          key={pos}
          className="absolute top-0 h-full w-[1px] bg-foreground/[0.05] anim-grow-down hidden lg:block"
          style={{ left: `${pos}%`, ...d(250 + i * 100) }}
          aria-hidden="true"
        />
      ))}

      {/* ── NAV ── */}
      <nav
        aria-label="Navigasi utama"
        className="relative z-20 flex items-center justify-between px-4 md:px-8 lg:px-12 py-3 md:py-6 bg-gradient-to-b from-background/95 via-background/70 to-transparent anim-cut-in"
        style={d(100)}
      >
        <Link href="/" className="flex items-center gap-2">
          <div className="relative w-7 h-7 md:w-8 md:h-8 flex items-center justify-center anim-snap-in" style={d(150)}>
            <div className="absolute inset-0 bg-accent" />
            <span className="relative font-sans text-sm md:text-lg text-accent-foreground leading-none">G$</span>
          </div>
          <div className="flex flex-col anim-slide-left" style={d(200)}>
            <span className="font-mono text-[10px] md:text-[10px] tracking-[0.25em] md:tracking-[0.4em] text-foreground uppercase leading-none">
              Gastros
            </span>
            <span className="hidden sm:block font-mono text-[10px] md:text-[10px] tracking-[0.15em] text-foreground/60 uppercase">
              Game Top Up Center
            </span>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-10">
          {NAV_LINKS.map((link, i) => (
            <Link
              key={link.item}
              href={link.href}
              className="group relative font-mono text-[11px] tracking-[0.25em] text-foreground/70 hover:text-foreground transition-colors uppercase anim-cut-in"
              style={d(200 + i * 60)}
            >
              {link.item}
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-accent transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <span className="font-mono text-[10px] text-foreground/70 hidden md:block tracking-[0.15em] anim-cut-in" style={d(300)}>
            ONLINE 24/7
          </span>
          <div className="anim-cut-in" style={d(320)}>
            <AuthNav />
          </div>
          <Link
            href="/games"
            className="relative font-mono text-[10px] md:text-[11px] bg-accent text-accent-foreground px-3 md:px-5 py-2 md:py-2.5 tracking-[0.15em] uppercase overflow-hidden group anim-snap-in min-h-[36px] md:min-h-[40px] hidden sm:flex items-center"
            style={d(350)}
          >
            <span className="relative z-10">Top Up Now</span>
            <span className="absolute inset-0 bg-foreground translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]" />
          </Link>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("gastros:open-sidebar"))}
            className="lg:hidden flex flex-col gap-1.5 p-2 min-h-[36px] min-w-[36px] items-center justify-center anim-cut-in"
            style={d(350)}
            aria-label="Buka menu navigasi"
            aria-haspopup="dialog"
          >
            <span className="w-5 h-[1.5px] bg-foreground" />
            <span className="w-5 h-[1.5px] bg-foreground" />
            <span className="w-5 h-[1.5px] bg-foreground" />
          </button>
        </div>
      </nav>

      {/* ── CONTENT ── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center md:justify-end md:pb-8">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 w-full text-center md:text-left">
          {/* Tagline */}
          <div className="flex items-center justify-center md:justify-start gap-2 md:gap-4 mb-2 md:mb-5 anim-wipe-right" style={d(300)}>
            <div className="h-[1.5px] w-5 md:w-16 bg-accent" />
            <span className="font-mono text-[10px] md:text-xs text-accent tracking-[0.15em] md:tracking-[0.4em] uppercase">
              Instant Top Up // Jalur Resmi
            </span>
            <div className="h-[1.5px] w-5 bg-accent md:hidden" />
          </div>

          {/* Headline -- compact leading, tight vertical stack. SATU h1 saja
              (dua-dual-an h1 sekaligus itu anti-pattern buat Google) — sisanya
              <span> eksplisit, plus sr-only keyword "game online murah". */}
          <div className="relative mb-2 md:mb-0">
            <h1>
              {["Top Up", "Gas", "Nonstop."].map((word, i) => (
                <span key={word} className="block overflow-hidden">
                  <span
                    className={`block font-sans leading-[0.85] tracking-[-0.04em] uppercase anim-shutter-up ${
                      word === "Gas" ? "text-accent" : "text-foreground"
                    } text-[15vw] sm:text-[14vw] md:text-[13vw] lg:text-[10vw]`}
                    style={d(400 + i * 120)}
                  >
                    {word}
                  </span>
                </span>
              ))}
              <span className="sr-only">Game online murah proses kilat di gastros.id</span>
            </h1>
          </div>

          {/* Copy */}
          <p className="font-mono text-[10px] sm:text-[10px] md:text-[13px] text-foreground/60 max-w-[260px] sm:max-w-xs md:max-w-md mx-auto md:mx-0 leading-relaxed anim-cut-in" style={d(800)}>
            Top up game murah: Diamond MLBB, FF, UC PUBG, VP Valorant &mdash; masuk akun dalam hitungan menit. Jalur resmi publisher, bayar QRIS/e-wallet, layanan 24 jam.
          </p>

          {/* CTAs */}
          <div className="flex items-center justify-center md:justify-start gap-2 md:gap-4 mt-3 md:mt-6 anim-cut-in" style={d(900)}>
            <Link
              href="/games"
              className="group relative font-mono text-[10px] sm:text-[10px] md:text-[11px] bg-foreground text-background px-3 sm:px-5 md:px-6 py-2 md:py-3 tracking-[0.12em] md:tracking-[0.2em] uppercase overflow-hidden min-h-[36px] md:min-h-[44px] flex items-center"
            >
              <span className="relative z-10 group-hover:text-accent-foreground transition-colors duration-300">Pilih Game</span>
              <span className="absolute inset-0 bg-accent translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]" />
            </Link>
            <Link
              href="#harga"
              className="font-mono text-[10px] sm:text-[10px] md:text-[11px] text-foreground/60 px-3 sm:px-5 md:px-6 py-2 md:py-3 tracking-[0.12em] md:tracking-[0.2em] uppercase border border-foreground/20 hover:border-foreground hover:text-foreground transition-all min-h-[36px] md:min-h-[44px] flex items-center"
            >
              Lihat Harga
            </Link>
          </div>

          {/* Stats row -- tighter, proportional */}
          <div className="mt-4 md:mt-10 flex items-end justify-center md:justify-start gap-4 sm:gap-8 md:gap-12 anim-counter-pop" style={d(950)}>
            {[
              { target: 7, suffix: "+", label: "Games Aktif" },
              { target: 99, suffix: "%", label: "Success Rate" },
              { target: 3, suffix: "m", label: "Proses Kilat" },
            ].map((stat, i) => (
              <div key={stat.label} className="relative">
                <span className="font-sans text-[8vw] sm:text-[7vw] md:text-7xl lg:text-8xl text-foreground leading-none block">
                  <Counter target={stat.target} suffix={stat.suffix} go />
                </span>
                <span className="font-mono text-[10px] sm:text-[10px] md:text-[10px] text-foreground/60 block tracking-[0.12em] md:tracking-[0.25em] uppercase mt-0.5 md:mt-2">
                  {stat.label}
                </span>
                {i < 2 && (
                  <div className="absolute -right-2 sm:-right-4 md:-right-6 top-1/4 h-1/2 w-[1px] bg-foreground/15" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar desktop only */}
      <div className="relative z-10 pb-4 md:pb-6 hidden md:block">
        <div className="flex items-center justify-between max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 w-full anim-cut-in" style={d(1000)}>
          <div className="flex items-center gap-3">
            <div className="w-[1px] h-10 bg-accent" />
            <span className="font-mono text-[10px] text-foreground/55 tracking-[0.3em] uppercase">Scroll</span>
          </div>
          <div className="flex items-center gap-6">
            {["QRIS TERIMA", "E-WALLET & VA", "LAYANAN 24/7"].map((info, i) => (
              <span key={info} className="font-mono text-[10px] text-foreground/55 tracking-[0.2em] uppercase">
                {i > 0 && <span className="text-accent mr-6">/</span>}
                {info}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 h-[1px] w-full bg-accent/40 anim-width-expand" style={d(600)} />
    </section>
  )
}
