import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  CUSTOMER_COOKIE,
  getCustomerIdentity,
  getCustomerProfile,
  maskIdentity,
} from "@/lib/customer-auth"
import { clientIp, rateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const NO_STORE = { "Cache-Control": "no-store" }

/**
 * Info sesi buat header: `{ kind, masked, name, avatarUrl }`.
 * Email/nomor asli TIDAK pernah dikirim ke client — cukup versi tersamar.
 */
export async function GET(request: Request) {
  const limit = await rateLimit("akun-me", clientIp(request), 600, 60_000)
  if (!limit.ok) {
    return NextResponse.json({ user: null }, { status: 429, headers: NO_STORE })
  }

  try {
    const jar = await cookies()
    const identity = await getCustomerIdentity(jar.get(CUSTOMER_COOKIE)?.value)
    if (!identity) return NextResponse.json({ user: null }, { headers: NO_STORE })

    const profile = await getCustomerProfile(identity)
    return NextResponse.json(
      {
        user: {
          kind: identity.kind,
          provider: identity.provider ?? null,
          masked: maskIdentity(identity),
          name: profile?.name ?? null,
          avatarUrl: profile?.avatarUrl ?? null,
        },
      },
      { headers: NO_STORE }
    )
  } catch {
    // 503 biar AuthNav bisa bedain "DB lagi error" dari "memang belum login".
    return NextResponse.json(
      { error: "Sesi akun lagi nggak bisa dicek." },
      { status: 503, headers: NO_STORE }
    )
  }
}
