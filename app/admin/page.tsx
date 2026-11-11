import Link from "next/link"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { getAdminEmail, SESSION_COOKIE } from "@/lib/admin-auth"
import { getHeroEvent, getDynamicGames, getTopUpJugaConfig } from "@/lib/content"
import { getEventSlides } from "@/lib/event-carousel-db"
import { getAdminStats, type AdminStats } from "@/lib/analytics"
import { listAdminOrders, listCashbackOrders, type AdminOrder } from "@/lib/orders"
import { AdminPanel } from "@/components/admin-panel"
import { AdminCoupons } from "@/components/admin-coupons"
import { BrandLogo } from "@/components/brand-logo"

export const dynamic = "force-dynamic"

export const metadata = { title: "Admin // GASTROS" }

export default async function AdminPage() {
  const jar = await cookies()
  const email = await getAdminEmail(jar.get(SESSION_COOKIE)?.value)
  if (!email) redirect("/admin/login")

  const [hero, eventSlides, games, topUpJuga, stats, cashbackOrders, orders] = await Promise.all([
    getHeroEvent(),
    getEventSlides(false),
    getDynamicGames(),
    getTopUpJugaConfig(),
    // Dashboard statistik: DB error jangan bikin halaman admin down.
    getAdminStats().catch((): AdminStats | null => null),
    // Antrean cashback juga jangan menjatuhkan seluruh halaman admin.
    listCashbackOrders().catch(() => []),
    // Order monitor read-only — DB error cukup tampil sebagai list kosong.
    listAdminOrders().catch((): AdminOrder[] => []),
  ])

  return (
    <main className="relative min-h-screen py-5 md:py-8">
      <div className="noise-overlay" aria-hidden="true" />
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 w-full">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 md:mb-8">
          <BrandLogo compact subtitle="Admin Panel" className="shrink-0" />
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
          orders={orders}
        />

        <div className="mt-6 md:mt-8">
          <AdminCoupons />
        </div>
      </div>
    </main>
  )
}
