"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

/**
 * Polling status order lokal via /api/orders?code=...
 * Halaman di-refresh otomatis kalau statusnya berubah (sync Gamestone).
 * Sekalian render indikator "STATUS LIVE" kecil biar user tahu halaman
 * nggak stale — hilang otomatis pas status sudah final.
 */
export function StatusPoller({ code }: { code: string }) {
  const router = useRouter()
  const [live, setLive] = useState(true)

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
          setLive(false)
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

  if (!live) return null
  return (
    <div className="flex items-center gap-2 mt-2 font-mono text-[9px] md:text-[10px] tracking-[0.2em] text-foreground/40 uppercase">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
      </span>
      Status live &mdash; auto update
    </div>
  )
}
