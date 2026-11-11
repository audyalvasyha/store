"use client"

import { useState } from "react"
import Image from "next/image"
import type { GameItem } from "@/lib/catalog"

type ArtworkGame = Pick<GameItem, "slug" | "name" | "short" | "glyph" | "hue" | "image">

/**
 * Artwork game satu tempat:
 * - Ada URL + berhasil load -> gambar asli (dari Gamestone/admin).
 * - URL kosong ATAU image rusak (404/timeout/blokir optimizer) -> placeholder
 *   gradient pakai hue game + inisial nama game. User tidak pernah lihat ikon img rusak.
 */
export function GameArtwork({
  game,
  sizes,
  className = "",
  fallbackClassName = "",
  initialsClassName = "text-lg",
  priority = false,
}: {
  game: ArtworkGame
  sizes: string
  /** Class untuk <Image> — biasanya object-cover + transform saat hover. */
  className?: string
  /** Class tambahan untuk latar fallback (mis. transform hover-nya juga). */
  fallbackClassName?: string
  /** Ukuran font inisial, cocokkan dengan ukuran tile. */
  initialsClassName?: string
  priority?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(game.image) && !failed

  if (!showImage) {
    return (
      <div
        aria-hidden="true"
        className={`absolute inset-0 flex flex-col items-center justify-center gap-0.5 overflow-hidden ${fallbackClassName}`}
        style={{
          background: `radial-gradient(ellipse at 30% 25%, hsl(${game.hue} / 0.55), transparent 60%), radial-gradient(ellipse at 75% 85%, hsl(${game.hue} / 0.35), transparent 55%), linear-gradient(180deg, hsl(0 0% 8%), hsl(0 0% 4%))`,
        }}
      >
        <span
          className={`font-sans font-bold leading-none tracking-tighter text-foreground/80 uppercase select-none ${initialsClassName}`}
        >
          {initialsOf(game)}
        </span>
        <span className="hidden sm:block max-w-[90%] font-mono text-[8px] leading-tight text-foreground/40 tracking-[0.15em] uppercase truncate">
          {game.name}
        </span>
      </div>
    )
  }

  return (
    <Image
      src={game.image as string}
      alt={game.name}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
      className={className}
    />
  )
}

/** Inisial nama game: 2 huruf, mis. "Mobile Legends" -> "ML". */
function initialsOf(game: ArtworkGame): string {
  const source = (game.glyph || game.short || game.name || game.slug || "??").trim()
  const words = source.split(/[\s:•/.,-]+/).filter(Boolean)
  if (words.length >= 2) {
    return (words[0]![0]! + words[1]![0]!).toUpperCase()
  }
  const clean = source.replace(/[^a-zA-Z0-9]/g, "")
  return clean.slice(0, 2).toUpperCase() || "??"
}
