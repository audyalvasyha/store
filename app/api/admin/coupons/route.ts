import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getAdminEmail, SESSION_COOKIE } from "@/lib/admin-auth"
import {
  COUPON_CODE_EXP,
  deleteCoupon,
  listCoupons,
  normalizeCouponCode,
  upsertCoupon,
  type CouponDoc,
  type CouponKind,
} from "@/lib/coupons"

export const dynamic = "force-dynamic"

async function requireAdmin(): Promise<string | null> {
  const jar = await cookies()
  return getAdminEmail(jar.get(SESSION_COOKIE)?.value)
}

/**
 * Sanitasi payload kupon dari form admin (JSON). `usedCount` & `createdAt`
 * di-skip sengaja — upsertCoupon jaga nilai lama.
 */
function sanitizeCoupon(input: unknown): Omit<CouponDoc, "usedCount" | "createdAt"> | null {
  if (typeof input !== "object" || input === null) return null
  const raw = input as Record<string, unknown>

  const code = normalizeCouponCode(raw.code)
  if (!COUPON_CODE_EXP.test(code)) return null

  const kind = String(raw.kind ?? "") === "percent" ? "percent" : String(raw.kind ?? "") === "fixed" ? "fixed" : null
  if (!kind) return null

  const value = Math.floor(Number(raw.value))
  if (!Number.isFinite(value)) return null
  if (kind === "percent" && (value < 1 || value > 100)) return null
  if (kind === "fixed" && value < 500) return null // nominal Rupiah minimal masuk akal

  const minSpend = Math.floor(Number(raw.minSpend ?? 0))
  if (!Number.isInteger(minSpend) || minSpend < 0) return null

  const gameSlugRaw = String(raw.gameSlug ?? "").trim()
  if (gameSlugRaw && !/^[a-z0-9-]{2,48}$/.test(gameSlugRaw)) return null

  const maxDiscountRaw = raw.maxDiscount
  const maxDiscount =
    kind === "percent" && maxDiscountRaw !== undefined && maxDiscountRaw !== null && maxDiscountRaw !== ""
      ? Math.floor(Number(maxDiscountRaw))
      : undefined
  if (maxDiscount !== undefined && (!Number.isInteger(maxDiscount) || maxDiscount < 500)) return null

  const usageLimitRaw = raw.usageLimit
  const usageLimit =
    usageLimitRaw !== undefined && usageLimitRaw !== null && usageLimitRaw !== ""
      ? Math.floor(Number(usageLimitRaw))
      : undefined
  if (usageLimit !== undefined && (!Number.isInteger(usageLimit) || usageLimit < 1)) return null

  const expiresDays = Math.floor(Number(raw.expiresDays ?? 0))
  if (!Number.isInteger(expiresDays) || expiresDays < 0 || expiresDays > 365) return null

  const coupon: Omit<CouponDoc, "usedCount" | "createdAt"> = {
    code,
    kind: kind as CouponKind,
    value,
    minSpend,
    gameSlug: gameSlugRaw || undefined,
    maxDiscount,
    usageLimit,
    expiresAt: expiresDays > 0 ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString() : undefined,
    active: raw.active === undefined ? true : Boolean(raw.active),
  }
  return coupon
}

export async function GET() {
  const email = await requireAdmin()
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json({ coupons: await listCoupons() })
}

export async function POST(request: Request) {
  const email = await requireAdmin()
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const coupon = sanitizeCoupon(body?.coupon)
    if (!coupon) {
      return NextResponse.json(
        {
          error:
            "Data kupon nggak valid: kode 3-24 [A-Z0-9_-], kind percent (1-100) / fixed (>=500), minSpend >= 0, expiresDays 0-365.",
        },
        { status: 400 }
      )
    }
    await upsertCoupon(coupon)
    // Banner promo di landing dibaca dari kupon global aktif.
    revalidatePath("/")
    return NextResponse.json({ ok: true, code: coupon.code })
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan kupon" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const email = await requireAdmin()
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const code = normalizeCouponCode(new URL(request.url).searchParams.get("code"))
  if (!COUPON_CODE_EXP.test(code)) {
    return NextResponse.json({ error: "Kode kupon tidak valid" }, { status: 400 })
  }
  await deleteCoupon(code)
  revalidatePath("/")
  return NextResponse.json({ ok: true })
}
