import { Hero } from "@/components/hero"
import { FeaturedGames } from "@/components/hero-images"
import { MarqueeStrip } from "@/components/marquee-strip"
import { GameGrid } from "@/components/program-grid"
import { PriceList } from "@/components/schedule-block"
import { WhyUs } from "@/components/split-feature"
import { FinalCta } from "@/components/cta-block"
import { Footer } from "@/components/footer"
import { getHeroEvent, getDynamicGames } from "@/lib/content"

export const dynamic = "force-dynamic"

export default async function Page() {
  // Konten live dari MongoDB (admin /admin ngatur ini) — fallback ke katalog statis.
  const [games, heroEvent] = await Promise.all([getDynamicGames(), getHeroEvent()])

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
