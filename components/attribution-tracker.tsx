"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { captureAttribution } from "@/lib/attribution"

/**
 * Komponen tanpa UI: setiap pindah halaman, cek apakah URL membawa UTM baru.
 * Kalau ada, simpan sebagai atribusi campaign terakhir untuk checkout.
 */
export function AttributionTracker() {
  const pathname = usePathname()

  useEffect(() => {
    captureAttribution()
  }, [pathname])

  return null
}
