/**
 * Client untuk Gamestone Merchant API v1.
 * Docs: https://www.transportbaganbatu.web.id/api/merchant/v1/openapi
 * Auth: header `x-api-key` (env: GAMESTONE_API_KEY).
 */

const BASE_URL =
  // Bisa dipinggul via Cloudflare Worker proxy: kalau Gamestone/WAF memblokir
  // IP datcentersar hosting (mis. Vercel), app bisa memanggil worker
  // (STION_PROXY_URL) yang meneruskan request — IP asal jadi network
  // Cloudflare, bukan Vercel. Tanpa env ini, panggil bebas tak hops tunggu.
  process.env.STONE_PROXY_URL?.replace(/\/$/, "") ??
  process.env.GAMESTONE_BASE_URL ??
  "https://www.transportbaganbatu.web.id/api/merchant/v1"

export type StoneInputField = {
  tag: string
  attrs: {
    name: string
    type?: string
    length?: string
    placeholder?: string
    parenthesis?: string
  }
}

export type StoneVariant = {
  id: number
  name: string
  price: number
  is_active: boolean
  is_show: boolean
  is_maintenance: boolean
  game_slug: string
}

export type StoneGame = {
  slug: string
  name: string
  publisher: string | null
  image: string | null
  type: "topup" | "voucher"
  is_active: boolean
  variants: StoneVariant[]
}

export type StoneInputPayload = {
  user_id: string
  zone_id?: string | null
}

export type StonePaymentMethod =
  | "qris"
  | "ovo"
  | "linkaja"
  | "mandiri"
  | "bri"
  | "bni"
  | "permata"
  | "bjb"
  | "cimb"
  | "balance"
  | "indomaret"
  | "alfamart"

export type StoneOrder = {
  id: string
  phone_number: string
  payment_method_code: string
  price: number
  fee: number
  payment_fee: number
  total_price: number
  status: "pending" | "processing" | "delivered" | "cancelled" | "refunded" | "expired"
  is_paid: boolean
  /** payment_code Gamestone: QRIS EMV (qris) / nomor VA / kode bayar. */
  payment_code?: string | null
  type: "topup" | "voucher"
  expired_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  order_account?: {
    user_id: string
    zone_id?: string | null
    nickname?: string | null
    ign?: string | null
  } | null
  order_voucher?: { code: string } | null
  /** Field tambahan opsional dari upstream (URL pembayaran dsb.) */
  [key: string]: unknown
}

type StoneEnvelope<T> = { data: T | null; message?: string }

export function gamestoneConfigured(): boolean {
  return Boolean(process.env.GAMESTONE_API_KEY)
}

function apiKey(): string {
  const key = process.env.GAMESTONE_API_KEY
  if (!key) throw new Error("GAMESTONE_API_KEY belum diset")
  return key
}

/**
 * Meta error fetch Gamestone terakhir (null = fetch terakhir sukses).
 * Dipakai route order buat nyompan pesan error yang jelas ke user —
 * tanpa ini, sebab sebenarnya (timeout / HTTP berapa) ketelan di catch.
 */
const globalForStoneMeta = globalThis as typeof globalThis & {
  _gasStoneFetchError_?: string | null
}

export function stoneFetchLastError(): string | null {
  return globalForStoneMeta._gasStoneFetchError_ ?? null
}

function recordStoneFetchError(msg: string | null): void {
  globalForStoneMeta._gasStoneFetchError_ = msg
}

/** Error HTTP dari provider (bukan network) — HTTP emang jawaban provider,
 * nggak layak di-retry. Network/timeout error yang layak. */
class StoneHttpError extends Error {}

type StoneFetchInit = RequestInit & { next?: { revalidate?: number } }

async function stoneFetch<T>(path: string, init?: StoneFetchInit): Promise<T> {
  const timeoutMs = Number(process.env.GAMESTONE_TIMEOUT_MS) || 20_000
  // Retry maks 2 percobaan, cuma buat GET (idempotent): glitch jaringan/timeout
  // sesekali itu hal normal. HTTP error & POST nggak di-retry (rawan dobel order).
  const isGet = !init?.method || init.method === "GET"
  const attempts = isGet ? 2 : 1
  let lastErr: unknown

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: {
          "x-api-key": apiKey(),
          "Content-Type": "application/json",
          ...(process.env.STONE_PROXY_SECRET ? { "x-proxy-secret": process.env.STONE_PROXY_SECRET } : {}),
          ...(init?.headers ?? {}),
        },
        // Detail game boleh di-cache (halaman top up pakai ISR). Order/polling
        // tetap no-store supaya status pembayaran nggak pernah basi.
        cache: init?.cache ?? "no-store",
        // Timeout keras: provider hung nggak boleh bikin request nginx/fetch
        // numpuk pending sampai timeout platform pas traffic tinggi.
        signal: AbortSignal.timeout(timeoutMs),
      })

      let json: StoneEnvelope<unknown>
      try {
        const raw = await res.text() // dibaca SEKALI — body stream nggak bisa dibaca ulang
        let parsed: unknown
        try {
          parsed = JSON.parse(raw)
        } catch {
          // Respons bukan JSON — nyaris pasti halaman HTML dari WAF/Cloudflare
          // (mis. Access Denied / challenge). Simpan diagnosik lengka biar
          // error-nya reportable ke provider: status, content-type, header
          // Cloudflare (cf-ray = kunci log di sisi mereka), dan potongan body.
          const bits: string[] = [`content-type:${res.headers.get("content-type") ?? "tidak ada"}`]
          for (const h of ["server", "cf-ray", "cf-mitigated", "cf-chl-bypass", "x-request-id"]) {
            const v = res.headers.get(h)
            if (v) bits.push(`${h}:${v}`)
          }
          const snippet = raw.replace(/\s+/g, " ").slice(0, 220)
          if (snippet) bits.push(`body:"${snippet}"`)
          const msg = `Gamestone: response bukan JSON (HTTP ${res.status}) | ${bits.join(" ")}`
          recordStoneFetchError(msg)
          throw new StoneHttpError(msg)
        }
        json = parsed as StoneEnvelope<unknown>
      } catch (err) {
        // StoneHttpError (bukan JSON) tetap diangkat keluar; kalau ini error
        // network saat membaca body, lempar ulang biar masuk catch luar
        // dan di-retry sesuai aturan GET.
        if (err instanceof StoneHttpError) throw err
        throw err
      }

      if (!res.ok || json.data === null) {
        const message =
          json && typeof json.message === "string"
            ? `Gamestone: ${json.message}`
            : `Gamestone: request gagal (HTTP ${res.status})`
        recordStoneFetchError(message)
        throw new StoneHttpError(message)
      }

      recordStoneFetchError(null)
      return json.data as T
    } catch (err) {
      lastErr = err
      // HTTP error jangan di-retry — provider emang nanggepin error.
      if (err instanceof StoneHttpError) throw err
      // Network/timeout error: kasih jeda kecil sebelum coba lagi.
      if (attempt < attempts - 1) {
        await new Promise((r) => setTimeout(r, 800))
        continue
      }
    }
  }

  const message = lastErr instanceof Error ? `Gamestone: ${lastErr.message}` : "Gamestone: network error"
  recordStoneFetchError(message)
  throw new Error(message)
}

/** GET /games?type=topup|voucher&limit&page */
export async function listStoneGames(options?: {
  type?: "topup" | "voucher"
  limit?: number
  page?: number
}): Promise<StoneGame[]> {
  const params = new URLSearchParams()
  if (options?.type) params.set("type", options.type)
  if (options?.limit !== undefined) params.set("limit", String(options.limit))
  if (options?.page !== undefined) params.set("page", String(options.page))
  const qs = params.toString()
  // Struktur real: { data: { data: Game[], ... }, message }
  const wrapped = await stoneFetch<{ data: StoneGame[] }>(`/games${qs ? `?${qs}` : ""}`)
  return wrapped?.data ?? []
}

/**
 * Cache in-memory game Gamestone (TTL 60s) — halaman top-up merender
 * variant provider, dan POST /api/orders resolve denomId dari variant
 * provider pula. Tanpa cache, setiap render halaman = 1 HTTP outbound
 * ke Gamestone (expensive + rawan throttle pas traffic tinggi).
 * Response gagal di-cache pendek (15s) supaya provider yang lagi down
 * nggak di-sapu peluru oleh tiap request.
 */
const STONE_GAME_TTL_MS = 60_000
const STONE_GAME_NEGATIVE_TTL_MS = 15_000
const STONE_GAME_MAX_ENTRIES = 100

type StoneGameCacheEntry = { game: StoneGame | null; expiresAt: number }

const globalForStone = globalThis as typeof globalThis & {
  _gasStoneGameCache_?: Map<string, StoneGameCacheEntry>
  _gasStoneGameInflight_?: Map<string, Promise<StoneGame | null>>
}

const stoneGameCache: Map<string, StoneGameCacheEntry> =
  globalForStone._gasStoneGameCache_ ?? new Map()
globalForStone._gasStoneGameCache_ = stoneGameCache

/** Promise fetch yang masih berjalan per slug (anti stampede). */
const stoneGameInflight: Map<string, Promise<StoneGame | null>> =
  globalForStone._gasStoneGameInflight_ ?? new Map()
globalForStone._gasStoneGameInflight_ = stoneGameInflight

/** GET /games/{slug} (cached, single-flight) */
export async function getStoneGame(slug: string): Promise<StoneGame | null> {
  const cached = stoneGameCache.get(slug)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.game
  }

  // Single-flight: pas cache baru expired, request bersamaan (burst) harus
  // nunggu 1 fetch saja — bukan masing-masing nembak provider serentak.
  const inflight = stoneGameInflight.get(slug)
  if (inflight) return inflight

  const task = (async () => {
    let game: StoneGame | null = null
    try {
      game = await stoneFetch<StoneGame>(`/games/${encodeURIComponent(slug)}`, {
        cache: "force-cache",
        next: { revalidate: STONE_GAME_TTL_MS / 1000 },
      })
    } catch {
      game = null
    }

    if (stoneGameCache.size >= STONE_GAME_MAX_ENTRIES) {
      stoneGameCache.clear()
    }
    stoneGameCache.set(slug, {
      game,
      expiresAt:
        Date.now() + (game ? STONE_GAME_TTL_MS : STONE_GAME_NEGATIVE_TTL_MS),
    })
    return game
  })().finally(() => {
    stoneGameInflight.delete(slug)
  })
  stoneGameInflight.set(slug, task)
  return task
}

/**
 * POST /orders — bikin order top-up di Gamestone.
 * Return order lengkap dengan status `pending`; webhook nggak ada,
 * jadi status selalu di-poll via getStoneOrder().
 */
export async function createStoneOrder(payload: {
  variant_id: number
  payment_method_code: StonePaymentMethod
  phone_number: string
  data: StoneInputPayload
}): Promise<StoneOrder> {
  return stoneFetch<StoneOrder>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

/** GET /orders/{id} — polling status order. */
export async function getStoneOrder(id: string): Promise<StoneOrder | null> {
  try {
    return await stoneFetch<StoneOrder>(`/orders/${encodeURIComponent(id)}`)
  } catch {
    return null
  }
}

/**
 * Varian aktif & visible saja — varian berlabel "Global" ditumpuk di atas.
 * Stable sort (indeks asli dipertahankan sebagai tie-breaker): di dalam grup
 * Global / non-Global, urutan asli provider tidak diubah.
 */
const GLOBAL_VARIANT_EXP = /\bglobal\b/i

export function activeStoneVariants(game: StoneGame): StoneVariant[] {
  return (game.variants ?? [])
    .filter((v) => v.is_active && v.is_show && !v.is_maintenance)
    .map((v, i) => ({ v, i, isGlobal: GLOBAL_VARIANT_EXP.test(v.name) }))
    .sort((a, b) => {
      if (a.isGlobal !== b.isGlobal) return a.isGlobal ? -1 : 1
      return a.i - b.i
    })
    .map(({ v }) => v)
}
