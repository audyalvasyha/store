/**
 * Sumber artikel publik + data admin.
 *
 * Artikel bawaan tetap ada di `lib/articles.ts` supaya situs nggak pernah
 * kosong saat DB down. Dokumen MongoDB di collection `articles` menimpa
 * artikel dengan slug yang sama, atau menambah artikel baru kalau slug-nya
 * belum ada. Draft menimpa default dengan cara menyembunyikannya sampai
 * di-publish.
 *
 * SERVER-ONLY: file ini mengimpor MongoDB.
 */
import { cache } from "react"
import { getDb, ensureIndexes } from "./mongodb"
import { ARTICLES, type Article } from "./articles"
import type { ArticleMeta, ArticleStatus } from "./article-index"
import { sanitizeArticleInput } from "./article-schema"

const COLLECTION = "articles"

export type ArticleDoc = Article & {
  status: ArticleStatus
  createdAt: string
  savedAt: string
}

export type ArticleInput = Omit<ArticleDoc, "createdAt" | "savedAt">

export type AdminArticle = ArticleInput & {
  source: "db" | "default"
  hasStaticBase: boolean
  createdAt: string
  savedAt: string
}

let readyPromise: Promise<void> | null = null

async function ready(): Promise<void> {
  if (!readyPromise) {
    readyPromise = ensureIndexes().catch((err) => {
      readyPromise = null
      throw err
    })
  }
  await readyPromise
}

function normalizeStored(raw: unknown): ArticleInput | null {
  const parsed = sanitizeArticleInput(raw)
  return parsed.article ?? null
}

function sortPublished(articles: Article[]): Article[] {
  return articles.sort(
    (a, b) =>
      Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
      b.date.localeCompare(a.date) ||
      a.title.localeCompare(b.title)
  )
}

function staticAdminArticle(article: Article): AdminArticle {
  return {
    ...article,
    status: "published",
    source: "default",
    hasStaticBase: true,
    createdAt: `${article.date}T00:00:00+07:00`,
    savedAt: `${article.updated}T00:00:00+07:00`,
  }
}

/** Artikel yang boleh tampil di publik, sudah digabung dengan override DB.
 *  Cache per-request supaya metadata + halaman detail nggak query dua kali. */
export const getPublishedArticles = cache(async (): Promise<Article[]> => {
  let docs: ArticleDoc[] = []

  try {
    await ready()
    const db = await getDb()
    docs = await db.collection<ArticleDoc>(COLLECTION).find({}).toArray()
  } catch {
    // DB down / belum di-set: halaman publik tetap hidup dengan artikel statis.
    return sortPublished(ARTICLES.map((article) => ({ ...article, settings: article.settings })))
  }

  const bySlug = new Map<string, Article>(
    ARTICLES.map((article) => [article.slug, { ...article }] as const)
  )

  for (const doc of docs) {
    const slug = typeof doc.slug === "string" ? doc.slug : ""
    if (!slug) continue

    // Draft = sembunyikan versi default dengan slug yang sama.
    if (doc.status !== "published") {
      bySlug.delete(slug)
      continue
    }

    const normalized = normalizeStored(doc)
    if (normalized) bySlug.set(slug, normalized as Article)
  }

  return sortPublished([...bySlug.values()])
})

export async function getPublishedArticle(slug: string): Promise<Article | undefined> {
  const articles = await getPublishedArticles()
  return articles.find((article) => article.slug === slug)
}

/** Metadata ringan untuk route OG / sitemap. */
export async function getPublishedArticleMeta(
  slug: string
): Promise<ArticleMeta | undefined> {
  return getPublishedArticle(slug)
}

export async function getRelatedPublishedArticles(
  article: Article,
  limit = 3
): Promise<Article[]> {
  const articles = await getPublishedArticles()
  return articles
    .filter((item) => item.slug !== article.slug)
    .sort((a, b) => {
      const score = (candidate: Article) =>
        (candidate.category === article.category ? 2 : 0) +
        (candidate.gameSlug && candidate.gameSlug === article.gameSlug ? 1 : 0)
      return score(b) - score(a) || b.date.localeCompare(a.date)
    })
    .slice(0, limit)
}

/** Daftar lengkap untuk dashboard admin: default + override DB. */
export async function getAdminArticles(): Promise<AdminArticle[]> {
  await ready()
  const db = await getDb()
  const docs = await db.collection<ArticleDoc>(COLLECTION).find({}).toArray()

  const staticBySlug = new Map<string, Article>(
    ARTICLES.map((article) => [article.slug, article] as const)
  )
  const bySlug = new Map<string, AdminArticle>()

  for (const article of ARTICLES) {
    bySlug.set(article.slug, staticAdminArticle(article))
  }

  for (const doc of docs) {
    const slug = typeof doc.slug === "string" ? doc.slug : ""
    if (!slug) continue
    const normalized = normalizeStored(doc)
    if (!normalized) continue

    bySlug.set(normalized.slug, {
      ...normalized,
      source: "db",
      hasStaticBase: staticBySlug.has(normalized.slug),
      createdAt:
        typeof doc.createdAt === "string"
          ? doc.createdAt
          : `${normalized.date}T00:00:00+07:00`,
      savedAt:
        typeof doc.savedAt === "string"
          ? doc.savedAt
          : `${normalized.updated}T00:00:00+07:00`,
    })
  }

  return [...bySlug.values()].sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

export async function getAdminArticle(slug: string): Promise<AdminArticle | null> {
  try {
    await ready()
    const db = await getDb()
    const doc = await db.collection<ArticleDoc>(COLLECTION).findOne({ slug })
    if (doc) {
      const normalized = normalizeStored(doc)
      if (normalized) {
        return {
          ...normalized,
          source: "db",
          hasStaticBase: ARTICLES.some((article) => article.slug === normalized.slug),
          createdAt:
            typeof doc.createdAt === "string"
              ? doc.createdAt
              : `${normalized.date}T00:00:00+07:00`,
          savedAt:
            typeof doc.savedAt === "string"
              ? doc.savedAt
              : `${normalized.updated}T00:00:00+07:00`,
        }
      }
    }
  } catch {
    // DB down: artikel default masih bisa dibuka untuk diedit, tapi save
    // akan mengembalikan error yang jelas dari route API.
  }

  const fallback = ARTICLES.find((article) => article.slug === slug)
  return fallback ? staticAdminArticle(fallback) : null
}

export function hasStaticArticle(slug: string): boolean {
  return ARTICLES.some((article) => article.slug === slug)
}

export async function saveArticle(input: ArticleInput): Promise<void> {
  await ready()
  const db = await getDb()
  const now = new Date().toISOString()

  await db.collection<ArticleDoc>(COLLECTION).updateOne(
    { slug: input.slug },
    {
      $set: {
        ...input,
        savedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  )
}

export async function deleteArticleDoc(slug: string): Promise<void> {
  await ready()
  const db = await getDb()
  await db.collection<ArticleDoc>(COLLECTION).deleteOne({ slug })
}
