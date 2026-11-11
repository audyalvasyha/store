import test from "node:test"
import assert from "node:assert/strict"
import { calculateCouponDiscount } from "../lib/coupon-math"
import {
  manualOrderAmount,
  resolveOrderDenom,
  stoneOrderAmount,
} from "../lib/order-pricing"
import { GAMES, filterGames, lowestPrice, toCatalogGame } from "../lib/catalog"
import { resolveGameGenres } from "../lib/game-genres"
import { normalizeAdsenseClient, normalizeAdSlot } from "../lib/ads"
import {
  MAX_AVATAR_BYTES,
  validateAvatarDataUrl,
} from "../lib/avatar-data"

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

test("katalog ringkas tidak membawa denominations dan harga tetap sama", () => {
  const full = GAMES[0]
  const lean = toCatalogGame(full)
  assert.equal(lean.denominationCount, full.denominations.length)
  assert.equal(lean.lowestPrice, lowestPrice(full))
  assert.equal("denominations" in lean, false)
  assert.equal(filterGames([lean], "MOBILE").length, 1)
})

test("filter genre katalog memakai genre statis dan mapping slug", () => {
  assert.equal(filterGames(GAMES, "", "action").length, 3)
  assert.equal(filterGames(GAMES, "", "strategy").length, 2)
  assert.equal(filterGames(GAMES, "", "sandbox").length, 1)
  assert.deepEqual(resolveGameGenres({ slug: "honkai-impact-3" }), ["action", "rpg"])
})

test("genre fallback membaca nama/kategori dan tidak memaksa produk non-game", () => {
  const racing = resolveGameGenres({
    slug: "game-baru",
    name: "Mystery Racing",
    category: "TOP UP",
  })
  assert.deepEqual(racing, ["simulation"])
  assert.deepEqual(
    resolveGameGenres({ slug: "streaming-baru", name: "Streaming Baru", category: "VOUCHER" }),
    []
  )
})

test("foto profil hanya menerima data URL gambar dengan isi yang cocok", () => {
  const png =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="
  assert.equal(validateAvatarDataUrl(png), null)
  assert.match(
    validateAvatarDataUrl(png.replace("image/png", "image/jpeg")) ?? "",
    /Isi foto/
  )
  assert.match(
    validateAvatarDataUrl("https://contoh.com/foto.png") ?? "",
    /Format foto/
  )
})

test("foto profil menolak payload yang terlalu besar", () => {
  assert.match(
    validateAvatarDataUrl(`data:image/png;base64,${"A".repeat(300_001)}`) ?? "",
    /terlalu besar/
  )

  const bytes = Buffer.alloc(MAX_AVATAR_BYTES + 1)
  bytes.set([0x89, 0x50, 0x4e, 0x47])
  const dataUrl = `data:image/png;base64,${bytes.toString("base64")}`
  assert.ok(dataUrl.length < 300_000)
  assert.match(validateAvatarDataUrl(dataUrl) ?? "", /terlalu besar/)
})

test("id adsense dinormalisasi dan divalidasi sebelum dipakai", () => {
  assert.equal(
    normalizeAdsenseClient("pub-1234567890123456"),
    "ca-pub-1234567890123456"
  )
  assert.equal(
    normalizeAdsenseClient("ca-pub-1234567890123456"),
    "ca-pub-1234567890123456"
  )
  assert.equal(normalizeAdsenseClient("pub-123"), null)
  assert.equal(normalizeAdSlot("1234567890"), "1234567890")
  assert.equal(normalizeAdSlot("bukan-slot"), null)
})
