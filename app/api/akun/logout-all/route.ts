import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  CUSTOMER_COOKIE,
  getCustomerIdentity,
  logoutCustomerEverywhere,
} from "@/lib/customer-auth"

export const dynamic = "force-dynamic"

export async function POST() {
  const jar = await cookies()
  // Walau DB bermasalah, cookie tetap harus dibersihkan dari browser ini.
  const identity = await getCustomerIdentity(jar.get(CUSTOMER_COOKIE)?.value).catch(() => null)
  if (identity) await logoutCustomerEverywhere(identity).catch(() => null)

  const res = NextResponse.json({ ok: true })
  res.cookies.set(CUSTOMER_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
  return res
}
