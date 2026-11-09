/**
 * Validasi payload artikel dari /admin/artikel.
 *
 * Semua field masuk lewat sini sebelum disimpan ke MongoDB. Tujuannya bukan
 * cuma rapi-rapi form: konten ini nanti dirender ke halaman publik dan JSON-LD,
 * jadi href, URL gambar, dan hue harus divalidasi ketat.
 */
import {
  normalizeArticleSettings,
  safeArticleHref,
  safeArticleHue,
  safeHttpsUrl,
  slugifyArticle,
  type ArticleCta,
  type ArticleLayout,
  type ArticleStatus,
} from "./article-index"
import type { ArticleBlock, ArticleSection } from "./articles"
import type { ArticleInput } from "./articles-db"

type Raw = Record<string, unknown>

const SLUG_EXP = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const GAME_SLUG_EXP = /^[a-z0-9-]{2,64}$/
const MAX_SECTIONS = 20
const MAX_BLOCKS = 30
const MAX_KEY_POINTS = 8
const MAX_FAQS = 12

function isRecord(value: unknown): value is Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function text(value: unknown, max: number): string {
  return String(value ?? "")
    .trim()
    .slice(0, max)
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function validDate(value: unknown): string | null {
  const date = text(value, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const parsed = new Date(`${date}T00:00:00Z`)
  return Number.isNaN(parsed.getTime()) ? null : date
}

function stringList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => text(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems)
}

function safeLink(raw: unknown): string | undefined {
  return safeArticleHref(text(raw, 1000))
}

function sanitizeBlock(raw: unknown): ArticleBlock | null {
  if (!isRecord(raw)) return null
  const type = text(raw.type, 20)

  if (type === "p") {
    const value = text(raw.text, 5000)
    return value ? { type: "p", text: value } : null
  }

  if (type === "ul" || type === "ol") {
    const items = stringList(raw.items, 12, 500)
    return items.length ? { type, items } : null
  }

  if (type === "note") {
    const value = text(raw.text, 2000)
    if (!value) return null
    return {
      type: "note",
      label: text(raw.label, 60) || "Catatan",
      text: value,
    }
  }

  if (type === "steps") {
    const items = (Array.isArray(raw.items) ? raw.items : [])
      .slice(0, 10)
      .map((item) => {
        if (!isRecord(item)) return null
        const title = text(item.title, 160)
        const value = text(item.text, 1200)
        return title && value ? { title, text: value } : null
      })
      .filter((item): item is { title: string; text: string } => item !== null)
    return items.length ? { type: "steps", items } : null
  }

  if (type === "links") {
    const items = (Array.isArray(raw.items) ? raw.items : [])
      .slice(0, 8)
      .map((item) => {
        if (!isRecord(item)) return null
        const label = text(item.label, 120)
        const href = safeLink(item.href)
        return label && href ? { label, href } : null
      })
      .filter((item): item is { label: string; href: string } => item !== null)
    return items.length
      ? { type: "links", title: text(raw.title, 100) || "Tautan", items }
      : null
  }

  if (type === "table") {
    const headers = stringList(raw.headers, 6, 120)
    if (!headers.length) return null
    const rows = (Array.isArray(raw.rows) ? raw.rows : [])
      .slice(0, 30)
      .map((row) => {
        const cells = Array.isArray(row) ? row : []
        return headers.map((_, index) => text(cells[index], 300))
      })
    return rows.length ? { type: "table", headers, rows } : null
  }

  return null
}

function sanitizeSections(raw: unknown, errors: string[]): ArticleSection[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    errors.push("Artikel butuh minimal satu bagian konten.")
    return []
  }
  if (raw.length > MAX_SECTIONS) {
    errors.push(`Maksimal ${MAX_SECTIONS} bagian konten.`)
  }

  const usedIds = new Set<string>()
  const sections: ArticleSection[] = []

  for (const item of raw.slice(0, MAX_SECTIONS)) {
    if (!isRecord(item)) {
      errors.push("Format bagian artikel nggak valid.")
      continue
    }

    const title = text(item.title, 120)
    if (title.length < 2) {
      errors.push("Setiap bagian butuh judul minimal 2 karakter.")
      continue
    }

    let id = slugifyArticle(text(item.id, 96) || title)
    if (!id) {
      errors.push(`ID bagian untuk "${title}" nggak valid.`)
      continue
    }
    let suffix = 2
    while (usedIds.has(id)) {
      id = `${slugifyArticle(text(item.id, 90) || title)}-${suffix}`
      suffix += 1
    }
    usedIds.add(id)

    const rawBlocks = Array.isArray(item.blocks) ? item.blocks : []
    if (rawBlocks.length > MAX_BLOCKS) {
      errors.push(`Maksimal ${MAX_BLOCKS} blok per bagian.`)
    }
    const blocks: ArticleBlock[] = []
    for (const rawBlock of rawBlocks.slice(0, MAX_BLOCKS)) {
      const block = sanitizeBlock(rawBlock)
      if (!block) {
        errors.push(`Ada blok yang belum lengkap di bagian "${title}".`)
        continue
      }
      blocks.push(block)
    }

    if (blocks.length === 0) {
      errors.push(`Bagian "${title}" butuh minimal satu blok yang terisi.`)
      continue
    }

    sections.push({ id, title, blocks })
  }

  return sections
}

export function sanitizeArticleInput(
  input: unknown
): { article?: ArticleInput; error?: string } {
  if (!isRecord(input)) return { error: "Data artikel nggak valid." }

  const errors: string[] = []

  const slug = text(input.slug, 96).toLowerCase()
  if (!SLUG_EXP.test(slug)) {
    errors.push("Slug cuma boleh huruf kecil, angka, dan tanda hubung.")
  }
  if (slug === "baru") {
    errors.push('Slug "baru" dipakai route admin, pilih slug lain.')
  }

  const title = text(input.title, 160)
  if (title.length < 3) errors.push("Judul minimal 3 karakter.")

  const description = text(input.description, 320)
  if (description.length < 10) errors.push("Deskripsi minimal 10 karakter.")

  const category = text(input.category, 48)
  if (category.length < 2) errors.push("Kategori wajib diisi.")

  const date = validDate(input.date)
  if (!date) errors.push("Tanggal publikasi nggak valid.")
  const updated = validDate(input.updated)
  if (!updated) errors.push("Tanggal update nggak valid.")
  if (date && updated && updated < date) {
    errors.push("Tanggal update nggak boleh lebih awal dari tanggal publikasi.")
  }

  const readMinutesRaw = Number(input.readMinutes)
  const readMinutes =
    Number.isFinite(readMinutesRaw) && readMinutesRaw >= 1 && readMinutesRaw <= 120
      ? Math.round(readMinutesRaw)
      : 5
  if (!Number.isFinite(readMinutesRaw) || readMinutesRaw < 1 || readMinutesRaw > 120) {
    errors.push("Estimasi baca harus 1-120 menit.")
  }

  const gameSlugRaw = text(input.gameSlug, 64).toLowerCase()
  if (gameSlugRaw && !GAME_SLUG_EXP.test(gameSlugRaw)) {
    errors.push("Slug game nggak valid.")
  }

  if (Array.isArray(input.tags) && input.tags.length > 8) {
    errors.push("Maksimal 8 tag.")
  }
  const tags = stringList(input.tags, 8, 32)
  if (Array.isArray(input.keyPoints) && input.keyPoints.length > MAX_KEY_POINTS) {
    errors.push(`Maksimal ${MAX_KEY_POINTS} poin penting.`)
  }
  const keyPoints = stringList(input.keyPoints, MAX_KEY_POINTS, 240)
  if (keyPoints.length === 0) errors.push("Isi minimal satu poin penting.")

  const sections = sanitizeSections(input.sections, errors)

  if (Array.isArray(input.faqs) && input.faqs.length > MAX_FAQS) {
    errors.push(`Maksimal ${MAX_FAQS} pertanyaan umum.`)
  }
  const faqs = (Array.isArray(input.faqs) ? input.faqs : [])
    .slice(0, MAX_FAQS)
    .map((item) => {
      if (!isRecord(item)) return null
      const q = text(item.q, 240)
      const a = text(item.a, 2000)
      return q && a ? { q, a } : null
    })
    .filter((item): item is { q: string; a: string } => item !== null)

  const hueRaw = text(input.hue, 20) || "0 100% 50%"
  const hue = safeArticleHue(hueRaw)
  if (hue !== hueRaw) {
    errors.push("Hue harus format HSL, contoh: 258 85% 55%.")
  }

  const settingsRaw = isRecord(input.settings) ? input.settings : {}
  const layout = settingsRaw.layout
  if (layout !== "editorial" && layout !== "minimal" && layout !== "wide") {
    errors.push("Layout halaman nggak valid.")
  }

  const heroImageRaw = text(settingsRaw.heroImage, 1000)
  const heroImage = heroImageRaw ? safeHttpsUrl(heroImageRaw) : undefined
  if (heroImageRaw && !heroImage) {
    errors.push("URL gambar hero harus HTTPS dan valid.")
  }

  const ctaRaw = isRecord(settingsRaw.cta) ? settingsRaw.cta : null
  let cta: ArticleCta | undefined
  if (ctaRaw) {
    const titleCta = text(ctaRaw.title, 120)
    const label = text(ctaRaw.label, 60)
    const hrefRaw = text(ctaRaw.href, 1000)
    const href = safeArticleHref(hrefRaw)
    const hasAny = Boolean(
      titleCta || label || hrefRaw || text(ctaRaw.eyebrow, 60) || text(ctaRaw.description, 220)
    )
    if (hasAny) {
      if (!titleCta || !label || !href) {
        errors.push("CTA butuh judul, label tombol, dan link yang valid.")
      } else {
        cta = {
          eyebrow: text(ctaRaw.eyebrow, 60) || "[Langkah berikutnya]",
          title: titleCta,
          description: text(ctaRaw.description, 220),
          label,
          href,
        }
      }
    }
  }

  const status: ArticleStatus = input.status === "published" ? "published" : "draft"
  const settings = normalizeArticleSettings({
    layout: layout as ArticleLayout,
    heroImage,
    showKeyPoints: settingsRaw.showKeyPoints !== false,
    showToc: settingsRaw.showToc !== false,
    showRelated: settingsRaw.showRelated !== false,
    showFaq: settingsRaw.showFaq !== false,
    cta,
  })

  if (errors.length > 0) {
    return { error: errors.slice(0, 5).join(" ") }
  }

  return {
    article: {
      slug,
      title,
      description,
      category,
      date: date ?? todayIso(),
      updated: updated ?? date ?? todayIso(),
      readMinutes,
      tags,
      gameSlug: gameSlugRaw,
      glyph: text(input.glyph, 4) || "AR",
      hue,
      featured: Boolean(input.featured),
      keyPoints,
      sections,
      faqs,
      settings,
      seoTitle: text(input.seoTitle, 70),
      seoDescription: text(input.seoDescription, 160),
      noIndex: Boolean(input.noIndex),
      status,
    },
  }
}
