import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { getAdminEmail, SESSION_COOKIE } from "@/lib/admin-auth"
import { sanitizeArticleInput } from "@/lib/article-schema"
import {
  deleteArticleDoc,
  hasStaticArticle,
  saveArticle,
} from "@/lib/articles-db"

export const dynamic = "force-dynamic"

const SLUG_EXP = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

async function requireAdmin(): Promise<string | null> {
  const jar = await cookies()
  return getAdminEmail(jar.get(SESSION_COOKIE)?.value)
}

function revalidateArticle(slug: string) {
  revalidatePath("/artikel")
  revalidatePath(`/artikel/${slug}`)
  revalidatePath(`/artikel/${slug}/opengraph-image`)
  revalidatePath("/sitemap.xml")
}

export async function POST(request: Request) {
  const email = await requireAdmin()
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ error: "Content-Type harus application/json" }, { status: 415 })
  }

  try {
    const body = await request.json()
    const parsed = sanitizeArticleInput(body?.article)
    if (!parsed.article) {
      return NextResponse.json(
        { error: parsed.error ?? "Data artikel nggak valid." },
        { status: 400 }
      )
    }

    await saveArticle(parsed.article)
    revalidateArticle(parsed.article.slug)

    return NextResponse.json({ ok: true, slug: parsed.article.slug })
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan artikel." }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const email = await requireAdmin()
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const slug = new URL(request.url).searchParams.get("slug")?.toLowerCase() ?? ""
  if (!SLUG_EXP.test(slug)) {
    return NextResponse.json({ error: "Slug artikel nggak valid." }, { status: 400 })
  }

  try {
    const restored = hasStaticArticle(slug)
    await deleteArticleDoc(slug)
    revalidateArticle(slug)
    return NextResponse.json({ ok: true, restored })
  } catch {
    return NextResponse.json({ error: "Gagal menghapus artikel." }, { status: 500 })
  }
}
