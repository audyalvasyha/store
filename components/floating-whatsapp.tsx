"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { WA_NUMBER } from "@/lib/catalog"

const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
  "Halo GASTROS, mau tanya top up game 🎮"
)}`

/**
 * Tombol CS WhatsApp melayang, fix di pojok kanan bawah semua halaman publik.
 * Disembunyiikan di /admin (dan halaman admin lain) biar panel admin nggak ketutup.
 * Delay kecil saat mount biar nggak nyalbin hero yang lagi animasi.
 */
export function FloatingWhatsApp() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  const isAdmin = pathname?.startsWith("/admin")

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1200)
    return () => clearTimeout(t)
  }, [])

  if (isAdmin) return null

  return (
    <a
      href={WA_LINK}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat CS GASTROS via WhatsApp"
      className={`fixed bottom-4 right-4 z-40 group flex items-center gap-2 bg-accent text-accent-foreground pl-3.5 pr-4 py-3 min-h-[48px] shadow-[0_4px_0_0_hsl(0_0%_100%_/_0.15)] hover:bg-foreground hover:text-background transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      {/* Icon WhatsApp inline — biar gak nambah dependensi icon library */}
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="w-5 h-5 shrink-0">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.019-.458.13-.606.132-.132.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.05-.52-.099-.148-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.893c0 2.096.549 4.142 1.595 5.947L0 24l6.335-1.652a11.95 11.95 0 0 0 5.71 1.448h.005c6.585 0 11.946-5.335 11.949-11.893a11.82 11.82 0 0 0-3.479-8.454zM12.05 21.785h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.98.999-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.437-9.885 9.889-9.885a9.82 9.82 0 0 1 7.027 2.91 9.78 9.78 0 0 1 2.903 6.978c-.004 5.45-4.438 9.891-9.936 9.891z" />
      </svg>
      <span className="font-mono text-[10px] tracking-[0.2em] uppercase hidden sm:block">
        Chat CS
      </span>
      {/* Dot notifikasi biar eye-catching */}
      <span className="absolute -top-1 -right-1 w-3 h-3 bg-background border border-accent group-hover:border-background transition-colors" aria-hidden="true" />
    </a>
  )
}
