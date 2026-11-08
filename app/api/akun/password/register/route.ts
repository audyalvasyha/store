import { NextResponse } from "next/server"
import {
  CUSTOMER_COOKIE,
  CUSTOMER_COOKIE_MAX_AGE,
  normalizeEmail,
  registerCustomerWithPassword,
  validatePassword,
} from "@/lib/customer-auth"
import { clientIp, rateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const NO_STORE = { "Cache-Control": "no-store" }

export async function POST(request: Request) {
  const ipLimit = await rateLimit("akun-password-register-ip", clientIp(request), 10, 10 * 60_000)
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${ipLimit.retryAfter} detik.` },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(ipLimit.retryAfter) } }
    )
  }

  try {
    const body = await request.json()
    const email = normalizeEmail(String(body?.email ?? ""))
    const password = typeof body?.password === "string" ? body.password : ""
    const code = String(body?.code ?? "").replace(/\D/g, "")

    if (!email) {
      return NextResponse.json({ error: "Email tidak valid." }, { status: 400, headers: NO_STORE })
    }
    const passwordError = validatePassword(password)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400, headers: NO_STORE })
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Kode harus 6 angka." }, { status: 400, headers: NO_STORE })
    }

    const emailLimit = await rateLimit(
      "akun-password-register-email",
      email,
      5,
      10 * 60_000
    )
    if (!emailLimit.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan. Coba lagi dalam ${emailLimit.retryAfter} detik.` },
        { status: 429, headers: { ...NO_STORE, "Retry-After": String(emailLimit.retryAfter) } }
      )
    }

    const token = await registerCustomerWithPassword(email, code, password)
    const res = NextResponse.json({ ok: true }, { headers: NO_STORE })
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
      { error: err instanceof Error ? err.message : "Gagal membuat password. Coba lagi." },
      { status: 400, headers: NO_STORE }
    )
  }
}
