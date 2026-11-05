import { NextResponse } from "next/server"
import { checkCoupon } from "@/lib/coupons"
import { clientIp, rateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

/**
 * GET /api/coupons/quote?code=GASHEMAT&gameSlug=mobile-legends&amount=39000
 * Preview nilai kupon untuk UI checkout. Read-only — kuota belum dicatat;
 * konsumsi beneran terjadi di POST /api/orders (atomik + guarded).
 */
export async function GET(request: Request) {
  const readLimit = await rateLimit("coupon-quote", clientIp(request), 30, 60_000)
  if (!readLimit.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi sebentar." },
      { status: 429, headers: { "Retry-After": String(readLimit.retryAfter) } }
    )
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code") ?? ""
  const gameSlug = searchParams.get("gameSlug") ?? ""
  const amount = Number(searchParams.get("amount"))

  if (!gameSlug || !Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: "Parameter tidak valid" }, { status: 400 })
  }

  let result
  try {
    result = await checkCoupon(code, { gameSlug, amount })
  } catch {
    // DB kupon nggak bisa diakses — checkout jangan 500, surinta user coba lagi.
    return NextResponse.json(
      { error: "Sistem kupon lagi sibuk, coba lagi sebentar." },
      { status: 503 }
    )
  }
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  // Jangan bocorin detail dokumen kupon (kuota, dsb.) ke publik —
  // cuma angka yang user butuh buat keputusan checkout.
  return NextResponse.json({ code: result.coupon.code, discount: result.discount })
}
