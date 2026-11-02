"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Polling status order lokal via /api/orders?code=...
 * Halaman di-refresh otomatis kalau statusnya berubah (sync Gamestone).
 */
export function StatusPoller({ code }: { code: string }) {
  const router = useRouter()

  useEffect(() => {
    let lastStatus: string | null = null
    let stopped = false
    // Dideclare di atas biar tick() pertama (yang bisa langsung “stop”, mis.
    // order sudah SELESAI) tetap bisa clearInterval tanpa kena TDZ.
    let intervalId: ReturnType<typeof setInterval> | undefined

    async function tick() {
      // Tab di background -> user lagi nggak liat; jangan buang request/nitrogen.
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return
      if (stopped) return
      try {
        const res = await fetch(`/api/orders?code=${encodeURIComponent(code)}`, {
          cache: "no-store",
        })
        if (!res.ok) return
        const data = (await res.json()) as { order?: { status?: string } }
        const status = data.order?.status ?? null
        if (lastStatus !== null && status !== lastStatus && !stopped) {
          router.refresh()
        }
        lastStatus = status
        if (status === "SELESAI" || status === "GAGAL") {
          stopped = true
          if (intervalId !== undefined) clearInterval(intervalId)
        }
      } catch {
        // jaringan bermasalah — coba lagi di tick berikutnya
      }
    }

    tick()
    intervalId = setInterval(tick, 8000)
    return () => {
      stopped = true
      if (intervalId !== undefined) clearInterval(intervalId)
    }
  }, [code, router])

  return null
}
