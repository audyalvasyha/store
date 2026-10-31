/**
 * Client untuk Gamestone Merchant API v1.
 * Docs: https://www.transportbaganbatu.web.id/api/merchant/v1/openapi
 * Auth: header `x-api-key` (env: GAMESTONE_API_KEY).
 */

const BASE_URL =
  process.env.GAMESTONE_BASE_URL ?? "https://www.transportbaganbatu.web.id/api/merchant/v1"

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

async function stoneFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "x-api-key": apiKey(),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  })

  let json: StoneEnvelope<unknown>
  try {
    json = (await res.json()) as StoneEnvelope<unknown>
  } catch {
    throw new Error(`Gamestone: response bukan JSON (HTTP ${res.status})`)
  }

  if (!res.ok || json.data === null) {
    const message =
      json && typeof json.message === "string"
        ? `Gamestone: ${json.message}`
        : `Gamestone: request gagal (HTTP ${res.status})`
    throw new Error(message)
  }

  return json.data as T
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

/** GET /games/{slug} */
export async function getStoneGame(slug: string): Promise<StoneGame | null> {
  try {
    return await stoneFetch<StoneGame>(`/games/${encodeURIComponent(slug)}`)
  } catch {
    return null
  }
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

/** Variants aktif & visible saja. */
export function activeStoneVariants(game: StoneGame): StoneVariant[] {
  return (game.variants ?? []).filter((v) => v.is_active && v.is_show && !v.is_maintenance)
}
