import Link from "next/link"
import { formatArticleDate, safeArticleHue, type ArticleMeta } from "@/lib/article-index"

/**
 * Blok internal link dari halaman top-up ke artikel editorial.
 * Server component — artikel hanya dirender jadi link, bukan dikirim ke client.
 */
export function RelatedGuides({ articles }: { articles: ArticleMeta[] }) {
  if (articles.length === 0) return null

  return (
    <section
      aria-labelledby="panduan-terkait"
      className="mx-auto w-full max-w-[1400px] px-4 pb-10 md:px-8 md:pb-16 lg:px-12"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3 md:mb-6 md:pb-4">
        <div>
          <span className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.22em] text-accent md:text-[10px]">
            [Panduan terkait]
          </span>
          <h2
            id="panduan-terkait"
            className="font-sans text-2xl uppercase leading-none tracking-tight text-foreground md:text-3xl"
          >
            Baca dulu, biar nggak salah<span className="text-accent">.</span>
          </h2>
        </div>
        <Link
          href="/artikel"
          className="font-mono text-[9px] uppercase tracking-[0.15em] text-accent transition-opacity hover:opacity-70 md:text-[10px]"
        >
          Semua artikel →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {articles.map((article, index) => (
          <Link
            key={article.slug}
            href={`/artikel/${article.slug}`}
            className="group flex flex-col border border-border bg-card p-4 transition-colors hover:border-accent/70 md:p-5"
          >
            <div className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center border border-border font-mono text-[9px] text-accent"
                style={{ background: `hsl(${safeArticleHue(article.hue)} / 0.12)` }}
              >
                {article.glyph}
              </span>
              <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-foreground/40">
                {article.category}
              </span>
              <span className="ml-auto font-mono text-[8px] text-foreground/25">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>

            <h3 className="mt-4 font-sans text-xl uppercase leading-[0.95] tracking-tight text-foreground transition-colors group-hover:text-accent">
              {article.title}
            </h3>
            <p className="mt-2.5 flex-1 font-mono text-[10px] leading-relaxed text-foreground/45">
              {article.description}
            </p>

            <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-3 font-mono text-[8px] uppercase tracking-[0.12em] text-foreground/30">
              <span>{formatArticleDate(article.date)}</span>
              <span className="text-accent">{article.readMinutes} menit →</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
