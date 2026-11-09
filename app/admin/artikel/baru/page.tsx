import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import {
  AdminArticleEditor,
  type AdminGameOption,
} from "@/components/admin-article-editor"
import { getAdminEmail, SESSION_COOKIE } from "@/lib/admin-auth"
import type { AdminArticle } from "@/lib/articles-db"
import { normalizeArticleSettings, todayArticleDate } from "@/lib/article-index"
import { getDynamicGames } from "@/lib/content"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Artikel Baru // GASTROS",
}

export default async function NewAdminArticlePage() {
  const jar = await cookies()
  const email = await getAdminEmail(jar.get(SESSION_COOKIE)?.value)
  if (!email) redirect("/admin/login?returnTo=/admin/artikel/baru")

  const games: AdminGameOption[] = (await getDynamicGames()).map((game) => ({
    slug: game.slug,
    short: game.short,
    name: game.name,
  }))

  const now = new Date().toISOString()
  const today = todayArticleDate()
  const article: AdminArticle = {
    slug: "",
    title: "",
    description: "",
    category: "Panduan Game",
    date: today,
    updated: today,
    readMinutes: 5,
    tags: [],
    glyph: "AR",
    hue: "0 100% 50%",
    featured: false,
    keyPoints: [""],
    sections: [
      {
        id: "pendahuluan",
        title: "Pendahuluan",
        blocks: [{ type: "p", text: "" }],
      },
    ],
    faqs: [],
    settings: normalizeArticleSettings(),
    status: "draft",
    source: "default",
    hasStaticBase: false,
    createdAt: now,
    savedAt: now,
  }

  return <AdminArticleEditor article={article} games={games} mode="create" />
}
