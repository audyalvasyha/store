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

import { isIP } from "node:net"
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
    const nowDate = new Date(now)
    const nextExpiry = new Date(now + windowMs)

    // Satu operasi atomik: naikkan counter kalau window masih hidup, atau
    // mulai window baru kalau dokumennya sudah kedaluwarsa. Versi lama
    // melakukan find + delete + upsert (3 round-trip) untuk window baru.
    const updated = await col.findOneAndUpdate(
      { _id: key },
      [
        {
          $set: {
            count: {
              $cond: [
                { $gt: [{ $ifNull: ["$expiresAt", new Date(0)] }, nowDate] },
                { $add: [{ $ifNull: ["$count", 0] }, 1] },
                1,
              ],
            },
            expiresAt: {
              $cond: [
                { $gt: [{ $ifNull: ["$expiresAt", new Date(0)] }, nowDate] },
                "$expiresAt",
                nextExpiry,
              ],
            },
          },
        },
      ],
      { upsert: true, returnDocument: "after" }
    )

    if (!updated) return null
    const retryAfter = Math.max(
      1,
      Math.ceil((updated.expiresAt.getTime() - now) / 1000)
    )
    if (updated.count > limit) return { ok: false, retryAfter }
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

/**
 * Ambil IP yang valid dari satu header. Nilai mentah tidak pernah dipakai
 * langsung sebagai key rate-limit (biar header sampah tidak bikin key aneh).
 */
function validIp(value: string | null | undefined): string | null {
  if (!value) return null
  let candidate = value.trim().slice(0, 64)
  // Sebagian proxy mengirim IPv6 dalam bracket.
  if (candidate.startsWith("[") && candidate.includes("]")) {
    candidate = candidate.slice(1, candidate.indexOf("]"))
  }
  return isIP(candidate) ? candidate : null
}

/**
 * IP caller. Prioritas header yang di-set platform (Cloudflare/Vercel), lalu
 * hop TERAKHIR X-Forwarded-For. Hop terakhir dipilih karena proxy yang paling
 * dekat dengan app menambahkan IP asli di akhir; kalau memakai hop pertama,
 * client bisa memalsukan X-Forwarded-For dan membypass rate limit.
 */
export function clientIp(request: Request): string {
  const platform =
    validIp(request.headers.get("cf-connecting-ip")) ??
    validIp(request.headers.get("x-real-ip"))
  if (platform) return platform

  const fwd = request.headers.get("x-forwarded-for")
  if (fwd) {
    const hops = fwd.split(",").map((part) => validIp(part))
    for (let i = hops.length - 1; i >= 0; i--) {
      if (hops[i]) return hops[i] as string
    }
  }
  return "unknown"
}
