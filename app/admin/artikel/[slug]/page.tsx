import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import {
  AdminArticleEditor,
  type AdminGameOption,
} from "@/components/admin-article-editor"
import { getAdminEmail, SESSION_COOKIE } from "@/lib/admin-auth"
import { getAdminArticle } from "@/lib/articles-db"
import { getDynamicGames } from "@/lib/content"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Editor Artikel // GASTROS",
}

export default async function EditAdminArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const jar = await cookies()
  const email = await getAdminEmail(jar.get(SESSION_COOKIE)?.value)
  const { slug } = await params
  if (!email) {
    redirect(`/admin/login?returnTo=${encodeURIComponent(`/admin/artikel/${slug}`)}`)
  }

  const article = await getAdminArticle(slug)
  if (!article) notFound()

  const games: AdminGameOption[] = (await getDynamicGames()).map((game) => ({
    slug: game.slug,
    short: game.short,
    name: game.name,
  }))

  return <AdminArticleEditor article={article} games={games} mode="edit" />
}
