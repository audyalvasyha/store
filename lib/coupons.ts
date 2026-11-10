import { getDb, ensureIndexes } from "./mongodb"
import { calculateCouponDiscount } from "./coupon-math"

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

  const discount = calculateCouponDiscount(coupon, ctx.amount)
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

/** Data kupon aman untuk ditampilkan publik — tanpa kuota/pemakaian. */
export type PublicCoupon = {
  code: string
  kind: CouponKind
  value: number
  minSpend: number
  maxDiscount?: number
  expiresAt?: string
}

/**
 * Kupon global aktif terbaik buat banner promo landing. Cuma kupon tanpa
 * batasan game yang dipertimbangkan; kalau nggak ada, banner nggak tampil.
 */
export async function getFeaturedCoupon(): Promise<PublicCoupon | null> {
  try {
    await ensureIndexes()
    const db = await getDb()
    const docs = await db
      .collection<CouponDoc>("coupons")
      .find({ active: true })
      .limit(50)
      .toArray()

    const now = Date.now()
    const usable = docs.filter(
      (coupon) =>
        !coupon.gameSlug &&
        (!coupon.expiresAt || new Date(coupon.expiresAt).getTime() > now) &&
        (coupon.usageLimit === undefined || coupon.usedCount < coupon.usageLimit)
    )

    // Bandingkan potongan pada nominal contoh yang memenuhi minSpend.
    usable.sort((a, b) => {
      const sample = (coupon: CouponDoc) => Math.max(coupon.minSpend, 50_000)
      return calculateCouponDiscount(b, sample(b)) - calculateCouponDiscount(a, sample(a))
    })

    const best = usable[0]
    if (!best) return null
    return {
      code: best.code,
      kind: best.kind,
      value: best.value,
      minSpend: best.minSpend,
      maxDiscount: best.maxDiscount,
      expiresAt: best.expiresAt,
    }
  } catch {
    // DB down: landing tetap jalan tanpa banner promo.
    return null
  }
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
