import Link from "next/link"
import type { Metadata } from "next"
import { BackButton } from "@/components/back-button"
import { GAMES } from "@/lib/catalog"
import { getDynamicGames } from "@/lib/content"
import { GamesCatalog } from "@/components/games-catalog"
import { getRatingsByGame } from "@/lib/reviews"
import { soldCountsByGame } from "@/lib/orders"
import { GamesSearchInput } from "@/components/games-search-input"
import { AuthNav } from "@/components/auth-nav"
import { filterGames } from "@/lib/catalog"
import { Suspense } from "react"
import { Footer } from "@/components/footer"

// ISR: cache 30 detik — katalog tetap segar, ga nge-hit DB tiap request.
export const revalidate = 30

export const metadata: Metadata = {
  title: "Semua Game",
  description:
    "Katalog lengkap top up game di GASTROS: MLBB, Free Fire, CODM, LoL, Valorant dan lainnya. Diamond & currency masuk akun lewat jalur resmi publisher, proses kilat 24 jam.",
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

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>
}) {
  const { q, sort: sortRaw } = await searchParams
  const query = String(q ?? "").trim().toLowerCase()
  const sort = ["rating", "terlaris"].includes(String(sortRaw)) ? String(sortRaw) : "nama"

  // Katalog dinamis dari MongoDB (admin /admin ngatur ini), fallback ke statis.
  const [allGames, ratings, sold] = await Promise.all([
    getDynamicGames(),
    getRatingsByGame().catch(() => ({}) as Record<string, { average: number; count: number }>),
    soldCountsByGame().catch(() => ({}) as Record<string, number>),
  ])
  const filtered = filterGames(allGames.length > 0 ? allGames : GAMES, query)
  // Salin dulu: filterGames bisa balikin array referensi katalog — jangan dimutasi.
  const safeGames = [...filtered]
  if (sort === "rating") {
    safeGames.sort((a, b) => {
      const ra = ratings[a.slug]
      const rb = ratings[b.slug]
      return (
        (rb?.average ?? 0) - (ra?.average ?? 0) ||
        (rb?.count ?? 0) - (ra?.count ?? 0) ||
        a.short.localeCompare(b.short)
      )
    })
  } else if (sort === "terlaris") {
    safeGames.sort(
      (a, b) => (sold[b.slug] ?? 0) - (sold[a.slug] ?? 0) || a.short.localeCompare(b.short)
    )
  }

  return (
    <main className="relative min-h-screen">
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
          <nav className="flex items-center gap-4 md:gap-8 flex-1 justify-end">
            <Suspense fallback={null}>
              <GamesSearchInput />
            </Suspense>
            <Link
              href="/"
              className="hidden sm:block font-mono text-[10px] md:text-[11px] tracking-[0.25em] text-foreground/50 hover:text-foreground uppercase transition-colors"
            >
              Home
            </Link>
            <Link
              href="/orders"
              className="font-mono text-[10px] md:text-[11px] tracking-[0.25em] text-foreground/50 hover:text-foreground uppercase transition-colors"
            >
              Riwayat
            </Link>
            <AuthNav />
          </nav>
        </div>
      </header>

      <section className="px-4 md:px-8 lg:px-12 pt-5 md:pt-10 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <BackButton />
        </div>
      </section>

      <GamesCatalog games={safeGames} ratings={ratings} sort={sort} q={query} />
      <Footer />
    </main>
  )
}
