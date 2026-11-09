import { ImageResponse } from "next/og"
import { notFound } from "next/navigation"
import { formatArticleDate } from "@/lib/article-index"
import { getPublishedArticleMeta } from "@/lib/articles-db"

export const alt = "Artikel dan panduan top up game dari GASTROS"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const revalidate = 60

export default async function ArticleOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = await getPublishedArticleMeta(slug)
  // Draft dan slug yang tidak ada nggak boleh menghasilkan gambar publik.
  if (!article) notFound()

  const title = article.title
  const category = article.category
  const date = formatArticleDate(article.updated)

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#080808",
          padding: "64px 80px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "radial-gradient(circle at 82% 18%, rgba(255,0,0,0.26), transparent 42%), radial-gradient(circle at 10% 95%, rgba(255,0,0,0.12), transparent 38%)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 20, position: "relative" }}>
          <div
            style={{
              width: 72,
              height: 72,
              background: "#ff0000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 42, color: "#080808", fontWeight: 700 }}>G$</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 27, letterSpacing: 10, color: "#f5f5f5" }}>GASTROS</span>
            <span style={{ fontSize: 18, letterSpacing: 4, color: "#8a8a8a" }}>
              JURNAL / PANDUAN GAME
            </span>
          </div>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 18,
              letterSpacing: 3,
              color: "#ff0000",
              border: "1px solid rgba(255,0,0,0.55)",
              padding: "8px 14px",
            }}
          >
            {category.toUpperCase()}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "relative" }}>
          <span style={{ fontSize: 24, letterSpacing: 4, color: "#ff0000" }}>
            [BACA SAMPAI HABIS]
          </span>
          <span
            style={{
              maxWidth: 1020,
              fontSize: 64,
              lineHeight: 1.06,
              fontWeight: 700,
              color: "#f5f5f5",
            }}
          >
            {title}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(255,255,255,0.16)",
            paddingTop: 22,
            position: "relative",
          }}
        >
          <span style={{ fontSize: 21, color: "#9ca3af" }}>
            {date} · {article.readMinutes} menit baca
          </span>
          <span style={{ fontSize: 24, color: "#f5f5f5", letterSpacing: 2 }}>
            gastros.id/artikel
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
