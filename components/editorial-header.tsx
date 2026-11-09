import Link from "next/link"
import { AuthNav } from "@/components/auth-nav"
import { SidebarMenuButton } from "@/components/site-sidebar"

const LINKS = [
  { label: "Games", href: "/games", key: "games" },
  { label: "Artikel", href: "/artikel", key: "artikel" },
  { label: "Riwayat", href: "/orders", key: "orders" },
] as const

/** Header ringkas untuk halaman editorial. Nav teks disembunyikan di mobile;
 *  navigasi lengkap tetap tersedia lewat sidebar global. */
export function EditorialHeader({ active }: { active?: "games" | "artikel" | "orders" }) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-4 py-3 md:px-8 md:py-6 lg:px-12">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="GASTROS — Beranda">
          <div className="relative flex h-8 w-8 items-center justify-center">
            <div className="absolute inset-0 bg-accent" />
            <span className="relative font-sans text-lg leading-none text-accent-foreground">G$</span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground">
            Gastros
          </span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-4 md:gap-6" aria-label="Navigasi utama">
          {LINKS.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              aria-current={active === link.key ? "page" : undefined}
              className={`hidden font-mono text-[10px] uppercase tracking-[0.22em] transition-colors sm:block md:text-[11px] ${
                active === link.key
                  ? "text-accent"
                  : "text-foreground/50 hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <AuthNav />
          <SidebarMenuButton />
        </nav>
      </div>
    </header>
  )
}
