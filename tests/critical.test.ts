import test from "node:test"
import assert from "node:assert/strict"
import { calculateCouponDiscount } from "../lib/coupon-math"
import {
  manualOrderAmount,
  resolveOrderDenom,
  stoneOrderAmount,
} from "../lib/order-pricing"
import { GAMES, filterGames } from "../lib/catalog"

test("kupon persen dihitung dari subtotal", () => {
  assert.equal(
    calculateCouponDiscount({ kind: "percent", value: 10 }, 19_500),
    1_950
  )
})

test("kupon persen dibatasi maxDiscount", () => {
  assert.equal(
    calculateCouponDiscount(
      { kind: "percent", value: 50, maxDiscount: 1_000 },
      19_500
    ),
    1_000
  )
})

test("kupon nominal tidak bisa melebihi subtotal", () => {
  assert.equal(
    calculateCouponDiscount({ kind: "fixed", value: 50_000 }, 19_500),
    19_500
  )
  assert.equal(
    calculateCouponDiscount({ kind: "fixed", value: 5_000 }, 0),
    0
  )
})

test("harga order manual mengurangi diskon dan tidak negatif", () => {
  assert.equal(manualOrderAmount(19_500, 1_500), 18_000)
  assert.equal(manualOrderAmount(19_500, 25_000), 0)
})

test("total Gamestone memakai total provider, fallback ke subtotal-diskon", () => {
  assert.equal(stoneOrderAmount(42_000, 19_500, 1_500), 42_000)
  assert.equal(stoneOrderAmount(undefined, 19_500, 1_500), 18_000)
})

test("nominal provider dipilih berdasarkan id", () => {
  const local = GAMES[0].denominations[0]
  const variants = [
    { id: 11, name: "Varian A", price: 20_000 },
    { id: 12, name: "Varian B", price: 40_000 },
  ]
  const result = resolveOrderDenom({
    denomId: "12",
    localDenom: local,
    stoneVariants: variants,
    stoneMode: true,
  })
  assert.equal(result.stoneVariant?.id, 12)
  assert.deepEqual(result.denom, {
    id: "12",
    label: "Varian B",
    price: 40_000,
  })
})

test("fallback provider memilih harga terdekat dalam toleransi 30%", () => {
  const local = GAMES[0].denominations[0]
  const variants = [
    { id: 21, name: "Terlalu mahal", price: 60_000 },
    { id: 22, name: "Paling dekat", price: 20_000 },
    { id: 23, name: "Sedikit lebih mahal", price: 21_000 },
  ]
  const result = resolveOrderDenom({
    denomId: "999",
    localDenom: local,
    stoneVariants: variants,
    stoneMode: true,
  })
  assert.equal(result.stoneVariant?.id, 22)
})

test("fallback harga tidak dipakai untuk id katalog lokal", () => {
  const local = GAMES[0].denominations[0]
  const result = resolveOrderDenom({
    denomId: local.id,
    localDenom: local,
    stoneVariants: [{ id: 31, name: "Varian", price: 20_000 }],
    stoneMode: true,
  })
  assert.equal(result.stoneVariant, null)
  assert.equal(result.denom?.id, local.id)
})

test("search katalog case-insensitive dan aman untuk query kosong", () => {
  assert.equal(filterGames(GAMES, "VALORANT").length, 1)
  assert.equal(filterGames(GAMES, "  ").length, GAMES.length)
})
