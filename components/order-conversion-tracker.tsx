"use client"

import { useEffect } from "react"
import { trackPurchase } from "@/lib/marketing-events"

/**
 * Kirim event purchase sekali per order setelah status SELESAI. Disimpan di
 * localStorage supaya reload halaman order tidak bikin transaksi dobel di
 * laporan GA4/Meta/TikTok.
 */
export function OrderConversionTracker({
  code,
  amount,
  quantity,
  gameName,
}: {
  code: string
  amount: number
  quantity: number
  gameName: string
}) {
  useEffect(() => {
    const key = `gastros:purchase:${code}`
    try {
      if (window.localStorage.getItem(key)) return
      window.localStorage.setItem(key, "1")
    } catch {
      // localStorage diblokir: tetap kirim event, walau bisa terhitung ulang.
    }

    trackPurchase({
      transactionId: code,
      value: amount,
      item: {
        id: code,
        name: gameName,
        price: amount / Math.max(1, quantity),
        quantity,
      },
    })
  }, [amount, code, gameName, quantity])

  return null
}
