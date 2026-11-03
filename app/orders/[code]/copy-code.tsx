"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Tombol copy kode order di halaman status — biar user gak salah
 * ngasih kode ke CS (typo gara-gara ketik manual) & gampang share.
 */
export function CopyOrderCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    return () => clearTimeout(timer.current)
  }, [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard API bisa gagal (permission / browser tua) — diam saja,
      // user tinggal select manual dari judul.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Salin kode order ${code}`}
      className={`shrink-0 inline-flex items-center gap-1.5 border px-2.5 py-1.5 font-mono text-[9px] md:text-[10px] tracking-[0.2em] uppercase transition-colors cursor-pointer ${
        copied
          ? "border-accent/70 text-accent"
          : "border-border text-foreground/50 hover:text-accent hover:border-accent/60"
      }`}
    >
      {copied ? "✓ Tersalin" : "⧉ Copy Kode"}
    </button>
  )
}
