import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  CUSTOMER_COOKIE,
  changeCustomerPassword,
  getCustomerIdentity,
  revokeOtherCustomerSessions,
  type CustomerIdentity,
} from "@/lib/customer-auth"
import { clientIp, rateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const NO_STORE = { "Cache-Control": "no-store" }

export async function POST(request: Request) {
  const limit = await rateLimit("akun-password-change", clientIp(request), 10, 10 * 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${limit.retryAfter} detik.` },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(limit.retryAfter) } }
    )
  }

  const jar = await cookies()
  const token = jar.get(CUSTOMER_COOKIE)?.value
  let identity: CustomerIdentity | null = null
  try {
    identity = await getCustomerIdentity(token)
  } catch {
    return NextResponse.json(
      { error: "Sesi akun lagi nggak bisa dicek. Coba lagi." },
      { status: 503, headers: NO_STORE }
    )
  }
  if (!identity) {
    return NextResponse.json(
      { error: "Sesi habis. Masuk lagi ya." },
      { status: 401, headers: NO_STORE }
    )
  }

  try {
    const body = await request.json()
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : ""
    const currentPassword =
      typeof body?.currentPassword === "string" ? body.currentPassword : undefined
    await changeCustomerPassword(identity, newPassword, currentPassword)
    // Sesi di perangkat lain tidak boleh tetap hidup dengan password lama.
    if (token) await revokeOtherCustomerSessions(identity, token)
    return NextResponse.json({ ok: true }, { headers: NO_STORE })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menyimpan password." },
      { status: 400, headers: NO_STORE }
    )
  }
}
