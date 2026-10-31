import { redirect } from "next/navigation"
import Link from "next/link"
import { cookies } from "next/headers"
import { countAdmins, getAdminEmail, SESSION_COOKIE } from "@/lib/admin-auth"
import { AdminLoginForm } from "@/components/admin-login-form"

export const dynamic = "force-dynamic"

export const metadata = { title: "Admin Login // GAS STORE" }

export default async function AdminLoginPage() {
  const jar = await cookies()
  const email = await getAdminEmail(jar.get(SESSION_COOKIE)?.value)
  if (email) redirect("/admin")

  const first = (await countAdmins()) === 0

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4">
      <div className="noise-overlay" aria-hidden="true" />
      <div className="flex flex-col items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div className="absolute inset-0 bg-accent" />
            <span className="relative font-sans text-lg text-accent-foreground leading-none">G$</span>
          </div>
          <span className="font-mono text-[10px] tracking-[0.3em] text-foreground uppercase">Gas Store</span>
        </Link>
        <AdminLoginForm first={first} />
      </div>
    </main>
  )
}
