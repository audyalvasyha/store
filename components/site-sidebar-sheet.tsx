"use client"

import Link from "next/link"
import { X } from "lucide-react"
import { BrandMark } from "@/components/brand-mark"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import { WA_NUMBER } from "@/lib/catalog"

const MAIN_LINKS = [
  { label: "Beranda", href: "/" },
  { label: "Semua Game", href: "/games" },
  { label: "Artikel & Panduan", href: "/artikel" },
  { label: "Tentang Gastros", href: "/tentang" },
  { label: "Riwayat Order", href: "/orders" },
  { label: "Akun Saya", href: "/akun" },
]

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SiteSidebarSheet({
  open,
  onOpenChange,
  pathname,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pathname: string
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        hideClose
        className="flex w-[82vw] max-w-[300px] flex-col gap-0 overflow-y-auto border-r border-border bg-background p-0 text-foreground"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark className="h-7 w-7 shrink-0" />
            <div className="min-w-0">
              <SheetTitle className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground">
                Menu
              </SheetTitle>
              <SheetDescription className="sr-only">
                Navigasi situs Gastros
              </SheetDescription>
            </div>
          </div>
          <SheetClose className="flex h-11 w-11 shrink-0 items-center justify-center border border-border bg-card/40 text-foreground/60 transition-colors hover:border-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background">
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Tutup menu</span>
          </SheetClose>
        </div>

        <nav aria-label="Menu situs" className="flex flex-col p-2">
          {MAIN_LINKS.map((link) => {
            const active = isActive(pathname, link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => onOpenChange(false)}
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
