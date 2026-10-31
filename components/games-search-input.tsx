"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

/**
 * Search bar buat header /games: ngetik → update `?q=` di URL (debounce 350ms),
 * katalog di-filter server-side oleh app/games/page.tsx.
 * Styling brutalist G$: mono, border, caret accent.
 */
export function GamesSearchInput() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initial = searchParams.get("q") ?? ""
  const [value, setValue] = useState(initial)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function pushQuery(q: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (q.trim()) params.set("q", q.trim())
    else params.delete("q")
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  function onChange(next: string) {
    setValue(next)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => pushQuery(next), 350)
  }

  // Bersihin timer pas komponen unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div className="relative flex items-center flex-1 min-w-0 max-w-md md:max-w-xl">
      {/* Ikon search */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        className="absolute left-3 text-foreground/40 pointer-events-none shrink-0"
        aria-hidden="true"
      >
        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      {/* type="text" biar ga dobel sama tombol ✕ bawaan browser (webkit). */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Cari game…"
        aria-label="Cari game"
        className="w-full bg-background border border-border focus:border-accent outline-none font-mono text-[11px] md:text-sm text-foreground placeholder:text-foreground/30 pl-9 pr-8 py-2 md:py-2.5 min-h-[38px] md:min-h-[44px] tracking-[0.05em] transition-colors"
      />

      {value && (
        <button
          type="button"
          aria-label="Hapus pencarian"
          onClick={() => onChange("")}
          className="absolute right-2 w-6 h-6 flex items-center justify-center text-foreground/40 hover:text-accent transition-colors cursor-pointer"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      )}
    </div>
  )
}
