/**
 * Model + sanitasi carousel event yang tampil di section "Pilih Game".
 *
 * File ini PURE (tanpa MongoDB) supaya bisa diimpor komponen client untuk
 * tipe & konstanta, dan dipakai server buat validasi sebelum menyimpan.
 */

export const EVENT_CAROUSEL_KEY = "event-carousel"
export const EVENT_IMAGE_PREFIX = "/api/events/image/"
export const MAX_EVENT_SLIDES = 6
/** Batas file setelah dikompres di browser (Vercel limit body ~4.5 MB). */
export const MAX_EVENT_IMAGE_BYTES = 2_500_000
export const DEFAULT_EVENT_SUBTITLE = "Semua Server Aktif"

export type EventSlide = {
  /** ID stabil buat key React & urutan; bukan _id Mongo. */
  id: string
  imageUrl: string
  title: string
  subtitle: string
  href?: string
  active: boolean
}

const IMAGE_ID_RE = /^[a-f0-9]{24}$/
const SLIDE_ID_RE = /^[A-Za-z0-9_-]{8,64}$/

export function makeSlideId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `slide-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  )
}

/** URL gambar: hasil upload kita sendiri, atau https eksternal. */
export function isAllowedEventImageUrl(raw: string): boolean {
  const url = raw.trim()
  if (!url || url.length > 600) return false
  if (url.startsWith(EVENT_IMAGE_PREFIX)) {
    return IMAGE_ID_RE.test(url.slice(EVENT_IMAGE_PREFIX.length))
  }
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" && Boolean(parsed.hostname) && !url.startsWith("https://javascript:")
  } catch {
    return false
  }
}

/** Link slide: path internal (bukan protocol-relative) atau https absolut. */
export function isAllowedEventHref(raw: string): boolean {
  const href = raw.trim()
  if (!href || href.length > 300) return false
  if (href.startsWith("/")) return !href.startsWith("//") && !/[\s\\]/.test(href)
  try {
    return new URL(href).protocol === "https:"
  } catch {
    return false
  }
}

function cleanText(raw: unknown, max: number): string {
  return String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
}

/**
 * Sanitasi daftar slide dari admin / dokumen lama. Item tanpa gambar atau
 * judul dibuang; ID duplikat diganti; link berbahaya dikosongkan.
 */
export function sanitizeEventSlides(raw: unknown): EventSlide[] {
  if (!Array.isArray(raw)) return []

  const slides: EventSlide[] = []
  const usedIds = new Set<string>()

  for (const item of raw.slice(0, MAX_EVENT_SLIDES)) {
    if (!item || typeof item !== "object") continue
    const value = item as Record<string, unknown>

    const imageUrl = String(value.imageUrl ?? "").trim()
    if (!isAllowedEventImageUrl(imageUrl)) continue

    const title = cleanText(value.title, 48)
    if (!title) continue

    let id = String(value.id ?? "").trim()
    if (!SLIDE_ID_RE.test(id) || usedIds.has(id)) id = makeSlideId()
    usedIds.add(id)

    let href = cleanText(value.href, 300)
    if (href && !isAllowedEventHref(href)) href = ""

    slides.push({
      id,
      imageUrl,
      title,
      subtitle: cleanText(value.subtitle, 60) || DEFAULT_EVENT_SUBTITLE,
      ...(href ? { href } : {}),
      active: value.active !== false,
    })
  }

  return slides
}

/**
 * Deteksi tipe gambar dari magic bytes. SVG sengaja ditolak karena bisa
 * membawa script saat disajikan dari origin yang sama.
 */
export function detectEventImageType(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | "image/avif" | null {
  if (bytes.length < 12) return null

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg"

  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png"
  }

  const riff = String.fromCharCode(...bytes.slice(0, 4))
  const webp = String.fromCharCode(...bytes.slice(8, 12))
  if (riff === "RIFF" && webp === "WEBP") return "image/webp"

  const ftyp = String.fromCharCode(...bytes.slice(4, 12))
  if (ftyp.startsWith("ftypavi")) return "image/avif"

  return null
}
