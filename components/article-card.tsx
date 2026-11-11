import Link from "next/link"
import {
  formatArticleDate,
  safeArticleHue,
  safeHttpsUrl,
  type ArticleMeta,
} from "@/lib/article-index"

export function ArticleCard({
  article,
  featured = false,
  index,
}: {
  article: ArticleMeta
  featured?: boolean
  index?: number
}) {
  const cover = safeHttpsUrl(article.settings?.heroImage ?? "")

  return (
    <Link
      href={`/artikel/${article.slug}`}
      className={`group relative flex overflow-hidden border border-border bg-card transition-colors hover:border-accent/70 ${
        featured ? "flex-col md:grid md:grid-cols-[1.05fr_0.95fr]" : "flex-col"
      }`}
    >
      <div
        className={`relative overflow-hidden ${featured ? "min-h-[220px] md:min-h-[360px]" : "aspect-[16/10]"}`}
        style={{
          background: `radial-gradient(circle at 20% 20%, hsl(${safeArticleHue(article.hue)} / 0.38), transparent 58%), linear-gradient(135deg, hsl(${safeArticleHue(article.hue)} / 0.14), #080808 72%)`,
        }}
      >
        {cover && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt=""
              loading={featured ? "eager" : "lazy"}
              fetchPriority={featured ? "high" : undefined}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-transparent" />
          </>
        )}
        <div
          className="absolute inset-0 opacity-[0.14]"
          aria-hidden="true"
          style={{
            backgroundImage:
              "linear-gradient(hsl(0 0% 95% / 0.8) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 95% / 0.8) 1px, transparent 1px)",
            backgroundSize: "34px 34px",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-accent transition-transform duration-500 group-hover:scale-x-100 md:scale-x-0 md:origin-left" />
        <span className="absolute left-4 top-4 border border-background/30 bg-background/70 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/70">
          {article.category}
        </span>
        {typeof index === "number" && (
          <span className="absolute right-4 top-4 font-mono text-[10px] tracking-[0.2em] text-foreground/40">
            {String(index + 1).padStart(2, "0")}
          </span>
        )}
        {!cover && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={`font-sans leading-none tracking-tighter text-foreground/15 ${
                featured ? "text-[9rem] md:text-[12rem]" : "text-[7rem]"
              }`}
              aria-hidden="true"
            >
              {article.glyph}
            </span>
          </div>
        )}
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-accent">
            [Jurnal Gastros]
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/45">
            {article.readMinutes} menit baca
          </span>
        </div>
      </div>

      <div className={`flex flex-1 flex-col justify-between p-4 md:p-6 ${featured ? "md:p-8" : ""}`}>
        <div>
          <span className="mb-2 block font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/40">
            {formatArticleDate(article.date)}
          </span>
          <h2
            className={`font-sans uppercase leading-[0.92] tracking-tight text-foreground transition-colors group-hover:text-accent ${
              featured ? "text-3xl md:text-5xl" : "text-2xl md:text-3xl"
            }`}
          >
            {article.title}
          </h2>
          <p className="mt-3 font-mono text-[10px] leading-relaxed text-foreground/55 md:text-xs">
            {article.description}
          </p>
        </div>
        <span className="mt-5 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
          Baca artikel
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </span>
      </div>
    </Link>
  )
}
