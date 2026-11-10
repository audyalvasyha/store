"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { formatIDR } from "@/lib/catalog"
import type { PublicCoupon } from "@/lib/coupons"

/**
 * Slot strip di bawah hero:
 * - Ada kupon global aktif → tampilkan promo + tombol salin + CTA checkout.
 * - Belum ada kupon → trust bar (harga final, proses 24/7, jalur resmi).
 * Kupon selama ini cuma kelihatan di checkout, jadi pengunjung nggak punya
 * alasan buat checkout sekarang.
 */
export function PromoStrip({
  coupon,
  gameSlug,
}: {
  coupon: PublicCoupon | null
  gameSlug: string
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle")
  const timer = useRef<number | null>(null)

  const offer = coupon
    ? coupon.kind === "percent"
      ? `Diskon ${coupon.value}%${coupon.maxDiscount ? ` (maks ${formatIDR(coupon.maxDiscount)})` : ""}`
      : `Potongan ${formatIDR(coupon.value)}`
    : ""

  const expiry =
    coupon?.expiresAt
      ? new Date(coupon.expiresAt).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        })
      : null

  if (!coupon) {
    return (
      <section aria-label="Keunggulan Gastros" className="border-y border-border bg-card/60">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 md:px-8 md:py-3 lg:px-12">
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-accent md:text-[10px]">
            [Kenapa Gastros]
          </span>
          <span className="font-mono text-[10px] leading-relaxed text-foreground/60 md:text-[11px]">
            Harga final tanpa biaya tersembunyi
            <span className="mx-1.5 text-foreground/25" aria-hidden="true">/</span>
            Proses otomatis 24/7
            <span className="mx-1.5 text-foreground/25" aria-hidden="true">/</span>
            Jalur resmi publisher
          </span>
          <Link
            href="/games"
            className="ml-auto inline-flex min-h-[34px] items-center font-mono text-[10px] uppercase tracking-[0.15em] text-accent hover:text-foreground md:text-[11px]"
          >
            Pilih game &rarr;
          </Link>
        </div>
      </section>
    )
  }

  const code = coupon.code

  async function copyCode() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard nggak tersedia")
      await navigator.clipboard.writeText(code)
      setCopyState("copied")
    } catch {
      setCopyState("failed")
    }
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopyState("idle"), 2_500)
  }

  return (
    <section
      aria-label="Promo aktif"
      className="border-y border-accent/30 bg-accent/[0.06]"
    >
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 md:px-8 md:py-3 lg:px-12">
        <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-accent md:text-[10px]">
          [Promo]
        </span>
        <span className="font-mono text-[10px] leading-relaxed text-foreground/70 md:text-[11px]">
          <strong className="font-bold text-foreground">{offer}</strong>
          {coupon.minSpend > 0 && ` • min. belanja ${formatIDR(coupon.minSpend)}`}
          {expiry && ` • s/d ${expiry}`}
        </span>

        <button
          type="button"
          onClick={() => void copyCode()}
          className="inline-flex min-h-[34px] items-center gap-2 border border-dashed border-accent/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-accent transition-colors hover:bg-accent hover:text-accent-foreground md:text-[11px]"
        >
          {coupon.code}
          <span className="text-[9px] tracking-normal">
            {copyState === "copied" ? "✓ Tersalin" : copyState === "failed" ? "Salin manual" : "Salin"}
          </span>
        </button>
        <span role="status" className="sr-only">
          {copyState === "copied" ? "Kode kupon disalin" : ""}
        </span>

        <Link
          href={`/top-up/${gameSlug}?coupon=${encodeURIComponent(coupon.code)}#topup-form`}
          className="ml-auto inline-flex min-h-[34px] items-center font-mono text-[10px] uppercase tracking-[0.15em] text-accent hover:text-foreground md:text-[11px]"
        >
          Pakai sekarang &rarr;
        </Link>
      </div>
    </section>
  )
}
