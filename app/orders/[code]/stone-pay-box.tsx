"use client"

import { useState } from "react"
import { formatIDR } from "@/lib/catalog"

/**
 * Box pembayaran order Gamestone (payment bawaan).
 * - qris  → QR code dari payment_code (EMV string Gamestone)
 * - lain  → kode bayar (nomor VA / voucher) + tombol copy
 * Styling ngikutin tema brutalist G$ (accent card + mono).
 */
export function StonePayBox({
  method,
  methodLabel,
  paymentCode,
  amount,
  expiredAt,
}: {
  method: string
  methodLabel: string
  paymentCode: string
  amount: number
  expiredAt?: string
}) {
  const [copied, setCopied] = useState(false)
  const isQris = method === "qris"

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(paymentCode)
    } catch {
      // Fallback browser lama: select manual lewat textarea.
      const ta = document.createElement("textarea")
      ta.value = paymentCode
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mb-4 border-2 border-accent bg-background p-4 flex flex-col items-center text-center">
      <span className="font-mono text-[10px] md:text-[11px] text-accent tracking-[0.25em] uppercase">
        {isQris ? "[QRIS] Scan untuk Bayar" : `[${methodLabel}] Kode Bayar`}
      </span>

      {isQris ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=320x320&qzone=2&data=${encodeURIComponent(paymentCode)}`}
          alt="QRIS pembayaran Gamestone"
          width={320}
          height={320}
          className="mt-4 bg-white p-2 w-[240px] md:w-[280px] h-auto"
        />
      ) : (
        <p className="mt-4 font-mono text-xl md:text-3xl text-foreground tabular-nums break-all">
          {paymentCode}
        </p>
      )}

      <p className="font-mono text-[10px] md:text-xs text-foreground/60 leading-relaxed mt-3">
        {isQris
          ? "Scan pakai e-wallet / m-banking (GoPay, DANA, OVO, ShopeePay, semua bank)."
          : `Masukkan kode/nomor ini di aplikasi ${methodLabel}, nominal PERSIS ${formatIDR(amount)}.`}
      </p>

      <p className="font-mono text-lg md:text-xl text-accent tabular-nums mt-1">{formatIDR(amount)}</p>

      <button
        type="button"
        onClick={() => void copyCode()}
        className="mt-4 w-full inline-flex items-center justify-center bg-accent text-accent-foreground font-mono text-[10px] md:text-sm tracking-[0.2em] uppercase px-5 py-3 md:py-3.5 min-h-[44px] hover-glitch hover:scale-[1.02] transition-transform cursor-pointer"
      >
        {copied ? "Tercopy!" : isQris ? "Copy kode QRIS" : `Copy kode ${methodLabel}`}
      </button>

      {expiredAt && (
        <span className="font-mono text-[9px] md:text-[10px] text-foreground/40 tracking-[0.15em] uppercase mt-2">
          Berlaku sampai {new Date(expiredAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </div>
  )
}
