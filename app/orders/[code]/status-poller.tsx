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

    async function tick() {
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
        if (status === "SELESAI" || status === "GAGAL") stopped = true
      } catch {
        // jaringan bermasalah — coba lagi di tick berikutnya
      }
    }

    tick()
    const id = setInterval(tick, 8000)
    return () => {
      stopped = true
      clearInterval(id)
    }
  }, [code, router])

  return null
}
