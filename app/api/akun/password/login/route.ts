import { NextResponse } from "next/server"
import {
  CUSTOMER_COOKIE,
  CUSTOMER_COOKIE_MAX_AGE,
  loginCustomerWithPassword,
} from "@/lib/customer-auth"
import { clientIp, rateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const NO_STORE = { "Cache-Control": "no-store" }
const GENERIC_ERROR = "Email atau password salah."

export async function POST(request: Request) {
  const ipLimit = await rateLimit("akun-password-login-ip", clientIp(request), 20, 10 * 60_000)
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${ipLimit.retryAfter} detik.` },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(ipLimit.retryAfter) } }
    )
  }

  let email = ""
  let password = ""
  try {
    const body = await request.json()
    email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
    password = typeof body?.password === "string" ? body.password : ""
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401, headers: NO_STORE })
  }

  if (!email || !password || password.length > 128) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401, headers: NO_STORE })
  }

  const emailLimit = await rateLimit("akun-password-login-email", email, 10, 10 * 60_000)
  if (!emailLimit.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${emailLimit.retryAfter} detik.` },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(emailLimit.retryAfter) } }
    )
  }

  try {
    const token = await loginCustomerWithPassword(email, password)
    const res = NextResponse.json({ ok: true }, { headers: NO_STORE })
    res.cookies.set(CUSTOMER_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: CUSTOMER_COOKIE_MAX_AGE,
    })
    return res
  } catch {
    // Jangan bocorin apakah email terdaftar, belum punya password, atau salah.
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401, headers: NO_STORE })
  }
}
