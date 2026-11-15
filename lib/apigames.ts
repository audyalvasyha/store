import crypto from "node:crypto"

const MERCHANT_ID = process.env.APIGAMES_MERCHANT_ID
const SECRET_KEY = process.env.APIGAMES_SECRET_KEY
const BASE_URL = process.env.APIGAMES_BASE_URL ?? "https://v1.apigames.id"

export function apigamesConfigured(): boolean {
  return Boolean(MERCHANT_ID && SECRET_KEY)
}

/** md5(merchant_id:secret_key:ref_id) — sesuai dokumentasi APIGames v2 */
export function apigamesSignature(refId: string): string {
  if (!MERCHANT_ID || !SECRET_KEY) throw new Error("APIGAMES belum dikonfigurasi")
  return crypto.createHash("md5").update(`${MERCHANT_ID}:${SECRET_KEY}:${refId}`).digest("hex")
}

export type ApigamesResult =
  | { ok: true; raw: unknown; status: string; trxId?: string; message?: string }
  | { ok: false; error: string }

export async function createApigamesTransaction(args: {
  refId: string
  productCode: string
  tujuan: string
  serverId?: string
}): Promise<ApigamesResult> {
  if (!MERCHANT_ID || !SECRET_KEY) return { ok: false, error: "APIGAMES belum dikonfigurasi" }

  const payload = {
    ref_id: args.refId,
    merchant_id: MERCHANT_ID,
    produk: args.productCode,
    tujuan: args.tujuan,
    server_id: args.serverId ?? "",
    signature: apigamesSignature(args.refId),
  }

  try {
    const res = await fetch(`${BASE_URL}/v2/transaksi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = (await res.json().catch(() => null)) as
      | { status?: number; error_msg?: string; data?: { status?: string; trx_id?: string; message?: string } }
      | null

    if (!res.ok || !data) return { ok: false, error: `APIGames error ${res.status}` }
    if (data.status !== 1) return { ok: false, error: data.error_msg ?? "APIGames menolak transaksi" }

    return {
      ok: true,
      raw: data,
      status: data.data?.status ?? "Pending",
      trxId: data.data?.trx_id,
      message: data.data?.message,
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "APIGames request gagal" }
  }
}

/** Webhook APIGames: header X-Apigames-Authorization = md5(merchant_id:secret_key:ref_id) */
export function verifyApigamesWebhook(headers: Headers, refId: string): boolean {
  if (!MERCHANT_ID || !SECRET_KEY) return false
  const incoming = headers.get("x-apigames-authorization") ?? headers.get("X-Apigames-Authorization") ?? ""
  if (!incoming) return false
  const expected = apigamesSignature(refId)
  const a = Buffer.from(expected)
  const b = Buffer.from(incoming)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// ── Cek ID/nickname game ────────────────────────────────────────────────────
// APIGames menagih Rp5 per pengecekan, dipotong dari saldo deposit APIGames.
// Pemanggil wajib rate-limit/cache sendiri (lihat /api/games/check-id).

export const APIGAMES_CHECK_GAME_CODES = ["mobilelegend", "freefire"] as const
export type ApigamesGameCode = (typeof APIGAMES_CHECK_GAME_CODES)[number]

export function isApigamesGameCode(code: string): code is ApigamesGameCode {
  return (APIGAMES_CHECK_GAME_CODES as readonly string[]).includes(code)
}

/**
 * Signature non-transaksi (cek username). Dokumentasi APIGames menulis formula
 * yang beda antar halaman: "md5(merchant_id+secret_key)" di Cek Akun Game,
 * tapi "md5(MERCHANT_ID:SECRET_KEY)" di Info Akun. Kita coba versi tanpa
 * pemisah dulu (sesuai contoh implementasi resmi), lalu versi pakai titik dua
 * kalau provider bilang signature invalid.
 */
function apigamesGeneralSignatureCandidates(): string[] {
  if (!MERCHANT_ID || !SECRET_KEY) return []
  const concat = crypto.createHash("md5").update(`${MERCHANT_ID}${SECRET_KEY}`).digest("hex")
  const colon = crypto.createHash("md5").update(`${MERCHANT_ID}:${SECRET_KEY}`).digest("hex")
  return concat === colon ? [concat] : [concat, colon]
}

function isSignatureError(message: string | undefined): boolean {
  return /signature/i.test(message ?? "")
}

const FETCH_TIMEOUT_MS = 12_000

async function apigamesGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  const data = (await res.json().catch(() => null)) as T | null
  if (!res.ok || data === null) {
    throw new Error(`APIGames error ${res.status}`)
  }
  return data
}

export type ApigamesCheckResult =
  | { ok: true; valid: boolean; username?: string; message?: string }
  | { ok: false; error: string }

/**
 * APIGames membalas `status: 0` dengan pesan ini kalau akunnya nggak ada
 * (bukan error kredensial). Diperlakukan sebagai "ID tidak valid" supaya
 * UI bisa kasih pesan ramah dan hasilnya di-cache (hemat biaya cek).
 */
export function isApigamesInvalidAccountMessage(message: string): boolean {
  return /invalid user|invalid.*(zone|server)|user id.*(not found|invalid)|not found|tidak ditemukan/i.test(
    message
  )
}

/**
 * GET /merchant/{merchant_id}/cek-username/{game_code}?user_id=&signature=
 * Saat ini APIGames hanya mendukung game_code `mobilelegend` dan `freefire`.
 * Mobile Legends butuh Zone ID (`zone_id`) supaya akunnya unik; Free Fire tidak.
 */
export async function checkApigamesUsername({
  gameCode,
  userId,
  zoneId,
}: {
  gameCode: string
  userId: string
  zoneId?: string
}): Promise<ApigamesCheckResult> {
  if (!MERCHANT_ID || !SECRET_KEY) return { ok: false, error: "APIGAMES belum dikonfigurasi" }
  if (!isApigamesGameCode(gameCode)) {
    return { ok: false, error: `Cek ID belum didukung untuk game ${gameCode}` }
  }

  try {
    type CheckPayload = {
      status?: number
      message?: string
      error_msg?: string
      data?: { is_valid?: boolean; username?: string }
    }
    let data: CheckPayload | null = null
    for (const signature of apigamesGeneralSignatureCandidates()) {
      const query = new URLSearchParams({ user_id: userId, signature })
      const cleanZone = zoneId?.trim()
      if (cleanZone) query.set("zone_id", cleanZone)
      data = await apigamesGet<CheckPayload>(
        `/merchant/${encodeURIComponent(MERCHANT_ID)}/cek-username/${encodeURIComponent(gameCode)}?${query}`
      )
      if (data?.status === 1 || !isSignatureError(data?.error_msg ?? data?.message)) break
    }

    if (!data || data.status !== 1) {
      const message = data?.error_msg ?? data?.message ?? "APIGames menolak cek ID"
      if (isApigamesInvalidAccountMessage(message)) {
        return { ok: true, valid: false, message }
      }
      return { ok: false, error: message }
    }
    const username =
      typeof data.data?.username === "string" ? data.data.username.trim() : ""
    return {
      ok: true,
      // Provider pernah balas is_valid:true + username kosong untuk ID
      // sampah. Tanpa nickname, hasilnya belum bisa dipercaya.
      valid: Boolean(data.data?.is_valid) && username.length > 0,
      username: username || undefined,
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "APIGames: cek ID gagal",
    }
  }
}
