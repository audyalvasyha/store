export type Denomination = {
  id: string
  label: string
  detail?: string
  price: number
  /**
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
  needsServer: boolean
  featured?: boolean
  denominations: Denomination[]
}

export const PAYMENT_METHODS = [
  { id: "qris", label: "QRIS", detail: "Semua e-wallet & m-banking" },
  { id: "ewallet", label: "E-Wallet", detail: "DANA / OVO / GoPay / ShopeePay" },
  { id: "bank", label: "Transfer Bank", detail: "BCA / BNI / BRI / Mandiri" },
] as const

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
    slug: "pubg-mobile",
    short: "PUBGM",
    name: "PUBG Mobile",
    publisher: "Tencent",
    category: "Battle Royale",
    currency: "UC",
    glyph: "PM",
    hue: "45 90% 50%",
    needsServer: false,
    featured: true,
    denominations: [
      { id: "pm-60", label: "60 UC", price: 13000 },
      { id: "pm-325", label: "325 UC", price: 63000 },
      { id: "pm-660", label: "660 UC", price: 125000 },
      { id: "pm-1800", label: "1800 UC", price: 315000 },
      { id: "pm-3850", label: "3850 UC", price: 630000 },
      { id: "pm-8100", label: "8100 UC", price: 1250000 },
    ],
  },
  {
    slug: "genshin-impact",
    short: "GI",
    name: "Genshin Impact",
    publisher: "HoYoverse",
    category: "Open World RPG",
    currency: "Genesis Crystals",
    glyph: "GI",
    hue: "205 85% 48%",
    needsServer: true,
    featured: true,
    denominations: [
      { id: "gi-60", label: "60 Genesis Crystals", price: 15000 },
      { id: "gi-330", label: "330 Genesis Crystals", price: 75000 },
      { id: "gi-1090", label: "1090 Genesis Crystals", price: 235000 },
      { id: "gi-2240", label: "2240 Genesis Crystals", price: 465000 },
      { id: "gi-3880", label: "3880 Genesis Crystals", price: 799000 },
      { id: "gi-welkin", label: "Blessing of the Welkin Moon", detail: "90 primogems/hari, 30 hari", price: 75000 },
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
