import { getDb, ensureIndexes } from "./mongodb"

/**
 * Kupon promo GASTROS.
 *
 * ⚠️ Dua makna "discount" tergantung jalur pembayaran:
 * - Order MANUAL / katalog lokal → diskon beneran: `order.amount` (yang
 *   harus dibayar ke CS) langsung dikurangi.
 * - Order Gamestone → QRIS dibikin provider dengan nominal fix, jadi nilai
 *   kupon jadi CASHBACK: order dibayar penuh ke provider, potongan
 *   di-transfer CS setelah order SELESAI (dicatat di `order.discount`).
 */
export type CouponKind = "percent" | "fixed"

export type CouponDoc = {
  /** Kode kupon uppercase, unik. */
  code: string
  kind: CouponKind
  /** percent: 1..100. fixed: nominal Rupiah (integer). */
  value: number
  /** Batasi kupon ke 1 game (slug katalog). Kosong = global. */
  gameSlug?: string
  /** Minimal subtotal (Rupiah) biar kupon bisa dipakai. */
  minSpend: number
  /** Cap potongan kupon percent (Rupiah). Hanya buat kind percent. */
  maxDiscount?: number
  /** Maks pemakaian total. Kosong = unlimited. */
  usageLimit?: number
  usedCount: number
  /** Kadaluarsa (ISO). Kosong = selamanya. */
  expiresAt?: string
  active: boolean
  createdAt: string
}

export const COUPON_CODE_EXP = /^[A-Z0-9_-]{3,24}$/

export function normalizeCouponCode(raw: unknown): string {
  return String(raw ?? "").trim().toUpperCase()
}

export type CouponCheck =
  | { coupon: CouponDoc; discount: number }
  | { error: string }

/**
 * Validasi kode kupon bersama konteks order: aktif, kadaluarsa, kuota,
 * batasan game, minSpend — lalu hitung potongannya (discapped ke subtotal).
 * Pure read: nggak mutasi kuota (konsumsi lewat `consumeCoupon`).
 */
export async function checkCoupon(
  rawCode: unknown,
  ctx: { gameSlug: string; amount: number }
): Promise<CouponCheck> {
  const code = normalizeCouponCode(rawCode)
  if (!COUPON_CODE_EXP.test(code)) return { error: "Format kode kupon nggak valid" }
  if (!Number.isInteger(ctx.amount) || ctx.amount <= 0) {
    return { error: "Nominal order nggak valid buat kupon" }
  }

  await ensureIndexes()
  const db = await getDb()
  const coupon = await db.collection<CouponDoc>("coupons").findOne({ code })
  if (!coupon) return { error: "Kode kupon nggak ada" }
  if (!coupon.active) return { error: "Kupon lagi nonaktif" }
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
    return { error: "Kupon udah kadaluarsa" }
  }
  if (coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) {
    return { error: "Kuota pemakaian kupon udah habis" }
  }
  if (coupon.gameSlug && coupon.gameSlug !== ctx.gameSlug) {
    return { error: "Kupon ini khusus game lain" }
  }
  if (ctx.amount < coupon.minSpend) {
    return {
      error: `Kupon butuh min. belanja Rp ${coupon.minSpend.toLocaleString("id-ID")}`,
    }
  }

  let discount =
    coupon.kind === "percent"
      ? Math.floor((ctx.amount * coupon.value) / 100)
      : coupon.value
  if (coupon.kind === "percent" && coupon.maxDiscount !== undefined) {
    discount = Math.min(discount, coupon.maxDiscount)
  }
  discount = Math.min(discount, ctx.amount)
  if (discount <= 0) return { error: "Nilai potongan kupon jadi 0" }
  return { coupon, discount }
}

/**
 * Pakai 1 kuota kupon secara atomik (guard kuota di kondisi update).
 * Return false kalau bersamaan kuotanya barusan habis — caller treat
 * kupon itu invalid, order jalan tanpa kupon.
 */
export async function consumeCoupon(code: string): Promise<boolean> {
  await ensureIndexes()
  const db = await getDb()
  const res = await db.collection<CouponDoc>("coupons").updateOne(
    {
      code,
      active: true,
      $or: [
        { usageLimit: { $exists: false } },
        { usageLimit: { $type: "null" } },
        { $expr: { $lt: ["$usedCount", "$usageLimit"] } },
      ],
    },
    { $inc: { usedCount: 1 } }
  )
  return res.modifiedCount === 1
}

export async function listCoupons(): Promise<CouponDoc[]> {
  await ensureIndexes()
  const db = await getDb()
  return db
    .collection<CouponDoc>("coupons")
    .find()
    .sort({ createdAt: -1 })
    .toArray()
}

/**
 * Upsert kupon dari admin. usedCount & createdAt TIDAK di-reset saat
 * edit (count pemakaian nggak boleh ilang karena admin ngedit kode).
 */
export async function upsertCoupon(
  coupon: Omit<CouponDoc, "usedCount" | "createdAt">
): Promise<void> {
  await ensureIndexes()
  const db = await getDb()
  const { usedCount: _u, createdAt: _c, ...fields } = coupon as CouponDoc
  void _u
  void _c
  await db
    .collection<CouponDoc>("coupons")
    .updateOne(
      { code: coupon.code },
      {
        $set: fields,
        $setOnInsert: { usedCount: 0, createdAt: new Date().toISOString() },
      },
      { upsert: true }
    )
}

export async function deleteCoupon(code: string): Promise<void> {
  await ensureIndexes()
  const db = await getDb()
  await db.collection<CouponDoc>("coupons").deleteOne({ code })
}
