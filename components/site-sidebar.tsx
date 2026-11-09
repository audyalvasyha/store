"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ARTICLE_INDEX } from "@/lib/article-index"
import { WA_NUMBER } from "@/lib/catalog"

const MAIN_LINKS = [
  { label: "Beranda", href: "/" },
  { label: "Semua Game", href: "/games" },
  { label: "Artikel & Panduan", href: "/artikel" },
  { label: "Riwayat Order", href: "/orders" },
  { label: "Akun Saya", href: "/akun" },
]

const GAME_LINKS = [
  { label: "Mobile Legends", href: "/top-up/mobile-legends" },
  { label: "Free Fire", href: "/top-up/free-fire" },
  { label: "Call of Duty Mobile", href: "/top-up/call-of-duty-mobile" },
  { label: "Valorant", href: "/top-up/valorant" },
  { label: "Roblox", href: "/top-up/roblox" },
]

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SiteSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [latest, setLatest] = useState<Array<{ slug: string; title: string }>>(() =>
    ARTICLE_INDEX.slice(0, 3).map((article) => ({ slug: article.slug, title: article.title }))
  )

  // Home membuka drawer ini lewat tombol menu di hero; admin punya navigasi sendiri.
  const isHome = pathname === "/"
  const isAdmin = pathname.startsWith("/admin")

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Sidebar ikut artikel terbaru yang di-publish dari admin, dengan fallback
  // statis kalau API/DB sedang nggak tersedia.
  useEffect(() => {
    if (isAdmin) return
    const controller = new AbortController()

    async function loadLatest() {
      try {
        const res = await fetch("/api/articles", {
          cache: "no-store",
          signal: controller.signal,
        })
        if (!res.ok) return
        const data: unknown = await res.json()
        if (typeof data !== "object" || data === null) return
        const raw = (data as { articles?: unknown }).articles
        if (!Array.isArray(raw)) return

        const next = raw
          .flatMap((item) => {
            if (typeof item !== "object" || item === null) return []
            const record = item as { slug?: unknown; title?: unknown }
            if (typeof record.slug !== "string" || typeof record.title !== "string") return []
            return [{ slug: record.slug, title: record.title }]
          })
          .slice(0, 3)

        setLatest(next)
      } catch {
        // Abort / offline: biarkan fallback statis tetap tampil.
      }
    }

    void loadLatest()
    return () => controller.abort()
  }, [isAdmin, pathname])

  useEffect(() => {
    const openMenu = () => setOpen(true)
    window.addEventListener("gastros:open-sidebar", openMenu)
    return () => window.removeEventListener("gastros:open-sidebar", openMenu)
  }, [])

  if (isAdmin) return null

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {!isHome && (
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Buka menu navigasi"
            className="fixed bottom-4 left-4 z-40 flex min-h-[44px] items-center gap-2 border border-border bg-background/95 px-3 py-2.5 font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/75 shadow-lg backdrop-blur transition-colors hover:border-accent hover:text-foreground lg:hidden"
          >
            <span className="flex w-4 flex-col gap-1" aria-hidden="true">
              <span className="h-px w-full bg-current" />
              <span className="h-px w-full bg-current" />
              <span className="h-px w-3/4 bg-current" />
            </span>
            Menu
          </button>
        </SheetTrigger>
      )}

      <SheetContent
        side="left"
        className="w-[88vw] max-w-sm overflow-y-auto border-r border-border bg-background p-0 text-foreground"
      >
        <div className="border-b border-border bg-card px-5 pb-5 pt-6">
          <SheetTitle className="flex items-center gap-2 font-sans text-2xl uppercase leading-none tracking-tight">
            <span className="flex h-7 w-7 items-center justify-center bg-accent text-sm text-accent-foreground">
              G$
            </span>
            Navigasi
          </SheetTitle>
          <SheetDescription className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-foreground/35">
            Gastros // Game Top Up Center
          </SheetDescription>
        </div>

        <nav aria-label="Menu situs" className="px-5 py-5">
          <span className="mb-2 block font-mono text-[9px] uppercase tracking-[0.2em] text-accent">
            [Jelajahi]
          </span>
          <div className="flex flex-col">
            {MAIN_LINKS.map((link, index) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(pathname, link.href) ? "page" : undefined}
                className={`flex min-h-[44px] items-center gap-3 border-b border-border/60 py-2 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors ${
                  isActive(pathname, link.href)
                    ? "text-accent"
                    : "text-foreground/65 hover:text-foreground"
                }`}
              >
                <span className="w-5 text-[9px] text-foreground/25">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {link.label}
                <span className="ml-auto text-accent" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </div>
        </nav>

        <div className="border-t border-border px-5 py-5">
          <span className="mb-2 block font-mono text-[9px] uppercase tracking-[0.2em] text-accent">
            [Game Populer]
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {GAME_LINKS.map((game) => (
              <Link
                key={game.href}
                href={game.href}
                onClick={() => setOpen(false)}
                className="flex min-h-[40px] items-center border border-border bg-card px-2.5 py-2 font-mono text-[9px] leading-tight text-foreground/60 transition-colors hover:border-accent hover:text-foreground"
              >
                {game.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t border-border px-5 py-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-accent">
              [Artikel Terbaru]
            </span>
            <Link
              href="/artikel"
              onClick={() => setOpen(false)}
              className="font-mono text-[8px] uppercase tracking-[0.12em] text-foreground/35 hover:text-foreground"
            >
              Semua →
            </Link>
          </div>
          <div className="flex flex-col">
            {latest.length === 0 ? (
              <span className="border-b border-border/60 py-2.5 font-mono text-[10px] leading-relaxed text-foreground/30">
                Belum ada artikel published.
              </span>
            ) : (
              latest.map((article) => (
                <Link
                  key={article.slug}
                  href={`/artikel/${article.slug}`}
                  onClick={() => setOpen(false)}
                  className="border-b border-border/60 py-2.5 font-mono text-[10px] leading-relaxed text-foreground/55 transition-colors last:border-b-0 hover:text-foreground"
                >
                  {article.title}
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="border-t border-border bg-card px-5 py-5">
          <span className="mb-2 block font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/35">
            [Butuh bantuan?]
          </span>
          <a
            href={`https://wa.me/${WA_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] w-full items-center justify-center bg-accent px-3 py-2.5 font-mono text-[9px] uppercase tracking-[0.18em] text-accent-foreground transition-opacity hover:opacity-85"
          >
            Chat CS via WhatsApp
          </a>
          <p className="mt-3 font-mono text-[9px] leading-relaxed text-foreground/30">
            Layanan 24 jam · pembayaran QRIS, e-wallet, dan transfer bank.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
