import Link from "next/link"
import type { Metadata } from "next"
import { BackButton } from "@/components/back-button"
import { GAMES, toCatalogGame } from "@/lib/catalog"
import { getDynamicGames } from "@/lib/content"
import { GamesCatalog } from "@/components/games-catalog"
import { getRatingsByGame } from "@/lib/reviews"
import { soldCountsByGame } from "@/lib/orders"
import { GamesSearchInput } from "@/components/games-search-input"
import { AuthNav } from "@/components/auth-nav"
import { SidebarMenuButton } from "@/components/site-sidebar"
import { Suspense } from "react"
import { Footer } from "@/components/footer"
import { safeJsonLd } from "@/lib/jsonld"

const SITE_URL = process.env.APP_BASE_URL?.replace(/\/$/, "") ?? "https://gastros.id"
const GAMES_DESCRIPTION =
  "Katalog lengkap top up game di GASTROS: MLBB, Free Fire, CODM, LoL, Valorant dan lainnya. Diamond & currency masuk akun lewat jalur resmi publisher, proses kilat 24 jam."
// JSON-LD cukup daftar game prioritas. Katalog lengkap tetap dirender di halaman,
// tapi 157 item schema membuat HTML membengkak tanpa manfaat crawl yang sepadan.
const JSONLD_GAME_LIMIT = 24

// ISR: cache 30 detik — katalog tetap segar, ga nge-hit DB tiap request.
export const revalidate = 30

export const metadata: Metadata = {
  title: "Semua Game",
  description: GAMES_DESCRIPTION,
  alternates: {
    canonical: "/games",
  },
  openGraph: {
    title: "Katalog Semua Game // GASTROS",
    description:
      "Ratusan pilihan top up game: Diamond MLBB, Free Fire, CODM, LoL, Valorant, dan lainnya — harga bersahabat, proses kilat.",
    url: "/games",
    type: "website",
  },
}

export default async function GamesPage() {
  // Katalog dinamis dari MongoDB (admin /admin ngatur ini), fallback ke statis.
  // Pencarian & urutan dilakukan di browser supaya halaman ini bisa di-cache
  // dan user nggak nunggu request server tiap ketik.
  const [allGames, ratings, sold] = await Promise.all([
    getDynamicGames(),
    getRatingsByGame().catch(() => ({}) as Record<string, { average: number; count: number }>),
    soldCountsByGame().catch(() => ({}) as Record<string, number>),
  ])

  const sourceGames = allGames.length > 0 ? allGames : GAMES
  const catalogGames = sourceGames.map(toCatalogGame)
  const coreOrder = new Map(GAMES.map((game, index) => [game.slug, index] as const))
  const seenPriorityNames = new Set<string>()
  const priorityGames = [...sourceGames]
    .filter(
      (game) =>
        coreOrder.has(game.slug) ||
        Boolean(game.featured) ||
        (sold[game.slug] ?? 0) > 0 ||
        (ratings[game.slug]?.count ?? 0) > 0
    )
    .sort((a, b) => {
      const aCore = coreOrder.get(a.slug)
      const bCore = coreOrder.get(b.slug)
      if (aCore !== undefined || bCore !== undefined) {
        if (aCore === undefined) return 1
        if (bCore === undefined) return -1
        return aCore - bCore
      }
      const featuredDiff = Number(Boolean(b.featured)) - Number(Boolean(a.featured))
      if (featuredDiff) return featuredDiff
      const soldDiff = (sold[b.slug] ?? 0) - (sold[a.slug] ?? 0)
      if (soldDiff) return soldDiff
      return (ratings[b.slug]?.average ?? 0) - (ratings[a.slug]?.average ?? 0)
    })
    .filter((game) => {
      const key = game.name.trim().toLowerCase()
      if (seenPriorityNames.has(key)) return false
      seenPriorityNames.add(key)
      return true
    })
    .slice(0, JSONLD_GAME_LIMIT)

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${SITE_URL}/games#collection`,
        name: "Katalog Top Up Game",
        description: GAMES_DESCRIPTION,
        url: `${SITE_URL}/games`,
        inLanguage: "id-ID",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        mainEntity: {
          "@type": "ItemList",
          name: "Game prioritas GASTROS",
          description:
            "Pilihan game populer berdasarkan pilihan editor dan jumlah order.",
          numberOfItems: priorityGames.length,
          itemListElement: priorityGames.map((game, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `${SITE_URL}/top-up/${game.slug}`,
            name: `Top Up ${game.name}`,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Games", item: `${SITE_URL}/games` },
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

      <header className="border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 py-3 md:py-6 flex flex-wrap items-center gap-x-3 gap-y-2 w-full">
          <Link href="/" className="order-1 flex shrink-0 items-center gap-2">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-accent" />
              <span className="relative font-sans text-lg text-accent-foreground leading-none">G$</span>
            </div>
            <span className="hidden sm:inline font-mono text-[10px] tracking-[0.3em] text-foreground uppercase">Gastros</span>
          </Link>
          <nav className="order-2 sm:order-3 ml-auto sm:ml-0 flex min-w-0 items-center gap-2 sm:gap-4 md:gap-8">
            <Link
              href="/"
              className="hidden sm:block font-mono text-[10px] md:text-[11px] tracking-[0.25em] text-foreground/50 hover:text-foreground uppercase transition-colors"
            >
              Home
            </Link>
            <Link
              href="/orders"
              className="hidden sm:block font-mono text-[10px] md:text-[11px] tracking-[0.25em] text-foreground/50 hover:text-foreground uppercase transition-colors"
            >
              Riwayat
            </Link>
            <AuthNav />
            <SidebarMenuButton />
          </nav>
          <div className="order-3 sm:order-2 w-full min-w-0 sm:ml-auto sm:w-auto sm:max-w-md sm:flex-1 md:max-w-xl">
            <Suspense fallback={null}>
              <GamesSearchInput />
            </Suspense>
          </div>
        </div>
      </header>

      <section className="px-4 md:px-8 lg:px-12 pt-5 md:pt-10 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <BackButton />
        </div>
      </section>

      <GamesCatalog games={catalogGames} ratings={ratings} sold={sold} />
      <Footer />
    </main>
  )
}
