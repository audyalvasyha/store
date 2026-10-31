import { Hero } from "@/components/hero"
import { FeaturedGames } from "@/components/hero-images"
import { MarqueeStrip } from "@/components/marquee-strip"
import { GameGrid } from "@/components/program-grid"
import { PriceList } from "@/components/schedule-block"
import { WhyUs } from "@/components/split-feature"
import { FinalCta } from "@/components/cta-block"
import { Footer } from "@/components/footer"
import { getHeroEvent, getDynamicGames } from "@/lib/content"
import { filterGames } from "@/lib/catalog"

// ISR: cache 30 detik — katalog tetap segar, tapi ga nge-hit DB tiap request.
export const revalidate = 30

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  // Konten live dari MongoDB (admin /admin ngatur ini) — fallback ke katalog statis.
  // ?q= ngering semua section game (featured, grid, price list).
  const [allGames, heroEvent] = await Promise.all([getDynamicGames(), getHeroEvent()])
  const games = filterGames(allGames, String(q ?? ""))

  return (
    <main className="relative">
      {/* Noise overlay for industrial texture */}
      <div className="noise-overlay" aria-hidden="true" />

      <Hero event={heroEvent} />
      <FeaturedGames games={games} />
      <MarqueeStrip />
      <GameGrid games={games} />
      <PriceList games={games} />
      <WhyUs />
      <FinalCta />
      <Footer />
    </main>
  )
}
