"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export function LogoutAllButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function logoutAll() {
    if (busy) return
    const ok = window.confirm(
      "Keluar dari semua perangkat? Semua sesi login akun ini akan dihapus dan kamu harus masuk lagi."
    )
    if (!ok) return

    setBusy(true)
    await fetch("/api/akun/logout-all", { method: "POST" }).catch(() => null)
    window.dispatchEvent(new Event("gas-auth-updated"))
    router.replace("/akun")
    router.refresh()
    setBusy(false)
  }

  return (
    <button
      type="button"
      onClick={() => void logoutAll()}
      disabled={busy}
      className="inline-flex min-h-[40px] items-center border border-destructive/50 px-4 py-2.5 font-mono text-[10px] tracking-[0.15em] uppercase text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
    >
      {busy ? "Memproses..." : "Keluar dari semua perangkat"}
    </button>
  )
}
