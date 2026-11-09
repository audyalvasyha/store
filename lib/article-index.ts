/**
 * Metadata ringan artikel. File ini aman diimpor komponen client (sidebar)
 * tanpa ikut membawa seluruh isi artikel ke bundle browser.
 */
export type ArticleStatus = "draft" | "published"

export type ArticleLayout = "editorial" | "minimal" | "wide"

export type ArticleCta = {
  eyebrow: string
  title: string
  description: string
  label: string
  href: string
}

export type ArticleSettings = {
  layout: ArticleLayout
  heroImage?: string
  showKeyPoints: boolean
  showToc: boolean
  showRelated: boolean
  showFaq: boolean
  cta?: ArticleCta
}

export type ArticleMeta = {
  slug: string
  title: string
  description: string
  category: string
  date: string
  updated: string
  readMinutes: number
  tags: string[]
  gameSlug?: string
  glyph: string
  hue: string
  featured?: boolean
  /** Kustomisasi halaman yang diatur dari /admin/artikel. */
  settings?: ArticleSettings
  /** Override judul/deskripsi untuk hasil pencarian; fallback ke title/description. */
  seoTitle?: string
  seoDescription?: string
  noIndex?: boolean
}

export const ARTICLE_INDEX: ArticleMeta[] = [
  {
    slug: "cara-top-up-diamond-mobile-legends",
    title: "Cara Top Up Diamond Mobile Legends yang Aman dan Cepat",
    description:
      "Panduan top up Diamond MLBB: cara menemukan User ID dan Server, memilih nominal, bayar, cek status, sampai tips biar Diamond nggak nyasar.",
    category: "Panduan Game",
    date: "2026-10-18",
    updated: "2026-11-08",
    readMinutes: 6,
    tags: ["mobile legends", "diamond mlbb", "top up game"],
    gameSlug: "mobile-legends",
    glyph: "ML",
    hue: "258 85% 55%",
    featured: true,
  },
  {
    slug: "tips-aman-top-up-game-online",
    title: "7 Tips Aman Top Up Game Online biar Nggak Kena Scam",
    description:
      "Cek domain, jangan kasih password atau OTP, sampai simpan bukti order. Ini checklist sederhana sebelum top up game online.",
    category: "Keamanan",
    date: "2026-11-05",
    updated: "2026-11-09",
    readMinutes: 7,
    tags: ["top up aman", "scam", "tips game"],
    glyph: "07",
    hue: "45 90% 50%",
  },
  {
    slug: "panduan-top-up-free-fire",
    title: "Panduan Top Up Free Fire: Diamond, Membership, dan Tips Aman",
    description:
      "Cara top up Free Fire pakai Player ID, bedanya Diamond dan membership, serta hal yang perlu dicek sebelum bayar.",
    category: "Panduan Game",
    date: "2026-10-27",
    updated: "2026-11-06",
    readMinutes: 5,
    tags: ["free fire", "diamond ff", "membership"],
    gameSlug: "free-fire",
    glyph: "FF",
    hue: "12 95% 50%",
  },
  {
    slug: "apa-itu-top-up-game",
    title: "Apa Itu Top Up Game? Arti ID, Server, Denom, dan Voucher",
    description:
      "Penjelasan istilah dasar top up game: User ID, Server ID, denom, currency, voucher, dan kenapa harga bisa berbeda antar penjual.",
    category: "Dasar",
    date: "2026-09-30",
    updated: "2026-11-02",
    readMinutes: 5,
    tags: ["istilah top up", "voucher game", "denom"],
    glyph: "ID",
    hue: "0 100% 50%",
  },
]

export function getArticleMeta(slug: string): ArticleMeta | undefined {
  return ARTICLE_INDEX.find((article) => article.slug === slug)
}

export const ARTICLE_LAYOUTS: Array<{
  value: ArticleLayout
  label: string
  description: string
}> = [
  {
    value: "editorial",
    label: "Editorial",
    description: "Layout utama: artikel + sidebar daftar isi dan bantuan.",
  },
  {
    value: "minimal",
    label: "Minimal",
    description: "Satu kolom fokus baca, tanpa sidebar. Cocok untuk artikel pendek.",
  },
  {
    value: "wide",
    label: "Wide",
    description: "Lebih lega untuk artikel panjang dengan banyak tabel dan langkah.",
  },
]

export function normalizeArticleSettings(
  settings?: Partial<ArticleSettings> | null
): ArticleSettings {
  const layout = ARTICLE_LAYOUTS.some((item) => item.value === settings?.layout)
    ? (settings?.layout as ArticleLayout)
    : "editorial"
  const cta = settings?.cta
  const safeCta = cta
    ? {
        eyebrow: String(cta.eyebrow ?? "").trim().slice(0, 60),
        title: String(cta.title ?? "").trim().slice(0, 120),
        description: String(cta.description ?? "").trim().slice(0, 220),
        label: String(cta.label ?? "").trim().slice(0, 60),
        href: safeArticleHref(String(cta.href ?? "")) ?? "",
      }
    : undefined

  return {
    layout,
    heroImage: safeHttpsUrl(String(settings?.heroImage ?? "")) ?? undefined,
    showKeyPoints: settings?.showKeyPoints !== false,
    showToc: settings?.showToc !== false,
    showRelated: settings?.showRelated !== false,
    showFaq: settings?.showFaq !== false,
    cta:
      safeCta && safeCta.title && safeCta.label && safeCta.href ? safeCta : undefined,
  }
}

/** Hanya izinkan path internal atau URL HTTPS. Mencegah javascript:/data: di konten admin. */
export function safeArticleHref(value: string): string | undefined {
  const href = value.trim().slice(0, 1000)
  if (!href) return undefined
  if (href.includes("\\")) return undefined
  if (href.startsWith("/") && !href.startsWith("//")) {
    if (/[\u0000-\u001f\u007f]/.test(href)) return undefined
    return href
  }
  try {
    const url = new URL(href)
    if (url.protocol !== "https:" || url.username || url.password) return undefined
    return url.toString()
  } catch {
    return undefined
  }
}

/** URL gambar hero: hanya HTTPS, tanpa kredensial di URL. */
export function safeHttpsUrl(value: string): string | undefined {
  const raw = value.trim().slice(0, 1000)
  if (!raw) return undefined
  try {
    const url = new URL(raw)
    if (url.protocol !== "https:" || url.username || url.password) return undefined
    return url.toString()
  } catch {
    return undefined
  }
}

/** Hue disimpan sebagai triplet HSL ("258 85% 55%") dan dipakai inline style. */
export function safeArticleHue(value: string): string {
  const hue = value.trim()
  const match = /^(\d{1,3}) (\d{1,3})% (\d{1,3})%$/.exec(hue)
  if (!match) return "0 100% 50%"
  const h = Number(match[1])
  const s = Number(match[2])
  const l = Number(match[3])
  if (h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) {
    return "0 100% 50%"
  }
  return `${h} ${s}% ${l}%`
}

export function slugifyArticle(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96)
}

/** Tanggal hari ini di WIB, dipakai sebagai default editor artikel. */
export function todayArticleDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? ""
  return `${pick("year")}-${pick("month")}-${pick("day")}`
}

export function formatArticleDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00+07:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  })
}
