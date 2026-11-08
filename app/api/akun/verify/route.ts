import { NextResponse } from "next/server"
import {
  CUSTOMER_COOKIE,
  CUSTOMER_COOKIE_MAX_AGE,
  normalizeIdentifier,
  verifyCustomerLogin,
  type LoginKind,
} from "@/lib/customer-auth"
import { clientIp, rateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

/** Verifikasi kode OTP (email/WA) → bikin sesi login (cookie httpOnly). */
export async function POST(request: Request) {
  const ipLimit = await rateLimit("akun-verify-ip", clientIp(request), 20, 10 * 60_000)
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${ipLimit.retryAfter} detik.` },
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
    const code = String(body?.code ?? "").replace(/\D/g, "")

    if (!identifier) {
      return NextResponse.json(
        { error: kind === "email" ? "Email tidak valid" : "Nomor WhatsApp tidak valid" },
        { status: 400 }
      )
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Kode harus 6 angka" }, { status: 400 })
    }

    const token = await verifyCustomerLogin({ kind, identifier }, code)
    const res = NextResponse.json({ ok: true })
    res.cookies.set(CUSTOMER_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: CUSTOMER_COOKIE_MAX_AGE,
    })
    return res
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verifikasi gagal. Coba lagi." },
      { status: 400 }
    )
  }
}
