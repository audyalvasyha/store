import { NextResponse } from "next/server"
import {
  normalizeIdentifier,
  startCustomerLogin,
  type LoginKind,
} from "@/lib/customer-auth"
import { clientIp, rateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

/**
 * Kirim kode login. `channel` = "email" (Resend) atau "wa" (Fonnte).
 * Rate limit: 10/10menit per IP, 3/10menit per identitas.
 */
export async function POST(request: Request) {
  const ipLimit = await rateLimit("akun-otp-ip", clientIp(request), 10, 10 * 60_000)
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak permintaan. Coba lagi dalam ${ipLimit.retryAfter} detik.` },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter) } }
    )
  }

  try {
    const body = await request.json()
    const kind: LoginKind = body?.channel === "wa" ? "phone" : "email"
    const identifier = normalizeIdentifier(
      kind,
      String(body?.value ?? body?.email ?? body?.phone ?? "")
    )
    if (!identifier) {
      return NextResponse.json(
        {
          error:
            kind === "email"
              ? "Alamat email tidak valid."
              : "Nomor WhatsApp tidak valid. Contoh: 081234567890",
        },
        { status: 400 }
      )
    }

    const limit = await rateLimit(
      kind === "email" ? "akun-otp-email" : "akun-otp-phone",
      identifier,
      3,
      10 * 60_000
    )
    if (!limit.ok) {
      return NextResponse.json(
        {
          error: `Kode baru bisa dikirim lagi dalam ${limit.retryAfter} detik. Cek ${
            kind === "email" ? "inbox/spam email" : "WhatsApp"
          } dulu.`,
        },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      )
    }

    await startCustomerLogin({ kind, identifier })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengirim kode. Coba lagi." },
      { status: 503 }
    )
  }
}
