import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  CUSTOMER_COOKIE,
  getCustomerIdentity,
  updateCustomerName,
  type CustomerIdentity,
} from "@/lib/customer-auth"
import { clientIp, rateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const NO_STORE = { "Cache-Control": "no-store" }
/** Huruf/angka + spasi, titik, apostrof, underscore, strip. 2–40 karakter. */
const NAME_EXP = /^[\p{L}\p{N} .'_-]{2,40}$/u

export async function POST(request: Request) {
  const limit = await rateLimit("akun-profile", clientIp(request), 10, 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Terlalu sering. Coba lagi sebentar." },
      { status: 429, headers: NO_STORE }
    )
  }

  const jar = await cookies()
  let identity: CustomerIdentity | null = null
  try {
    identity = await getCustomerIdentity(jar.get(CUSTOMER_COOKIE)?.value)
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
    const raw = typeof body?.name === "string" ? body.name : ""
    // Rapikan spasi ganda + batasi panjang; kosong = hapus nama tampilan.
    const name = raw.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim()
    if (name && !NAME_EXP.test(name)) {
      return NextResponse.json(
        { error: "Nama 2–40 karakter: huruf, angka, spasi, titik, apostrof, _ atau -." },
        { status: 400, headers: NO_STORE }
      )
    }

    await updateCustomerName(identity, name || undefined)
    return NextResponse.json({ ok: true, name: name || null }, { headers: NO_STORE })
  } catch {
    return NextResponse.json(
      { error: "Gagal menyimpan profil. Coba lagi." },
      { status: 503, headers: NO_STORE }
    )
  }
}
