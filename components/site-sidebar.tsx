"use client"

import { useEffect, useState, type ComponentType } from "react"
import { usePathname } from "next/navigation"

type SheetComponent = ComponentType<{
  open: boolean
  onOpenChange: (open: boolean) => void
  pathname: string
}>

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
  const [SheetComponent, setSheetComponent] = useState<SheetComponent | null>(null)

  const isAdmin = pathname.startsWith("/admin")

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    const openMenu = () => {
      setOpen(true)
      if (SheetComponent) return
      // Import beneran baru jalan setelah menu pertama kali dibuka.
      void import("@/components/site-sidebar-sheet")
        .then((mod) => setSheetComponent(() => mod.SiteSidebarSheet))
        .catch(() => setOpen(false))
    }
    window.addEventListener("gastros:open-sidebar", openMenu)
    return () => window.removeEventListener("gastros:open-sidebar", openMenu)
  }, [SheetComponent])

  if (isAdmin || !SheetComponent) return null

  return (
    <SheetComponent
      open={open}
      onOpenChange={setOpen}
      pathname={pathname}
    />
  )
}
