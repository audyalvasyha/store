import { NextResponse } from "next/server"
import {
  CUSTOMER_COOKIE,
  CUSTOMER_COOKIE_MAX_AGE,
  loginCustomerWithGoogle,
} from "@/lib/customer-auth"
import { verifyGoogleCredential } from "@/lib/google-auth"
import { clientIp, rateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const NO_STORE = { "Cache-Control": "no-store" }

/** Login via Google Identity Services (ID token), bukan OAuth redirect. */
export async function POST(request: Request) {
  const ipLimit = await rateLimit("akun-google-ip", clientIp(request), 20, 10 * 60_000)
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${ipLimit.retryAfter} detik.` },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(ipLimit.retryAfter) } }
    )
  }

  try {
    const body = await request.json()
    const credential = typeof body?.credential === "string" ? body.credential : ""
    const verified = await verifyGoogleCredential(credential)
    if (!verified.ok) {
      return NextResponse.json(
        { error: verified.error },
        { status: verified.status, headers: NO_STORE }
      )
    }

    const emailLimit = await rateLimit(
      "akun-google-email",
      verified.email,
      10,
      10 * 60_000
    )
    if (!emailLimit.ok) {
      return NextResponse.json(
        { error: "Terlalu sering login. Coba lagi sebentar." },
        { status: 429, headers: { ...NO_STORE, "Retry-After": String(emailLimit.retryAfter) } }
      )
    }

    const token = await loginCustomerWithGoogle(verified.email, verified.picture)
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
    return NextResponse.json(
      { error: "Login Google gagal. Coba lagi." },
      { status: 503, headers: NO_STORE }
    )
  }
}
