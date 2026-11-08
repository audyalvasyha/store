import { Hero } from "@/components/hero"
import { FeaturedGames } from "@/components/hero-images"
import { MarqueeStrip } from "@/components/marquee-strip"
import { GameGrid } from "@/components/program-grid"
import { PriceList } from "@/components/schedule-block"
import { WhyUs } from "@/components/split-feature"
import { TestimonialStrip } from "@/components/testimonial-strip"
import { FaqSection } from "@/components/faq-section"
import { FinalCta } from "@/components/cta-block"
import { Footer } from "@/components/footer"
import { getHeroEvent, getDynamicGames } from "@/lib/content"
import { getLatestReviews, getRatingsByGame } from "@/lib/reviews"
import { filterGames } from "@/lib/catalog"
import { soldCountsByGame } from "@/lib/orders"

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
  const [allGames, heroEvent, latestReviews, ratings] = await Promise.all([
    getDynamicGames(),
    getHeroEvent(),
    // Testimoni = ulasan asli pembeli. DB error → array kosong → section hidden.
    getLatestReviews(12).catch(() => []),
    // Rating per game buat badge bintang di kartu katalog.
    getRatingsByGame().catch(() => ({}) as Record<string, { average: number; count: number }>),
  ])
  const games = filterGames(allGames, String(q ?? ""))
  const shortBySlug = new Map(allGames.map((g) => [g.slug, g.short] as const))
  const testimonials = latestReviews.map((r) => ({
    text: r.comment ?? "",
    name: r.authorName,
    tag: shortBySlug.get(r.gameSlug) ?? r.gameSlug.toUpperCase(),
    rating: r.rating,
  }))
  // Social proof "terjual" bulan ini — gagal DB jangan pernah bikin landing down.
  const sold = await soldCountsByGame().catch(() => ({}) as Record<string, number>)

  return (
    <main className="relative">
      {/* Noise overlay for industrial texture */}
      <div className="noise-overlay" aria-hidden="true" />

      <Hero event={heroEvent} />
      <FeaturedGames games={games} />
      <MarqueeStrip />
      <GameGrid games={games} sold={sold} ratings={ratings} />
      <PriceList games={games} />
      <WhyUs />
      <TestimonialStrip reviews={testimonials} />
      <FaqSection />
      <FinalCta />
      <Footer />
    </main>
  )
}
