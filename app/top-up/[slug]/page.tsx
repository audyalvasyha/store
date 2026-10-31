import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { GAMES, formatIDR } from "@/lib/catalog"
import { getDynamicGame } from "@/lib/content"
import { getStoneGame, activeStoneVariants } from "@/lib/gamestone"
import { TopupForm } from "@/components/topup-form"

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
  if (!game) return { title: "Game tidak ditemukan // GAS STORE" }
  return {
    title: `Top Up ${game.name} // GAS STORE`,
    description: `Top up ${game.currency} ${game.name} murah, proses kilat, jalur resmi publisher. Mulai ${formatIDR(Math.min(...game.denominations.map((d) => d.price)))}.`,
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
        <nav className="flex items-center gap-4 md:gap-8">
          <a
            href="/#games"
            className="font-mono text-[10px] md:text-[11px] tracking-[0.25em] text-foreground/50 hover:text-foreground uppercase transition-colors"
          >
            Games
          </a>
          <a
            href="/#harga"
            className="font-mono text-[10px] md:text-[11px] tracking-[0.25em] text-foreground/50 hover:text-foreground uppercase transition-colors hidden sm:block"
          >
            Harga
          </a>
          <a
            href="/orders"
            className="font-mono text-[10px] md:text-[11px] tracking-[0.25em] text-foreground/50 hover:text-foreground uppercase transition-colors"
          >
            Riwayat
          </a>
        </nav>
      </header>

      <section className="px-4 md:px-8 lg:px-12 pt-5 md:pt-10 pb-6 md:pb-10 max-w-[1400px] mx-auto w-full">
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
    </main>
  )
}
