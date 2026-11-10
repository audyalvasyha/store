import Link from "next/link"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { getAdminEmail, SESSION_COOKIE } from "@/lib/admin-auth"
import { getHeroEvent, getDynamicGames, getTopUpJugaConfig } from "@/lib/content"
import { getEventSlides } from "@/lib/event-carousel-db"
import { getAdminStats, type AdminStats } from "@/lib/analytics"
import { listCashbackOrders } from "@/lib/orders"
import { AdminPanel } from "@/components/admin-panel"
import { AdminCoupons } from "@/components/admin-coupons"

export const dynamic = "force-dynamic"

export const metadata = { title: "Admin // GASTROS" }

export default async function AdminPage() {
  const jar = await cookies()
  const email = await getAdminEmail(jar.get(SESSION_COOKIE)?.value)
  if (!email) redirect("/admin/login")

  const [hero, eventSlides, games, topUpJuga, stats, cashbackOrders] = await Promise.all([
    getHeroEvent(),
    getEventSlides(false),
    getDynamicGames(),
    getTopUpJugaConfig(),
    // Dashboard statistik: DB error jangan bikin halaman admin down.
    getAdminStats().catch((): AdminStats | null => null),
    // Antrean cashback juga jangan menjatuhkan seluruh halaman admin.
    listCashbackOrders().catch(() => []),
  ])

  return (
    <main className="relative min-h-screen py-5 md:py-8">
      <div className="noise-overlay" aria-hidden="true" />
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 w-full">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 md:mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-accent" />
              <span className="relative font-sans text-lg text-accent-foreground leading-none">G$</span>
            </div>
            <span className="font-mono text-[10px] tracking-[0.3em] text-foreground uppercase">Gastros</span>
          </Link>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              href="/admin/artikel"
              className="inline-flex min-h-[40px] items-center font-mono text-[9px] uppercase tracking-[0.18em] text-accent hover:opacity-70 md:text-[10px]"
            >
              Kelola Artikel &rarr;
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-[40px] items-center font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/50 hover:text-foreground md:text-[10px]"
            >
              Lihat Site &rarr;
            </Link>
          </div>
        </div>

        <AdminPanel
          email={email}
          hero={hero}
          eventSlides={eventSlides}
          games={games}
          topUpJuga={topUpJuga}
          stats={stats}
          cashbackOrders={cashbackOrders}
        />

        <div className="mt-6 md:mt-8">
          <AdminCoupons />
        </div>
      </div>
    </main>
  )
}
