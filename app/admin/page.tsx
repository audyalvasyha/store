import Link from "next/link"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { getAdminEmail, SESSION_COOKIE } from "@/lib/admin-auth"
import { getHeroEvent, getDynamicGames } from "@/lib/content"
import { AdminPanel } from "@/components/admin-panel"
import { AdminCoupons } from "@/components/admin-coupons"

export const dynamic = "force-dynamic"

export const metadata = { title: "Admin // GASTROS" }

export default async function AdminPage() {
  const jar = await cookies()
  const email = await getAdminEmail(jar.get(SESSION_COOKIE)?.value)
  if (!email) redirect("/admin/login")

  const [hero, games] = await Promise.all([getHeroEvent(), getDynamicGames()])

  return (
    <main className="relative min-h-screen py-5 md:py-8">
      <div className="noise-overlay" aria-hidden="true" />
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 w-full">
        <div className="flex items-center justify-between mb-5 md:mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-accent" />
              <span className="relative font-sans text-lg text-accent-foreground leading-none">G$</span>
            </div>
            <span className="font-mono text-[10px] tracking-[0.3em] text-foreground uppercase">Gastros</span>
          </Link>
          <Link
            href="/"
            className="font-mono text-[10px] tracking-[0.2em] text-foreground/50 hover:text-foreground uppercase"
          >
            Lihat Site &rarr;
          </Link>
        </div>

        <AdminPanel email={email} hero={hero} games={games} />

        <div className="mt-6 md:mt-8">
          <AdminCoupons />
        </div>
      </div>
    </main>
  )
}
