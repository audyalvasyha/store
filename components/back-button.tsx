"use client"

import { useRouter } from "next/navigation"

/**
 * Tombol Back untuk sub-halaman.
 * - Pakai riwayat browser (router.back()) biar balik ke halaman asal user.
 * - Fallback ke `fallbackHref` (default "/") kalau nggak ada riwayat
 *   (mis. user buka link langsung di tab baru).
 */
export function BackButton({
  label = "Back",
  fallbackHref = "/",
}: {
  label?: string
  fallbackHref?: string
}) {
  const router = useRouter()

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex items-center gap-1.5 border border-border px-2 md:px-3 py-1.5 font-mono text-[10px] md:text-[11px] tracking-[0.25em] text-foreground/50 hover:text-accent hover:border-accent/60 uppercase transition-colors cursor-pointer"
      aria-label={`Kembali ke halaman sebelumnya (${label})`}
    >
      <span aria-hidden="true">&larr;</span>
      {label}
    </button>
  )
}
