/** Satu sumber geometri mark GASTROS (viewBox 0 0 64 64).
 *  Dipakai oleh komponen SVG, generator ikon, dan OG image supaya mark
 *  yang tampil di web, favicon, dan kartu sosial selalu identik. */
export const BRAND_RED = "#ff0000"
export const BRAND_INK = "#080808"

/** Path G blok: stroke 8, padding 10, bukaan di kanan atas. */
export const BRAND_MARK_PATH = "M46 14H14v36h36V30H30"

/** Bentuk yang sama sebagai balok, buat renderer non-SVG (next/og). */
export const BRAND_MARK_PARTS = [
  { x: 10, y: 10, width: 36, height: 8 },
  { x: 10, y: 10, width: 8, height: 44 },
  { x: 10, y: 46, width: 44, height: 8 },
  { x: 46, y: 26, width: 8, height: 28 },
  { x: 30, y: 26, width: 24, height: 8 },
] as const
