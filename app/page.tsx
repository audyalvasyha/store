import { Hero } from "@/components/hero"
import { FeaturedGames } from "@/components/hero-images"
import { MarqueeStrip } from "@/components/marquee-strip"
import { GameGrid } from "@/components/program-grid"
import { PriceList } from "@/components/schedule-block"
import { WhyUs } from "@/components/split-feature"
import { FinalCta } from "@/components/cta-block"
import { Footer } from "@/components/footer"

export default function Page() {
  return (
    <main className="relative">
      {/* Noise overlay for industrial texture */}
      <div className="noise-overlay" aria-hidden="true" />

      <Hero />
      <FeaturedGames />
      <MarqueeStrip />
      <GameGrid />
      <PriceList />
      <WhyUs />
      <FinalCta />
      <Footer />
    </main>
  )
}
