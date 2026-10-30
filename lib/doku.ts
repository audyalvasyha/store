import crypto from "node:crypto"

const CLIENT_ID = process.env.DOKU_CLIENT_ID
const SECRET_KEY = process.env.DOKU_SECRET_KEY
const BASE_URL = process.env.DOKU_BASE_URL ?? "https://api-sandbox.doku.com"

const TARGET = "/checkout/v1/payment"

export function dokuConfigured(): boolean {
  return Boolean(CLIENT_ID && SECRET_KEY)
}

function hmac(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload, "utf8").digest("base64")
}

function digestOf(bodyText: string): string {
  return crypto.createHash("sha256").update(bodyText, "utf8").digest("base64")
}

type CheckoutArgs = {
  invoiceNumber: string
  amount: number
  callbackUrl: string
}

export type DokuCheckoutResult =
  | { ok: true; paymentUrl: string }
  | { ok: false; error: string }

export async function createDokuCheckout(args: CheckoutArgs): Promise<DokuCheckoutResult> {
  if (!CLIENT_ID || !SECRET_KEY) {
    return { ok: false, error: "DOKU belum dikonfigurasi" }
  }

  const body = {
    order: {
      amount: args.amount,
      invoice_number: args.invoiceNumber,
      callback_url: args.callbackUrl,
      auto_redirect: true,
    },
    payment: {
      payment_method_types: ["QRIS", "VIRTUAL_ACCOUNT_BCA", "VIRTUAL_ACCOUNT_BRI", "VIRTUAL_ACCOUNT_MANDIRI", "VIRTUAL_ACCOUNT_BNI"],
    },
  }
  const bodyText = JSON.stringify(body)
  const requestId = crypto.randomUUID()
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z")

  const rawSignature = [
    `Client-Id:${CLIENT_ID}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${timestamp}`,
    `Request-Target:${TARGET}`,
    `Digest:${digestOf(bodyText)}`,
  ].join("\n")

  const signature = `HMACSHA256=${hmac(SECRET_KEY, rawSignature)}`

  try {
    const res = await fetch(`${BASE_URL}${TARGET}`, {
      method: "POST",
      headers: {
        "Client-Id": CLIENT_ID,
        "Request-Id": requestId,
        "Request-Timestamp": timestamp,
        Signature: signature,
        "Content-Type": "application/json",
      },
      body: bodyText,
    })

    const data = (await res.json().catch(() => null)) as
      | { message?: string | string[]; payment?: { url?: string } }
      | null

    if (!res.ok) {
      const message = Array.isArray(data?.message) ? data?.message.join(", ") : data?.message
      return { ok: false, error: message ?? `DOKU error ${res.status}` }
    }

    const paymentUrl = data?.payment?.url
    if (!paymentUrl) return { ok: false, error: "DOKU tidak mengembalikan payment URL" }
    return { ok: true, paymentUrl }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "DOKU request gagal" }
  }
}

type NotificationArgs = {
  headers: Headers
  rawBody: string
  targetPath: string
}

export function verifyDokuNotification({ headers, rawBody, targetPath }: NotificationArgs): boolean {
  if (!CLIENT_ID || !SECRET_KEY) return false

  const clientId = headers.get("client-id") ?? ""
  const requestId = headers.get("request-id") ?? ""
  const timestamp = headers.get("request-timestamp") ?? ""
  const incoming = headers.get("signature") ?? ""
  if (!clientId || !requestId || !timestamp || !incoming) return false
  if (clientId !== CLIENT_ID) return false

  const rawSignature = [
    `Client-Id:${clientId}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${timestamp}`,
    `Request-Target:${targetPath}`,
    `Digest:${digestOf(rawBody)}`,
  ].join("\n")

  const expected = `HMACSHA256=${hmac(SECRET_KEY, rawSignature)}`
  const a = Buffer.from(expected)
  const b = Buffer.from(incoming)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
