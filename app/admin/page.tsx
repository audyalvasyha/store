import Link from "next/link"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { getAdminEmail, SESSION_COOKIE } from "@/lib/admin-auth"
import { getHeroEvent, getDynamicGames } from "@/lib/content"
import { AdminPanel } from "@/components/admin-panel"

export const dynamic = "force-dynamic"

export const metadata = { title: "Admin // GAS STORE" }

export default async function AdminPage() {
  const jar = await cookies()
  const email = await getAdminEmail(jar.get(SESSION_COOKIE)?.value)
  if (!email) redirect("/admin/login")

  const [hero, games] = await Promise.all([getHeroEvent(), getDynamicGames()])

  return (
    <main className="relative min-h-screen px-4 md:px-8 lg:px-12 py-5 md:py-8">
      <div className="noise-overlay" aria-hidden="true" />
      <div className="max-w-[1400px] mx-auto w-full">
        <div className="flex items-center justify-between mb-5 md:mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-accent" />
              <span className="relative font-sans text-lg text-accent-foreground leading-none">G$</span>
            </div>
            <span className="font-mono text-[10px] tracking-[0.3em] text-foreground uppercase">Gas Store</span>
          </Link>
          <Link
            href="/"
            className="font-mono text-[10px] tracking-[0.2em] text-foreground/50 hover:text-foreground uppercase"
          >
            Lihat Site &rarr;
          </Link>
        </div>

        <AdminPanel email={email} hero={hero} games={games} />
      </div>
    </main>
  )
}
