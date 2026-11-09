import type { Metadata } from "next"
import Link from "next/link"
import { ArticleCard } from "@/components/article-card"
import { EditorialHeader } from "@/components/editorial-header"
import { Footer } from "@/components/footer"
import { getPublishedArticles } from "@/lib/articles-db"
import { safeJsonLd } from "@/lib/jsonld"

const SITE_URL = process.env.APP_BASE_URL?.replace(/\/$/, "") ?? "https://gastros.id"

export const revalidate = 60

export const metadata: Metadata = {
  title: "Artikel & Panduan Top Up Game",
  description:
    "Panduan top up game, istilah dasar, dan tips keamanan dari Gastros. Baca cara top up Diamond MLBB, Free Fire, dan hindari scam.",
  alternates: {
    canonical: "/artikel",
  },
  openGraph: {
    title: "Artikel & Panduan Top Up Game // GASTROS",
    description:
      "Panduan game, istilah top up, dan tips keamanan—ditulis buat pembeli yang mau transaksi tanpa drama.",
    url: "/artikel",
    type: "website",
  },
}

export default async function ArticlesPage() {
  const articles = await getPublishedArticles()
  const featured = articles.find((article) => article.featured) ?? articles[0]
  const rest = featured
    ? articles.filter((article) => article.slug !== featured.slug)
    : []

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Artikel & Panduan Top Up Game",
        description:
          "Kumpulan panduan top up game, istilah dasar, dan tips keamanan dari Gastros.",
        url: `${SITE_URL}/artikel`,
        inLanguage: "id-ID",
        mainEntity: {
          "@type": "ItemList",
          itemListElement: articles.map((article, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `${SITE_URL}/artikel/${article.slug}`,
            name: article.title,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Artikel", item: `${SITE_URL}/artikel` },
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
      <div className="noise-overlay" aria-hidden="true" />
      <EditorialHeader active="artikel" />

      <section className="mx-auto w-full max-w-[1400px] px-4 pb-6 pt-8 md:px-8 md:pb-10 md:pt-14 lg:px-12">
        <div className="flex flex-col gap-5 border-b border-border pb-6 md:flex-row md:items-end md:justify-between md:gap-10 md:pb-10">
          <div>
            <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.22em] text-accent md:text-[11px] md:tracking-[0.3em]">
              [Jurnal Gastros] — Panduan tanpa basa-basi
            </span>
            <h1 className="font-sans text-[19vw] uppercase leading-[0.82] tracking-tighter text-foreground sm:text-7xl md:text-8xl lg:text-9xl">
              Artikel<span className="text-accent">.</span>
            </h1>
          </div>
          <div className="max-w-md md:pb-1">
            <p className="font-mono text-[11px] leading-relaxed text-foreground/55 md:text-xs">
              Panduan game, arti istilah top up, dan cara transaksi yang lebih aman.
              Ditulis buat kamu yang mau top up tanpa kehilangan akun atau uang.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/35">
                {String(articles.length).padStart(2, "0")} tulisan
              </span>
              <span className="h-px w-8 bg-accent" aria-hidden="true" />
              <Link
                href="/games"
                className="font-mono text-[9px] uppercase tracking-[0.18em] text-accent transition-opacity hover:opacity-70"
              >
                Lihat katalog
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1400px] px-4 pb-12 md:px-8 md:pb-20 lg:px-12">
        {featured ? (
          <>
            <ArticleCard article={featured} featured />

            {rest.length > 0 && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:mt-4 lg:grid-cols-3">
                {rest.map((article, index) => (
                  <ArticleCard key={article.slug} article={article} index={index + 1} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="border border-border bg-card p-8 text-center md:p-12">
            <span className="mb-2 block font-mono text-[9px] uppercase tracking-[0.2em] text-accent">
              [Belum ada artikel]
            </span>
            <h2 className="font-sans text-3xl uppercase leading-none tracking-tight text-foreground md:text-5xl">
              Editorial lagi disiapkan.
            </h2>
            <p className="mx-auto mt-3 max-w-md font-mono text-[10px] leading-relaxed text-foreground/45">
              Artikel baru bakal muncul di sini setelah admin publish. Sementara itu,
              kamu tetap bisa cek katalog game dan top up seperti biasa.
            </p>
            <Link
              href="/games"
              className="mt-5 inline-flex min-h-[44px] items-center justify-center bg-accent px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-foreground transition-opacity hover:opacity-85"
            >
              Buka katalog game →
            </Link>
          </div>
        )}

        <div className="mt-8 flex flex-col items-start justify-between gap-4 border border-border bg-card p-4 md:mt-12 md:flex-row md:items-center md:p-6">
          <div>
            <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.2em] text-accent">
              [Mulai dari sini]
            </span>
            <p className="font-sans text-xl uppercase leading-none tracking-tight text-foreground md:text-3xl">
              Sudah paham caranya? Pilih game dan gas.
            </p>
          </div>
          <Link
            href="/games"
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center bg-accent px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-foreground transition-opacity hover:opacity-85"
          >
            Buka semua game →
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  )
}
