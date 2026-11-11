"use client"

import { useEffect, useRef } from "react"
import { normalizeAdsenseClient, normalizeAdSlot } from "@/lib/ads"

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>
  }
}

/**
 * Satu unit iklan manual. Tinggi minimum dipatok supaya iklan yang belum
 * terisi nggak bikin layout artikel loncat (CLS).
 */
export function AdSlot({
  slot,
  format = "auto",
  layout,
  className = "",
  minHeightClassName = "min-h-[120px]",
}: {
  slot?: string | null
  format?: "auto" | "fluid" | "rectangle"
  layout?: "in-article"
  className?: string
  minHeightClassName?: string
}) {
  const client = normalizeAdsenseClient(process.env.NEXT_PUBLIC_ADSENSE_CLIENT)
  const slotId = normalizeAdSlot(slot)
  const pushedSlot = useRef<string | null>(null)

  useEffect(() => {
    if (!client || !slotId || pushedSlot.current === slotId) return
    pushedSlot.current = slotId
    try {
      // Antrian ini aman dipanggil sebelum script AdSense selesai dimuat;
      // script Google akan memprosesnya saat ready.
      window.adsbygoogle = window.adsbygoogle || []
      window.adsbygoogle.push({})
    } catch {
      // Ad blocker / CSP yang memblokir script: biarkan slot kosong, jangan
      // sampai error iklan menjatuhkan halaman artikel.
    }
  }, [client, slotId])

  if (!client || !slotId) return null

  return (
    <div className={`w-full ${className}`}>
      <span className="mb-1.5 block font-mono text-[8px] uppercase tracking-[0.2em] text-foreground/30">
        Iklan
      </span>
      <ins
        className={`adsbygoogle block w-full ${minHeightClassName}`}
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-ad-layout={layout}
        data-full-width-responsive="true"
      />
    </div>
  )
}
