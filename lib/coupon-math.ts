/**
 * Perhitungan potongan kupon murni (tanpa DB) — dipakai checkout dan test.
 *
 * - percent: persentase dari subtotal, dibatasi maxDiscount kalau ada.
 * - fixed: nominal Rupiah.
 * - Hasil selalu 0..subtotal, jadi kupon nggak bisa bikin total negatif.
 */
export type CouponRule = {
  kind: "percent" | "fixed"
  value: number
  maxDiscount?: number
}

export function calculateCouponDiscount(rule: CouponRule, amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0
  if (!Number.isFinite(rule.value) || rule.value <= 0) return 0

  let discount =
    rule.kind === "percent"
      ? Math.floor((amount * rule.value) / 100)
      : Math.floor(rule.value)

  if (rule.kind === "percent" && rule.maxDiscount !== undefined) {
    discount = Math.min(discount, Math.max(0, rule.maxDiscount))
  }

  return Math.max(0, Math.min(discount, amount))
}
