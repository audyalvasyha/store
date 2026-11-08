"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function CustomerLogout() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function logout() {
    setBusy(true)
    await fetch("/api/akun/logout", { method: "POST" }).catch(() => null)
    window.dispatchEvent(new Event("gas-auth-updated"))
    router.replace("/akun")
    router.refresh()
    setBusy(false)
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="font-mono text-[10px] tracking-[0.15em] uppercase px-4 py-2.5 border border-border text-foreground/50 hover:text-destructive min-h-[40px]"
    >
      {busy ? "Keluar..." : "Keluar"}
    </button>
  )
}
