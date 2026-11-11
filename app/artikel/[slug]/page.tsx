import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArticleBody } from "@/components/article-body"
import { AdSlot } from "@/components/ad-slot"
import { AdSenseScript } from "@/components/adsense-script"
import { ArticleCard } from "@/components/article-card"
import { EditorialHeader } from "@/components/editorial-header"
import { Footer } from "@/components/footer"
import {
  formatArticleDate,
  normalizeArticleSettings,
  safeArticleHref,
  safeArticleHue,
  safeHttpsUrl,
} from "@/lib/article-index"
import { getPublishedArticle, getRelatedPublishedArticles } from "@/lib/articles-db"
import { formatIDR, lowestPrice } from "@/lib/catalog"
import { getDynamicGame } from "@/lib/content"
import { safeJsonLd } from "@/lib/jsonld"

const SITE_URL = process.env.APP_BASE_URL?.replace(/\/$/, "") ?? "https://gastros.id"

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const article = await getPublishedArticle(slug)

  if (!article) {
    return {
      title: "Artikel tidak ditemukan",
      robots: { index: false, follow: false },
    }
  }

  const title = article.seoTitle?.trim() || article.title
  const description = article.seoDescription?.trim() || article.description

  return {
    title,
    description,
    keywords: article.tags,
    authors: [{ name: "Tim Gastros" }],
    alternates: {
      canonical: `/artikel/${article.slug}`,
    },
    robots: article.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      url: `/artikel/${article.slug}`,
      siteName: "GASTROS",
      locale: "id_ID",
      type: "article",
      publishedTime: `${article.date}T00:00:00+07:00`,
      modifiedTime: `${article.updated}T00:00:00+07:00`,
      section: article.category,
      tags: article.tags,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = await getPublishedArticle(slug)
  if (!article) notFound()

  const settings = normalizeArticleSettings(article.settings)
  const [related, game] = await Promise.all([
    settings.showRelated ? getRelatedPublishedArticles(article, 2) : Promise.resolve([]),
    article.gameSlug ? getDynamicGame(article.gameSlug) : Promise.resolve(undefined),
  ])

  const faqs = settings.showFaq ? article.faqs : undefined
  const toc = [
    ...article.sections.map((section) => ({ id: section.id, title: section.title })),
    ...(faqs?.length ? [{ id: "faq", title: "Pertanyaan umum" }] : []),
  ]

  const heroImage = safeHttpsUrl(settings.heroImage ?? "")
  const articleHue = safeArticleHue(article.hue)
  const customCta = settings.cta
  const fallbackHref = game ? `/top-up/${game.slug}` : "/games"
  const ctaHref = safeArticleHref(customCta?.href ?? "") ?? fallbackHref
  const ctaExternal = ctaHref.startsWith("https://")
  const ctaLabel = customCta?.label || (game ? "Buka halaman top up →" : "Lihat semua game →")
  const ctaTitle =
    customCta?.title ||
    (game ? `Top up ${game.name} sekarang.` : "Pilih game favoritmu.")
  const ctaDescription =
    customCta?.description ||
    (game ? `Mulai ${formatIDR(lowestPrice(game))} · tanpa login akun` : undefined)

  const widthClass =
    settings.layout === "minimal"
      ? "max-w-[900px]"
      : settings.layout === "wide"
        ? "max-w-[1600px]"
        : "max-w-[1400px]"
  const showAside = settings.layout !== "minimal"
  // Jangan tampilkan iklan di artikel yang sengaja noindex / halaman tipis.
  const showAds = !article.noIndex

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: article.title,
        description: article.description,
        image: heroImage ?? `${SITE_URL}/artikel/${article.slug}/opengraph-image`,
        datePublished: `${article.date}T00:00:00+07:00`,
        dateModified: `${article.updated}T00:00:00+07:00`,
        inLanguage: "id-ID",
        articleSection: article.category,
        keywords: article.tags.join(", "),
        author: {
          "@type": "Organization",
          name: "Tim Gastros",
          url: SITE_URL,
        },
        publisher: {
          "@type": "Organization",
          name: "GASTROS",
          logo: {
            "@type": "ImageObject",
            url: `${SITE_URL}/icon.svg`,
          },
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": `${SITE_URL}/artikel/${article.slug}`,
        },
        isAccessibleForFree: true,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Artikel",
            item: `${SITE_URL}/artikel`,
          },
          { "@type": "ListItem", position: 3, name: article.title },
        ],
      },
    ],
  }

  return (
    <main className="relative min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      {/* Script AdSense cuma di halaman yang punya slot iklan. */}
      <AdSenseScript />
      <div className="noise-overlay" aria-hidden="true" />
      <EditorialHeader active="artikel" />

      <div className={`mx-auto w-full px-4 pb-12 pt-6 md:px-8 md:pb-20 md:pt-10 lg:px-12 ${widthClass}`}>
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/35 md:mb-10"
        >
          <Link href="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link href="/artikel" className="transition-colors hover:text-foreground">
            Artikel
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-foreground/60">{article.category}</span>
        </nav>

        {heroImage && (
          <div className="relative mb-6 overflow-hidden border border-border md:mb-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt=""
              className="h-[220px] w-full object-cover md:h-[380px]"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-3">
              <span className="border border-border/60 bg-background/70 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-foreground/70 backdrop-blur">
                {article.category}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-foreground/55">
                {article.readMinutes} menit baca
              </span>
            </div>
          </div>
        )}

        <div
          className={`grid grid-cols-1 items-start gap-8 ${
            showAside ? "lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12" : ""
          }`}
        >
          <article className="min-w-0">
            <header className="border-b border-border pb-6 md:pb-9">
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/40">
                <span className="text-accent">{article.category}</span>
                <span aria-hidden="true">/</span>
                <span>{formatArticleDate(article.date)}</span>
                <span aria-hidden="true">/</span>
                <span>{article.readMinutes} menit baca</span>
              </div>
              <h1
                className="max-w-4xl font-sans text-[12vw] uppercase leading-[0.88] tracking-tighter text-foreground sm:text-6xl md:text-7xl lg:text-8xl"
                style={{ textShadow: `0 0 80px hsl(${articleHue} / 0.08)` }}
              >
                {article.title}
              </h1>
              <p className="mt-4 max-w-2xl font-mono text-[11px] leading-relaxed text-foreground/55 md:mt-6 md:text-sm">
                {article.description}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-[0.13em] text-foreground/35">
                <span>Oleh Tim Gastros</span>
                <span className="h-px w-6 bg-accent" aria-hidden="true" />
                <span>
                  {article.updated !== article.date
                    ? `Diperbarui ${formatArticleDate(article.updated)}`
                    : "Editorial Gastros"}
                </span>
              </div>
            </header>

            {settings.showKeyPoints && (
              <div className="mt-6 border border-border bg-card p-4 md:mt-8 md:p-5">
                <span className="mb-2.5 block font-mono text-[9px] uppercase tracking-[0.2em] text-accent">
                  [Yang penting dulu]
                </span>
                <ul className="flex flex-col gap-2">
                  {article.keyPoints.map((point) => (
                    <li
                      key={point}
                      className="flex gap-2.5 font-mono text-[10px] leading-relaxed text-foreground/60 md:text-xs"
                    >
                      <span className="mt-[0.45em] h-1.5 w-1.5 shrink-0 bg-accent" aria-hidden="true" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showAds && (
              <AdSlot
                slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_TOP}
                format="auto"
                className="mt-6 md:mt-8"
              />
            )}

            <div className="mt-8 md:mt-11">
              <ArticleBody
                sections={article.sections}
                faqs={faqs}
                adAfterSection={2}
                inArticleAd={
                  showAds && article.sections.length >= 3 ? (
                    <AdSlot
                      slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_MID}
                      format="fluid"
                      layout="in-article"
                      minHeightClassName="min-h-[250px]"
                    />
                  ) : undefined
                }
              />
            </div>

            <div className="mt-8 flex flex-wrap gap-1.5 md:mt-10">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="border border-border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-foreground/40"
                >
                  #{tag}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-col items-start justify-between gap-4 border-2 border-accent bg-card p-4 md:mt-10 md:flex-row md:items-center md:p-6">
              <div>
                <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.2em] text-accent">
                  {customCta?.eyebrow || "[Langkah berikutnya]"}
                </span>
                <p className="font-sans text-2xl uppercase leading-none tracking-tight text-foreground md:text-3xl">
                  {ctaTitle}
                </p>
                {ctaDescription && (
                  <p className="mt-1.5 font-mono text-[10px] text-foreground/45">
                    {ctaDescription}
                  </p>
                )}
              </div>
              {ctaExternal ? (
                <a
                  href={ctaHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] shrink-0 items-center justify-center bg-accent px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-foreground transition-opacity hover:opacity-85"
                >
                  {ctaLabel}
                </a>
              ) : (
                <Link
                  href={ctaHref}
                  className="inline-flex min-h-[44px] shrink-0 items-center justify-center bg-accent px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-foreground transition-opacity hover:opacity-85"
                >
                  {ctaLabel}
                </Link>
              )}
            </div>

            <p className="mt-6 border-t border-border pt-4 font-mono text-[9px] leading-relaxed text-foreground/30">
              Artikel ini bersifat edukasi. Nama game, mata uang, dan merek adalah milik
              publisher masing-masing. Gastros bukan afiliasi resmi publisher.
            </p>

            {settings.showRelated && related.length > 0 && (
              <section className="mt-10 md:mt-14" aria-labelledby="artikel-terkait">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2
                    id="artikel-terkait"
                    className="font-sans text-2xl uppercase leading-none tracking-tight text-foreground md:text-3xl"
                  >
                    Baca juga<span className="text-accent">.</span>
                  </h2>
                  <Link
                    href="/artikel"
                    className="font-mono text-[9px] uppercase tracking-[0.15em] text-accent hover:opacity-70"
                  >
                    Semua artikel →
                  </Link>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {related.map((item, index) => (
                    <ArticleCard key={item.slug} article={item} index={index} />
                  ))}
                </div>
              </section>
            )}
          </article>

          {showAside && (
            <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
              {settings.showToc && toc.length > 0 && (
                <nav
                  aria-label="Daftar isi"
                  className="hidden border border-border bg-card p-5 lg:block"
                >
                  <span className="mb-3 block font-mono text-[9px] uppercase tracking-[0.2em] text-accent">
                    [Daftar isi]
                  </span>
                  <ol className="flex flex-col gap-2.5">
                    {toc.map((item, index) => (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          className="group flex gap-2.5 font-mono text-[10px] leading-relaxed text-foreground/50 transition-colors hover:text-foreground"
                        >
                          <span className="text-foreground/25 group-hover:text-accent">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          {item.title}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              )}

              {showAds && (
                <AdSlot
                  slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_SIDEBAR}
                  format="rectangle"
                  minHeightClassName="min-h-[250px]"
                />
              )}

              <div className="border border-border bg-card p-4 md:p-5">
                <span className="mb-2 block font-mono text-[9px] uppercase tracking-[0.2em] text-accent">
                  [Butuh bantuan?]
                </span>
                <p className="font-sans text-xl uppercase leading-none tracking-tight text-foreground">
                  Order atau tanya CS.
                </p>
                <p className="mt-2 font-mono text-[10px] leading-relaxed text-foreground/45">
                  Cek status order pakai kode, atau buka katalog untuk pilih nominal.
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <Link
                    href="/orders"
                    className="inline-flex min-h-[40px] items-center justify-center border border-border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/65 transition-colors hover:border-accent hover:text-foreground"
                  >
                    Cek riwayat order
                  </Link>
                  <Link
                    href="/games"
                    className="inline-flex min-h-[40px] items-center justify-center bg-accent px-3 py-2 font-mono text-[9px] uppercase tracking-[0.15em] text-accent-foreground transition-opacity hover:opacity-85"
                  >
                    Pilih game
                  </Link>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}
