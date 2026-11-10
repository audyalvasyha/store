/**
 * Penyimpanan carousel event:
 * - Slide  -> site_content key "event-carousel"
 * - Gambar -> collection event_images (binary, disajikan via /api/events/image/[id])
 *
 * SERVER-ONLY. Jangan diimpor dari komponen client.
 */
import { randomBytes } from "node:crypto"
import { Binary } from "mongodb"
import { ensureIndexes, getDb } from "./mongodb"
import {
  EVENT_CAROUSEL_KEY,
  EVENT_IMAGE_PREFIX,
  sanitizeEventSlides,
  type EventSlide,
} from "./event-carousel"

type CarouselDoc = {
  key: string
  slides: EventSlide[]
  updatedAt: string
}

type EventImageDoc = {
  _id: string
  data: Binary
  contentType: string
  createdAt: Date
}

/** Slide publik (default cuma yang aktif), urut sesuai array admin. */
export async function getEventSlides(activeOnly = true): Promise<EventSlide[]> {
  try {
    await ensureIndexes()
    const db = await getDb()
    const doc = await db.collection<CarouselDoc>("site_content").findOne({ key: EVENT_CAROUSEL_KEY })
    const slides = sanitizeEventSlides(doc?.slides ?? [])
    return activeOnly ? slides.filter((slide) => slide.active) : slides
  } catch {
    // DB down: landing tetap tampil dengan panel "Gas." bawaan.
    return []
  }
}

/** Simpan seluruh daftar (urutan array = urutan tampil). */
export async function saveEventSlides(input: unknown): Promise<EventSlide[]> {
  const slides = sanitizeEventSlides(input)
  await ensureIndexes()
  const db = await getDb()
  await db.collection<CarouselDoc>("site_content").updateOne(
    { key: EVENT_CAROUSEL_KEY },
    { $set: { slides, updatedAt: new Date().toISOString() } },
    { upsert: true }
  )
  return slides
}

/** Simpan gambar hasil upload, balikin URL publiknya. */
export async function saveEventImage(bytes: Buffer, contentType: string): Promise<string> {
  const id = randomBytes(12).toString("hex")
  const db = await getDb()
  await db.collection<EventImageDoc>("event_images").insertOne({
    _id: id,
    data: new Binary(bytes),
    contentType,
    createdAt: new Date(),
  })
  return `${EVENT_IMAGE_PREFIX}${id}`
}

export async function getEventImage(
  id: string
): Promise<{ data: Buffer; contentType: string } | null> {
  if (!/^[a-f0-9]{24}$/.test(id)) return null
  try {
    const db = await getDb()
    const doc = await db.collection<EventImageDoc>("event_images").findOne({ _id: id })
    if (!doc) return null
    // Binary.buffer = payload mentah (tanpa header subtype).
    const data = Buffer.from(doc.data.buffer)
    const contentType = /^image\/(jpeg|png|webp|avif)$/.test(doc.contentType)
      ? doc.contentType
      : "application/octet-stream"
    return { data, contentType }
  } catch {
    return null
  }
}
