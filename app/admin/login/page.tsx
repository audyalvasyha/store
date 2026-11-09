import { redirect } from "next/navigation"
import Link from "next/link"
import { cookies } from "next/headers"
import { countAdmins, getAdminEmail, SESSION_COOKIE } from "@/lib/admin-auth"
import { AdminLoginForm } from "@/components/admin-login-form"

export const dynamic = "force-dynamic"

export const metadata = { title: "Admin Login // GASTROS" }

function safeAdminReturnTo(value: string | undefined): string {
  if (!value) return "/admin"
  if (value === "/admin" || value === "/admin/artikel" || value.startsWith("/admin/artikel/")) {
    if (!value.startsWith("//") && !/[\u0000-\u001f\u007f]/.test(value)) return value
  }
  return "/admin"
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>
}) {
  const { returnTo } = await searchParams
  const target = safeAdminReturnTo(returnTo)
  const jar = await cookies()
  const email = await getAdminEmail(jar.get(SESSION_COOKIE)?.value)
  if (email) redirect(target)

  // Sandbox/preview tanpa MONGODB_URI: countAdmins meledak → 500 mentah.
  // Halaman login harus tetap hidup dan jujur bilang DB nggak nyambung.
  let first = false
  let dbOk = true
  try {
    first = (await countAdmins()) === 0
  } catch {
    dbOk = false
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4">
      <div className="noise-overlay" aria-hidden="true" />
      <div className="flex flex-col items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div className="absolute inset-0 bg-accent" />
            <span className="relative font-sans text-lg text-accent-foreground leading-none">G$</span>
          </div>
          <span className="font-mono text-[10px] tracking-[0.3em] text-foreground uppercase">Gastros</span>
        </Link>
        {dbOk ? (
          <AdminLoginForm first={first} returnTo={target} />
        ) : (
          <div className="border border-border bg-card p-5 max-w-md text-center">
            <span className="font-mono text-[10px] text-accent tracking-[0.25em] uppercase block mb-2">
              [Sistem Sibuk]
            </span>
            <p className="font-mono text-[11px] text-foreground/60 leading-relaxed">
              Database lagi nggak nyambung, jadi login admin belum bisa
              di environment ini. Halaman admin tetap jalan normal di
              production (www.gastros.id/admin).
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
