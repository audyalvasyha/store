"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import { WA_NUMBER } from "@/lib/catalog"

const MAIN_LINKS = [
  { label: "Beranda", href: "/" },
  { label: "Semua Game", href: "/games" },
  { label: "Artikel & Panduan", href: "/artikel" },
  { label: "Riwayat Order", href: "/orders" },
  { label: "Akun Saya", href: "/akun" },
]

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Tombol menu untuk dipasang di header halaman publik. */
export function SidebarMenuButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("gastros:open-sidebar"))}
      aria-label="Buka menu navigasi"
      aria-haspopup="dialog"
      className={`inline-flex min-h-[36px] min-w-[36px] shrink-0 items-center justify-center border border-border bg-card/40 p-2 text-foreground/70 transition-colors hover:border-accent hover:text-foreground lg:hidden ${className}`}
    >
      <span className="flex w-4 flex-col gap-1" aria-hidden="true">
        <span className="h-px w-full bg-current" />
        <span className="h-px w-full bg-current" />
        <span className="h-px w-3/4 bg-current" />
      </span>
    </button>
  )
}

export function SiteSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isAdmin = pathname.startsWith("/admin")

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    const openMenu = () => setOpen(true)
    window.addEventListener("gastros:open-sidebar", openMenu)
    return () => window.removeEventListener("gastros:open-sidebar", openMenu)
  }, [])

  if (isAdmin) return null

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="left"
        className="flex w-[82vw] max-w-[300px] flex-col gap-0 overflow-y-auto border-r border-border bg-background p-0 text-foreground"
      >
        <div className="flex items-start justify-between border-b border-border px-4 pb-4 pr-12 pt-5">
          <div>
            <SheetTitle className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground">
              Menu
            </SheetTitle>
            <SheetDescription className="sr-only">
              Navigasi situs Gastros
            </SheetDescription>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/25">
            G$
          </span>
        </div>

        <nav aria-label="Menu situs" className="flex flex-col p-2">
          {MAIN_LINKS.map((link) => {
            const active = isActive(pathname, link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[44px] items-center justify-between border-b border-border/40 px-3 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors last:border-b-0 ${
                  active
                    ? "bg-card text-accent"
                    : "text-foreground/60 hover:bg-card hover:text-foreground"
                }`}
              >
                {link.label}
                {active && (
                  <span className="h-1.5 w-1.5 bg-accent" aria-hidden="true" />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto border-t border-border p-3">
          <a
            href={`https://wa.me/${WA_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[44px] items-center justify-between border border-border px-3 font-mono text-[9px] uppercase tracking-[0.14em] text-foreground/55 transition-colors hover:border-accent hover:text-foreground"
          >
            Butuh bantuan?
            <span className="text-accent">WhatsApp &rarr;</span>
          </a>
        </div>
      </SheetContent>
    </Sheet>
  )
}
