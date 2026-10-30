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
