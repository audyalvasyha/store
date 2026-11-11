import Link from "next/link"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AdminArticlesList } from "@/components/admin-articles-list"
import { getAdminEmail, SESSION_COOKIE } from "@/lib/admin-auth"
import { getAdminArticles, type AdminArticle } from "@/lib/articles-db"
import { BrandLogo } from "@/components/brand-logo"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Kelola Artikel // GASTROS",
  description: "Editorial workspace untuk mengelola halaman artikel Gastros.",
}

export default async function AdminArticlesPage() {
  const jar = await cookies()
  const email = await getAdminEmail(jar.get(SESSION_COOKIE)?.value)
  if (!email) redirect("/admin/login?returnTo=/admin/artikel")

  let articles: AdminArticle[] = []
  let dbError: string | null = null

  try {
    articles = await getAdminArticles()
  } catch {
    dbError =
      "Database artikel nggak bisa diakses sekarang. Coba refresh setelah koneksi MongoDB pulih."
  }

  return (
    <main className="relative min-h-screen py-5 md:py-8">
      <div className="noise-overlay" aria-hidden="true" />
      <div className="mx-auto w-full max-w-[1400px] px-4 md:px-8 lg:px-12">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4 md:mb-8">
          <BrandLogo
            href="/admin"
            compact
            subtitle="Editorial workspace"
            ariaLabel="Kembali ke panel admin"
            className="shrink-0"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/artikel"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[40px] items-center justify-center border border-border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-foreground/50 transition-colors hover:border-accent hover:text-foreground"
            >
              Lihat publik ↗
            </Link>
            <Link
              href="/admin"
              className="inline-flex min-h-[40px] items-center justify-center border border-border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-foreground/50 transition-colors hover:border-accent hover:text-foreground"
            >
              Panel admin
            </Link>
          </div>
        </header>

        <section className="mb-5 flex flex-col gap-4 border-b border-border pb-5 md:mb-8 md:flex-row md:items-end md:justify-between md:pb-8">
          <div>
            <span className="mb-2 block font-mono text-[9px] uppercase tracking-[0.22em] text-accent">
              [Editorial / CMS]
            </span>
            <h1 className="font-sans text-5xl uppercase leading-[0.84] tracking-tighter text-foreground md:text-7xl">
              Kelola Artikel<span className="text-accent">.</span>
            </h1>
            <p className="mt-3 max-w-xl font-mono text-[10px] leading-relaxed text-foreground/45 md:text-xs">
              Tulis, atur tampilan, dan publish halaman artikel. Semua perubahan
              langsung masuk ke halaman publik setelah disimpan.
            </p>
          </div>
          <Link
            href="/admin/artikel/baru"
            className="inline-flex min-h-[48px] shrink-0 items-center justify-center bg-accent px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-foreground transition-opacity hover:opacity-85"
          >
            + Tulis artikel baru
          </Link>
        </section>

        <AdminArticlesList articles={articles} dbError={dbError} />

        <p className="mt-6 border-t border-border pt-4 font-mono text-[9px] leading-relaxed text-foreground/25">
          Login sebagai {email}. Halaman admin nggak diindeks mesin pencari.
          Versi default artikel lama tetap aman dan bisa dikembalikan kapan saja.
        </p>
      </div>
    </main>
  )
}
