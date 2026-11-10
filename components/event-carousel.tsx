"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { DEFAULT_EVENT_SUBTITLE, type EventSlide } from "@/lib/event-carousel"

const AUTOPLAY_MS = 5_500

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  return reduced
}

function SlideCta({ href }: { href: string }) {
  const className =
    "inline-flex min-h-[32px] items-center gap-1 bg-accent px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-accent-foreground hover-glitch"

  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        Lihat event &rarr;
      </Link>
    )
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      Lihat event &rarr;
    </a>
  )
}

/** Panel "Gas." lama — dipakai kalau admin belum punya slide aktif. */
function FallbackPanel() {
  return (
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
          {DEFAULT_EVENT_SUBTITLE}
        </span>
      </div>
    </div>
  )
}

export function EventCarousel({ slides }: { slides: EventSlide[] }) {
  const items = slides.filter((slide) => slide.imageUrl && slide.title)
  const total = items.length
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reducedMotion = usePrefersReducedMotion()

  const go = useCallback(
    (direction: number) => {
      if (total < 2) return
      setIndex((current) => (current + direction + total) % total)
    },
    [total]
  )

  // Daftar slide bisa berubah dari admin — jaga index tetap valid.
  useEffect(() => {
    if (index >= total) setIndex(0)
  }, [index, total])

  useEffect(() => {
    if (total < 2 || paused || reducedMotion) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setIndex((current) => (current + 1) % total)
      }
    }, AUTOPLAY_MS)
    return () => window.clearInterval(timer)
  }, [total, paused, reducedMotion])

  if (total === 0) return <FallbackPanel />

  const safeIndex = Math.min(index, total - 1)
  const active = items[safeIndex]!

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Info event"
      tabIndex={total > 1 ? 0 : -1}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false)
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault()
          go(-1)
        } else if (event.key === "ArrowRight") {
          event.preventDefault()
          go(1)
        }
      }}
      className="group relative aspect-[16/9] overflow-hidden bg-background outline-none focus-visible:ring-1 focus-visible:ring-accent"
    >
      {/* Gambar ditumpuk; yang non-aktif disembunyikan dari screen reader. */}
      {items.map((slide, slideIndex) => (
        <div
          key={slide.id}
          aria-hidden="true"
          className={`absolute inset-0 transition-opacity duration-700 ${
            slideIndex === safeIndex ? "z-[1] opacity-100" : "z-0 opacity-0"
          }`}
        >
          <Image
            src={slide.imageUrl}
            alt=""
            fill
            unoptimized
            sizes="(max-width: 1024px) 100vw, 560px"
            className={`object-cover transition-transform [transition-duration:4000ms] ease-out ${
              slideIndex === safeIndex ? "scale-105" : "scale-100"
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
        </div>
      ))}

      <div className="absolute top-0 left-0 z-[2] w-3 h-3 md:w-6 md:h-6 border-t-2 border-l-2 border-accent" />
      <div className="absolute bottom-0 right-0 z-[2] w-3 h-3 md:w-6 md:h-6 border-b-2 border-r-2 border-accent" />

      <span className="absolute right-2 top-2 z-[3] bg-background/80 px-1.5 py-0.5 font-mono text-[9px] tabular-nums tracking-[0.15em] text-foreground/70 md:text-[10px]">
        {String(safeIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </span>

      <div className="absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/70 to-transparent p-3 pb-7 pt-10 md:p-5 md:pb-8 md:pt-16">
        <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.3em] text-accent md:text-[10px]">
          [Event]
        </span>
        <h3 className="line-clamp-2 font-sans text-2xl uppercase leading-[0.95] tracking-tighter text-foreground drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] md:text-5xl">
          {active.title}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="bg-background/90 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/70 md:text-[10px]">
            {active.subtitle}
          </span>
          {active.href && <SlideCta href={active.href} />}
        </div>
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Slide sebelumnya"
            className="absolute left-2 top-1/2 z-[3] -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center border border-foreground/25 bg-background/70 font-mono text-sm text-foreground/80 opacity-100 transition-opacity hover:border-accent hover:text-accent focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
          >
            &larr;
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Slide berikutnya"
            className="absolute right-2 top-1/2 z-[3] -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center border border-foreground/25 bg-background/70 font-mono text-sm text-foreground/80 opacity-100 transition-opacity hover:border-accent hover:text-accent focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
          >
            &rarr;
          </button>

          <div className="absolute bottom-2 left-2 z-[3] flex items-center gap-1.5 md:bottom-3 md:left-3">
            {items.map((slide, slideIndex) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setIndex(slideIndex)}
                aria-label={`Tampilkan slide ${slideIndex + 1}: ${slide.title}`}
                aria-current={slideIndex === safeIndex}
                className={`h-1.5 transition-all ${
                  slideIndex === safeIndex
                    ? "w-5 bg-accent"
                    : "w-1.5 bg-foreground/40 hover:bg-foreground/70"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
