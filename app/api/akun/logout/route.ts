import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { CUSTOMER_COOKIE, logoutCustomer } from "@/lib/customer-auth"

export const dynamic = "force-dynamic"

export async function POST() {
  const jar = await cookies()
  await logoutCustomer(jar.get(CUSTOMER_COOKIE)?.value)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(CUSTOMER_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 })
  return res
}
