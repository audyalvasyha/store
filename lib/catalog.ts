export type Denomination = {
  id: string
  label: string
  detail?: string
  price: number  /**
   * Kode produk di APIGames (lihat "Lihat Produk" di dashboard merchant).
   * Isi hanya dengan kode yang benar-benar ada di akun APIGames kamu.
   * Selama kosong, order tetap dibuat tapi pengiriman item ditandai MANUAL.
   */
  providerCode?: string
}

export type GameItem = {
  slug: string
  short: string
  name: string
  publisher: string
  category: string
  currency: string
  glyph: string
  hue: string
  /** URL gambar artwork asli (source: Gamestone API). Optional, fallback ke gradient+hue. */
  image?: string
  /** Slug di Gamestone Merchant API untuk game yg terhubung provider. */
  stoneSlug?: string
  needsServer: boolean
  featured?: boolean
  denominations: Denomination[]
}

export const PAYMENT_METHODS = [
  { id: "qris", label: "QRIS", detail: "Semua e-wallet & m-banking" },
  { id: "ewallet", label: "E-Wallet", detail: "DANA / OVO / GoPay / ShopeePay" },
  { id: "bank", label: "Transfer Bank", detail: "BCA / BNI / BRI / Mandiri" },
] as const

/** Metode pembayaran via payment bawaan Gamestone (code = payment_method_code API). */
export const STONE_PAYMENT_METHODS = [
  { id: "qris", label: "QRIS", detail: "Semua e-wallet & m-banking" },
  { id: "ovo", label: "OVO", detail: "OVO balance" },
  { id: "linkaja", label: "LinkAja", detail: "LinkAja balance" },
  { id: "mandiri", label: "Mandiri VA", detail: "Virtual account" },
  { id: "bni", label: "BNI VA", detail: "Virtual account" },
  { id: "bri", label: "BRI VA", detail: "Virtual account" },
  { id: "permata", label: "Permata VA", detail: "Virtual account" },
  { id: "bjb", label: "BJB VA", detail: "Virtual account" },
  { id: "cimb", label: "CIMB VA", detail: "Virtual account" },
  { id: "indomaret", label: "Indomaret", detail: "Bayar di kasir" },
  { id: "alfamart", label: "Alfamart", detail: "Bayar di kasir" },
] as const

export const STONE_METHOD_IDS: string[] = STONE_PAYMENT_METHODS.map((m) => m.id)

export const WA_NUMBER = "6281234567890"

export function formatIDR(amount: number): string {
  return "Rp " + new Intl.NumberFormat("id-ID").format(amount)
}

export const GAMES: GameItem[] = [
  {
    slug: "mobile-legends",
    short: "MLBB",
    name: "Mobile Legends: Bang Bang",
    publisher: "Moonton",
    category: "MOBA",
    currency: "Diamonds",
    glyph: "ML",
    hue: "258 85% 55%",
    image: "https://static-src.vocagame.com/BisnisVocagame/mlbbmy-12f6-original-50ca-original.webp",
    stoneSlug: "mobile-legends-bang-bang-my-partner",
    needsServer: true,
    featured: true,
    denominations: [
      { id: "ml-86", label: "86 Diamonds", detail: "Bonus 8 + 1 skin tier", price: 19500 },
      { id: "ml-172", label: "172 Diamonds", price: 38500 },
      { id: "ml-257", label: "257 Diamonds", price: 57500 },
      { id: "ml-344", label: "344 Diamonds", price: 75500 },
      { id: "ml-514", label: "514 Diamonds", price: 112000 },
      { id: "ml-1050", label: "1050 Diamonds", price: 225000 },
      { id: "ml-2195", label: "2195 Diamonds", price: 459000 },
      { id: "ml-twl", label: "Twilight Pass", detail: "Event skin langsung", price: 149000 },
    ],
  },
  {
    slug: "free-fire",
    short: "FF",
    name: "Free Fire",
    publisher: "Garena",
    category: "Battle Royale",
    currency: "Diamonds",
    glyph: "FF",
    hue: "12 95% 50%",
    image: "https://static-src.vocagame.com/BisnisVocagame/THUMBNAILSfree_fire%20my-ab9c-original.webp",
    stoneSlug: "free-fire-malaysia",
    needsServer: false,
    featured: true,
    denominations: [
      { id: "ff-70", label: "70 Diamonds", price: 12500 },
      { id: "ff-140", label: "140 Diamonds", price: 24500 },
      { id: "ff-355", label: "355 Diamonds", price: 61500 },
      { id: "ff-720", label: "720 Diamonds", price: 122000 },
      { id: "ff-1450", label: "1450 Diamonds", price: 244000 },
      { id: "ff-wm", label: "Weekly Membership", detail: "Otomatis tiap 7 hari", price: 28500 },
      { id: "ff-mm", label: "Monthly Membership", price: 88500 },
    ],
  },
  {
    slug: "call-of-duty-mobile",
    short: "CODM",
    name: "Call of Duty Mobile",
    publisher: "Activision",
    category: "Battle Royale",
    currency: "CP",
    glyph: "CODM",
    hue: "0 100% 50%",
    image: "https://static-src.vocagame.com/BisnisVocagame/codm-1633-original.webp",
    stoneSlug: "call-of-duty-mobile-id",
    needsServer: true,
    featured: true,
    denominations: [
      { id: "codm-480", label: "480 CP", price: 13000 },
      { id: "codm-1950", label: "1950 CP", price: 52000 },
      { id: "codm-4870", label: "4870 CP", price: 125000 },
      { id: "codm-10180", label: "10180 CP", price: 250000 },
      { id: "codm-19660", label: "19660 CP", price: 480000 },
    ],
  },
  {
    slug: "league-of-legends-pc",
    short: "LoL PC",
    name: "League of Legends - PC MY",
    publisher: "Riot Games",
    category: "MOBA",
    currency: "Blue Essence",
    glyph: "LoL",
    hue: "205 85% 48%",
    image: "https://static-src.vocagame.com/BisnisVocagame/league_of_legends%20my-4a6c-original.webp",
    stoneSlug: "league-of-legends-pc-my",
    needsServer: true,
    featured: true,
    denominations: [
      { id: "lol-450", label: "450 Blue Essence", price: 15000 },
      { id: "lol-1350", label: "1350 Blue Essence", price: 42000 },
      { id: "lol-2850", label: "2850 Blue Essence", price: 88000 },
      { id: "lol-5250", label: "5250 Blue Essence", price: 160000 },
      { id: "lol-7650", label: "7650 Blue Essence", price: 240000 },
    ],
  },
  {
    slug: "valorant",
    short: "VAL",
    name: "Valorant",
    publisher: "Riot Games",
    category: "FPS Tactical",
    currency: "VP",
    glyph: "VA",
    hue: "0 85% 55%",
    needsServer: true,
    denominations: [
      { id: "va-475", label: "475 VP", price: 55000 },
      { id: "va-1000", label: "1000 VP", price: 110000 },
      { id: "va-2050", label: "2050 VP", price: 220000 },
      { id: "va-3650", label: "3650 VP", price: 385000 },
      { id: "va-5350", label: "5350 VP", price: 550000 },
      { id: "va-8000", label: "8000 VP", price: 760000 },
    ],
  },
  {
    slug: "honkai-star-rail",
    short: "HSR",
    name: "Honkai: Star Rail",
    publisher: "HoYoverse",
    category: "Turn-based RPG",
    currency: "Oneiric Shards",
    glyph: "HS",
    hue: "190 80% 45%",
    needsServer: true,
    denominations: [
      { id: "hsr-60", label: "60 Oneiric Shards", price: 15000 },
      { id: "hsr-330", label: "330 Oneiric Shards", price: 75000 },
      { id: "hsr-1090", label: "1090 Oneiric Shards", price: 235000 },
      { id: "hsr-2240", label: "2240 Oneiric Shards", price: 465000 },
      { id: "hsr-3880", label: "3880 Oneiric Shards", price: 799000 },
      { id: "hsr-pass", label: "Express Supply Pass", detail: "90 Stellar Jade/hari", price: 75000 },
    ],
  },
  {
    slug: "roblox",
    short: "RBX",
    name: "Roblox",
    publisher: "Roblox Corporation",
    category: "Sandbox",
    currency: "Robux",
    glyph: "RX",
    hue: "25 80% 45%",
    needsServer: false,
    denominations: [
      { id: "rbx-80", label: "80 Robux", price: 15000 },
      { id: "rbx-400", label: "400 Robux", price: 70000 },
      { id: "rbx-800", label: "800 Robux", price: 135000 },
      { id: "rbx-1700", label: "1700 Robux", price: 270000 },
      { id: "rbx-4500", label: "4500 Robux", price: 650000 },
      { id: "rbx-10000", label: "10000 Robux", price: 1350000 },
    ],
  },
]

export function getGame(slug: string): GameItem | undefined {
  return GAMES.find((g) => g.slug === slug)
}

export function getDenomination(game: GameItem, denomId: string): Denomination | undefined {
  return game.denominations.find((d) => d.id === denomId)
}

export function lowestPrice(game: GameItem): number {
  return game.denominations.reduce((min, d) => (d.price < min ? d.price : min), Infinity)
}

export function formatPriceShort(amount: number): string {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1)}jt`
  if (amount >= 1000) return `${Math.round(amount / 1000)}rb`
  return String(amount)
}
