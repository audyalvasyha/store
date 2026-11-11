import Script from "next/script"
import { normalizeAdsenseClient } from "@/lib/ads"

/**
 * Script AdSense global, tapi hanya dimuat kalau publisher ID valid.
 * Tanpa env NEXT_PUBLIC_ADSENSE_CLIENT, halaman tetap bersih tanpa request
 * ke Google.
 */
export function AdSenseScript() {
  const client = normalizeAdsenseClient(process.env.NEXT_PUBLIC_ADSENSE_CLIENT)
  if (!client) return null

  return (
    <Script
      id="gastros-adsense"
      async
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
    />
  )
}
