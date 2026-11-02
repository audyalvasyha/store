/**
 * Rate limiter sederhana in-memory (fixed window per key).
 *
 * Dipakai buat endpoint publik yang mahal / rawan disalahgunakan:
 * POST /api/orders (bikin session pembayaran di provider),
 * GET /api/orders?code= (info order + PII), dan
 * POST /api/admin/auth (brute force login admin).
 *
 * Deployed di satu process serverless per instance — ini bukan global store,
 * tapi sudah ngebikin abuse grafis jauh lebih mahal dibanding tanpa limit.
 */

type Bucket = { count: number; resetAt: number; }

const globalForRate = globalThis as typeof globalThis & {
  _gasRateBuckets_?: Map<string, Bucket>
}

const buckets: Map<string, Bucket> =
  globalForRate._gasRateBuckets_ ?? new Map()
globalForRate._gasRateBuckets_ = buckets

export type RateLimitResult = {
  ok: boolean
  /** Detik sampai window ke-reset (0 kalau lolos). */
  retryAfter: number
}

export function rateLimit(
  name: string,
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  const slot = buckets.get(`${name}:${key}`)

  if (!slot || slot.resetAt <= now) {
    // GC murah biar Map nggak terus nge-gel lewat periode lalu lintas tinggi.
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) {
        if (v.resetAt <= now) buckets.delete(k)
      }
    }
    buckets.set(`${name}:${key}`, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }

  slot.count += 1
  if (slot.count > limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((slot.resetAt - now) / 1000)) }
  }
  return { ok: true, retryAfter: 0 }
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
