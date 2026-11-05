/**
 * Rate limiter fixed-window per key — BACKING DISTRIBUSI.
 *
 * Masalah lama: limiter murni in-memory — di deployment multi-instance,
 * tiap instance punya Map sendiri, jadi limit efektif = limit x jumlah
 * instance (abuse lewat beberapa IP dulu lebih murah, dan limit brute-force
 * admin bisa jadi longgar di pod lain).
 *
 * Solusi: counter disimpan di MongoDB `rate_limits` (sudah jadi central
 * store project ini — orders/coupons/sessions), dengan TTL index biar
 * dokumen window kadaluarsa kehapus sendiri. In-memory tetap dipakai
 * sebagai fallback kalau DB gagal dibuka, supaya limiter TIDAK pernah
 * bikin endpoint down (prinsip yang sama dengan lib/content.ts).
 *
 * Semua endpoint publik yang pakai ini harus `await` hasilnya.
 */

import { getDb } from "./mongodb"

type Bucket = { count: number; resetAt: number }

const globalForRate = globalThis as typeof globalThis & {
  _gasRateBuckets_?: Map<string, Bucket>
}

/** Fallback lokal — dipakai kalau DB nggak bisa diakses. */
const memoryBuckets: Map<string, Bucket> =
  globalForRate._gasRateBuckets_ ?? new Map()
globalForRate._gasRateBuckets_ = memoryBuckets

export type RateLimitResult = {
  ok: boolean
  /** Detik sampai window ke-reset (0 kalau lolos). */
  retryAfter: number
}

function memoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const slot = memoryBuckets.get(key)
  if (!slot || slot.resetAt <= now) {
    if (memoryBuckets.size > 10_000) {
      for (const [k, v] of memoryBuckets) {
        if (v.resetAt <= now) memoryBuckets.delete(k)
      }
    }
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }
  slot.count += 1
  if (slot.count > limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((slot.resetAt - now) / 1000)) }
  }
  return { ok: true, retryAfter: 0 }
}

type LimitDoc = { _id: string; count: number; expiresAt: Date }

async function distributedLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult | null> {
  try {
    const db = await getDb()
    const col = db.collection<LimitDoc>("rate_limits")
    const now = Date.now()

    // Naikkan counter di window yang masih hidup (atomic $inc).
    const live = await col.findOneAndUpdate(
      { _id: key, expiresAt: { $gt: new Date(now) } },
      { $inc: { count: 1 } },
      { returnDocument: "after" }
    )

    if (live) {
      const retryAfter = Math.max(
        1,
        Math.ceil((live.expiresAt.getTime() - now) / 1000)
      )
      if (live.count > limit) return { ok: false, retryAfter }
      return { ok: true, retryAfter: 0 }
    }

    // Window belum ada / sudah kadaluarsa. Hapus sisa lama (opsional, TTL
    // index bakal nyapu juga) lalu mulai window baru.
    await col.deleteOne({ _id: key, expiresAt: { $lte: new Date(now) } })
    const fresh = await col.findOneAndUpdate(
      { _id: key },
      { $set: { count: 1, expiresAt: new Date(now + windowMs) } },
      { upsert: true, returnDocument: "after" }
    )
    if (fresh && fresh.count > limit) {
      return {
        ok: false,
        retryAfter: Math.max(1, Math.ceil((fresh.expiresAt.getTime() - now) / 1000)),
      }
    }
    return { ok: true, retryAfter: 0 }
  } catch {
    // DB bermasalah → limiter tidak boleh bikin down. Balikin null supaya
    // caller jatuh ke fallback in-memory.
    return null
  }
}

export async function rateLimit(
  name: string,
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const slotKey = `${name}:${key}`
  const distributed = await distributedLimit(slotKey, limit, windowMs)
  if (distributed) return distributed
  return memoryLimit(slotKey, limit, windowMs)
}

/** IP caller: proxy di depan (Vercel/CDN) memasukkan IP asli di header ini. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for")
  if (fwd) {
    const first = fwd.split(",")[0].trim()
    if (first) return first
  }
  return request.headers.get("x-real-ip") ?? "unknown"
}
