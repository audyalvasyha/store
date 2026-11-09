"use client"

import { useEffect, useState } from "react"

/** Event lokal: header search -> katalog, tanpa request RSC/server. */
export const GAMES_SEARCH_EVENT = "gastros:games-search"

/**
 * Search bar buat header /games: ngetik → filter katalog langsung di browser.
 * URL `?q=` tetap diperbarui supaya bisa di-refresh/dibagikan, tapi tanpa
 * memicu navigasi Next.js. Ini bikin halaman katalog tetap static/ISR.
 */
export function GamesSearchInput() {
  const [value, setValue] = useState("")

  useEffect(() => {
    const syncFromUrl = () => {
      setValue(new URLSearchParams(window.location.search).get("q") ?? "")
    }
    syncFromUrl()
    window.addEventListener("popstate", syncFromUrl)
    return () => window.removeEventListener("popstate", syncFromUrl)
  }, [])

  function onChange(next: string) {
    setValue(next)
    const params = new URLSearchParams(window.location.search)
    if (next.trim()) params.set("q", next.trim())
    else params.delete("q")
    const qs = params.toString()
    // Tetap di halaman sekarang (homepage atau /games); jangan paksa pindah
    // URL ke /games saat search dipakai di landing.
    const path = window.location.pathname
    window.history.replaceState(null, "", qs ? `${path}?${qs}` : path)
    window.dispatchEvent(new CustomEvent(GAMES_SEARCH_EVENT, { detail: next }))
  }

  return (
    <div className="relative flex w-full min-w-0 max-w-none flex-1 items-center sm:max-w-md md:max-w-xl">
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
