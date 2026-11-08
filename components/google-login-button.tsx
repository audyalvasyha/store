"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

type GoogleIdApi = {
  initialize: (options: {
    client_id: string
    callback: (response: { credential?: string }) => void
    auto_select?: boolean
    cancel_on_tap_outside?: boolean
  }) => void
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: "standard" | "icon"
      theme?: "outline" | "filled_blue" | "filled_black"
      size?: "large" | "medium" | "small"
      text?: "signin_with" | "signup_with" | "continue_with" | "signin"
      shape?: "rectangular" | "pill" | "circle" | "square"
      logo_alignment?: "left" | "center"
      width?: number
    }
  ) => void
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleIdApi
      }
    }
  }
}

const SCRIPT_SRC = "https://accounts.google.com/gsi/client"

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`
    )
    if (existing) {
      if (existing.dataset.loaded === "1") {
        resolve()
        return
      }
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener("error", () => reject(new Error("Google script gagal dimuat")), {
        once: true,
      })
      return
    }

    const script = document.createElement("script")
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => {
      script.dataset.loaded = "1"
      resolve()
    }
    script.onerror = () => reject(new Error("Google script gagal dimuat"))
    document.head.appendChild(script)
  })
}

/** Tombol Google resmi (iframe GIS) + kirim credential ke /api/akun/google. */
export function GoogleLoginButton({ clientId }: { clientId: string }) {
  const router = useRouter()
  const hostRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId) return
    let active = true

    async function setup() {
      try {
        await loadGoogleScript()
        if (!active || !hostRef.current) return
        const googleId = window.google?.accounts?.id
        if (!googleId) {
          setError("Login Google nggak bisa dimuat. Coba refresh halaman.")
          return
        }

        googleId.initialize({
          client_id: clientId,
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: (response) => {
            if (!response.credential) {
              setError("Login Google dibatalkan. Coba lagi.")
              return
            }
            void submitCredential(response.credential)
          },
        })

        const width = Math.min(400, Math.max(220, hostRef.current.clientWidth))
        googleId.renderButton(hostRef.current, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          width,
        })
      } catch {
        if (active) setError("Login Google nggak bisa dimuat. Coba refresh halaman.")
      }
    }

    async function submitCredential(credential: string) {
      setBusy(true)
      setError(null)
      try {
        const res = await fetch("/api/akun/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential }),
        })
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) {
          setError(data.error ?? "Login Google gagal. Coba lagi.")
          setBusy(false)
          return
        }
        window.dispatchEvent(new Event("gas-auth-updated"))
        router.replace("/akun")
        router.refresh()
      } catch {
        setError("Koneksi bermasalah, coba lagi.")
        setBusy(false)
      }
    }

    void setup()
    return () => {
      active = false
    }
  }, [clientId, router])

  return (
    <div className="flex flex-col gap-2">
      <div className="relative w-full max-w-sm">
        <div ref={hostRef} className="min-h-[40px] w-full" />
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/60">
            Memproses...
          </div>
        )}
      </div>
      {error && (
        <p className="font-mono text-[10px] text-destructive leading-relaxed">{error}</p>
      )}
    </div>
  )
}
