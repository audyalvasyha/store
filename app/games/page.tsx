import type { Metadata } from "next"
import { GAMES } from "@/lib/catalog"
import { getDynamicGames } from "@/lib/content"
import { GamesCatalog } from "@/components/games-catalog"
import { GamesSearchInput } from "@/components/games-search-input"
import { filterGames } from "@/lib/catalog"
import { Suspense } from "react"
import { Footer } from "@/components/footer"

// ISR: cache 30 detik — katalog tetap segar, ga nge-hit DB tiap request.
export const revalidate = 30

export const metadata: Metadata = {
  title: "Semua Game // GAS STORE",
  description:
    "Katalog lengkap top up game: MLBB, Free Fire, CODM, LoL, Valorant dan lainnya. Diamond & currency masuk akun lewat jalur resmi publisher, proses kilat 24 jam.",
}

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = String(q ?? "").trim().toLowerCase()

  // Katalog dinamis dari MongoDB (admin /admin ngatur ini), fallback ke statis.
  const allGames = await getDynamicGames()
  const safeGames = filterGames(allGames.length > 0 ? allGames : GAMES, query)

  return (
    <main className="relative min-h-screen">
      <div className="noise-overlay" aria-hidden="true" />

      <header className="px-4 md:px-8 lg:px-12 py-3 md:py-6 border-b border-border flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div className="absolute inset-0 bg-accent" />
            <span className="relative font-sans text-lg text-accent-foreground leading-none">G$</span>
          </div>
          <span className="font-mono text-[10px] tracking-[0.3em] text-foreground uppercase">Gas Store</span>
        </a>
        <nav className="flex items-center gap-4 md:gap-8 flex-1 justify-end">
          <Suspense fallback={null}>
            <GamesSearchInput />
          </Suspense>
          <a
            href="/"
            className="font-mono text-[10px] md:text-[11px] tracking-[0.25em] text-foreground/50 hover:text-foreground uppercase transition-colors"
          >
            Home
          </a>
          <a
            href="/orders"
            className="font-mono text-[10px] md:text-[11px] tracking-[0.25em] text-foreground/50 hover:text-foreground uppercase transition-colors"
          >
            Riwayat
          </a>
        </nav>
      </header>

      <GamesCatalog games={safeGames} />
      <Footer />
    </main>
  )
}
