import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { GAMES, formatIDR } from "@/lib/catalog"
import { BackButton } from "@/components/back-button"
import { getDynamicGame } from "@/lib/content"
import { getStoneGame, activeStoneVariants } from "@/lib/gamestone"
import { TopupForm } from "@/components/topup-form"
import { GameInfoBlock } from "@/components/game-info-block"
import { Footer } from "@/components/footer"
import { safeJsonLd } from "@/lib/jsonld"

export const dynamic = "force-dynamic"

export function generateStaticParams() {
  return GAMES.map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const game = await getDynamicGame(slug)
  if (!game) return { title: "Game tidak ditemukan" }
  const minPrice = Math.min(...game.denominations.map((d) => d.price))
  return {
    title: `Top Up ${game.name}`,
    description: `Top up ${game.currency} ${game.name} murah, proses kilat, jalur resmi publisher. Mulai ${formatIDR(minPrice)}. Layanan 24 jam di gastros.id.`,
    alternates: {
      canonical: `/top-up/${slug}`,
    },
    openGraph: {
      title: `Top Up ${game.name} — Mulai ${formatIDR(minPrice)}`,
      description: `${game.currency} ${game.name} masuk akun lewat jalur resmi publisher. Proses kilat, layanan 24 jam.`,
      url: `/top-up/${slug}`,
      type: "website",
      // og:image tidak diisi manual: otomatis dari app/top-up/[slug]/opengraph-image.tsx.
    },
    twitter: {
      card: "summary_large_image",
      title: `Top Up ${game.name} — Mulai ${formatIDR(minPrice)}`,
      description: `Jalur resmi publisher, proses kilat, layanan 24 jam. Mulai ${formatIDR(minPrice)}.`,
    },
  }
}

export default async function TopupPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const game = await getDynamicGame(slug)
  if (!game) notFound()

  // Nominal live dari Gamestone (harga provider) kalau game terhubung.
  const stoneGame = game.stoneSlug ? await getStoneGame(game.stoneSlug) : null
  const stoneVariants = stoneGame
    ? activeStoneVariants(stoneGame).map((v) => ({ id: String(v.id), label: v.name, price: v.price }))
    : undefined

  // JSON-LD: Product + AggregateOffer — bantu Google paham kalau ini halaman
  // jualan top up (bisa muncul rich result harga di SERP).
  const prices = stoneVariants?.length
    ? stoneVariants.map((v) => v.price)
    : game.denominations.map((d) => d.price)
  const SITE_URL =
    process.env.APP_BASE_URL?.replace(/\/$/, "") ?? "https://gastros.id"
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: `Top Up ${game.name}`,
        description: `Top up ${game.currency} ${game.name} lewat jalur resmi publisher, proses kilat, layanan 24 jam.`,
        category: game.currency,
        brand: { "@type": "Brand", name: "GASTROS" },
        offers: {
          "@type": "AggregateOffer",
          lowPrice: Math.min(...prices),
          highPrice: Math.max(...prices),
          priceCurrency: "IDR",
          availability: "https://schema.org/InStock",
          url: `${SITE_URL}/top-up/${slug}`,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Games", item: `${SITE_URL}/games` },
          { "@type": "ListItem", position: 3, name: `Top Up ${game.name}` },
        ],
      },
    ],
  }

  return (
    <main className="relative min-h-screen">
      <script
        type="application/ld+json"          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <div className="noise-overlay" aria-hidden="true" />

      <header className="border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 py-3 md:py-6 flex items-center justify-between w-full">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-accent" />
              <span className="relative font-sans text-lg text-accent-foreground leading-none">G$</span>
            </div>
            <span className="font-mono text-[10px] tracking-[0.3em] text-foreground uppercase">Gastros</span>
          </Link>
          <nav className="flex items-center gap-4 md:gap-8">
            <Link
              href="/#games"
              className="font-mono text-[10px] md:text-[11px] tracking-[0.25em] text-foreground/50 hover:text-foreground uppercase transition-colors"
            >
              Games
            </Link>
            <Link
              href="/#harga"
              className="font-mono text-[10px] md:text-[11px] tracking-[0.25em] text-foreground/50 hover:text-foreground uppercase transition-colors hidden sm:block"
            >
              Harga
            </Link>
            <Link
              href="/orders"
              className="font-mono text-[10px] md:text-[11px] tracking-[0.25em] text-foreground/50 hover:text-foreground uppercase transition-colors"
            >
              Riwayat
            </Link>
          </nav>
        </div>
      </header>

      <section className="px-4 md:px-8 lg:px-12 pt-5 md:pt-10 pb-6 md:pb-10 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <BackButton />
        </div>

        <span className="font-mono text-[10px] md:text-[11px] text-accent tracking-[0.2em] md:tracking-[0.3em] uppercase block mb-1 md:mb-2">
          [Top Up] {game.category.toUpperCase()} // {game.publisher.toUpperCase()}
        </span>
        <h1 className="font-sans text-[11vw] sm:text-6xl md:text-7xl lg:text-8xl tracking-tighter text-foreground leading-none uppercase">
          {game.name}
        </h1>
      </section>

      <section className="px-4 md:px-8 lg:px-12 pb-8 md:pb-24 max-w-[1400px] mx-auto w-full">
        <TopupForm game={game} stoneVariants={stoneVariants} />
      </section>

      <GameInfoBlock game={game} />
      <Footer />
    </main>
  )
}
