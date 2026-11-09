import { NextResponse } from "next/server"
import { getPublishedArticles } from "@/lib/articles-db"

export const dynamic = "force-dynamic"

/**
 * Hanya metadata publik (judul + slug) untuk daftar artikel terbaru di
 * sidebar. Draft dan isi artikel nggak pernah ikut response ini.
 */
export async function GET() {
  const articles = await getPublishedArticles()

  return NextResponse.json(
    {
      articles: articles.slice(0, 4).map((article) => ({
        slug: article.slug,
        title: article.title,
      })),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    }
  )
}
