import type { Denomination } from "./catalog"

/**
 * Logika harga & pemilihan nominal order yang murni (tanpa DB/provider),
 * dipakai route checkout dan test regresi.
 */

export type StoneVariantLike = {
  id: number
  name: string
  price: number
}

export type ResolvedOrderDenom = {
  denom:
    | {
        id: string
        label: string
        price: number
      }
    | undefined
  stoneVariant: StoneVariantLike | null
}

/**
 * Pilih varian provider berdasarkan id. Kalau id sudah nggak ada (cache 60s
 * berubah), fallback ke harga terdekat dalam toleransi 30%, lalu varian
 * aktif pertama. Fallback harga cuma untuk id numerik provider.
 */
export function resolveOrderDenom({
  denomId,
  localDenom,
  stoneVariants,
  stoneMode,
}: {
  denomId: string
  localDenom?: Denomination
  stoneVariants: StoneVariantLike[]
  stoneMode: boolean
}): ResolvedOrderDenom {
  const normalizedId = String(denomId ?? "")
  let stoneVariant =
    stoneVariants.find((v) => String(v.id) === normalizedId) ?? null

  if (
    !stoneVariant &&
    stoneMode &&
    localDenom &&
    /^\d+$/.test(normalizedId.trim())
  ) {
    let bestDiff = Number.POSITIVE_INFINITY
    let best: StoneVariantLike | undefined

    for (const variant of stoneVariants) {
      const diff = Math.abs(variant.price - localDenom.price)
      if (diff <= localDenom.price * 0.3 && diff < bestDiff) {
        best = variant
        bestDiff = diff
      }
    }

    stoneVariant = best ?? stoneVariants[0] ?? null
  }

  return {
    denom: stoneVariant
      ? {
          id: String(stoneVariant.id),
          label: stoneVariant.name,
          price: stoneVariant.price,
        }
      : localDenom,
    stoneVariant,
  }
}

/** Order manual: kupon benar-benar mengurangi nominal yang dibayar. */
export function manualOrderAmount(subtotal: number, discount = 0): number {
  return Math.max(0, subtotal - Math.max(0, discount))
}

/**
 * Order Gamestone: nominal QRIS mengikuti total provider. Kalau provider
 * tidak mengirim total, pakai subtotal dikurangi cashback/diskon.
 */
export function stoneOrderAmount(
  stoneTotal: number | undefined,
  subtotal: number,
  discount = 0
): number {
  return typeof stoneTotal === "number" && Number.isFinite(stoneTotal)
    ? stoneTotal
    : manualOrderAmount(subtotal, discount)
}
