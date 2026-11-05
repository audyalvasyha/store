import { NextResponse } from "next/server"
import { clientIp, rateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

/**
 * Health check konfigurasi provider/top-up di runtime.
 * Cuma mengembalikan BOOLEAN + host proxy (bukan secret), jadi aman
 * dipakai buat mastiin env production kebaca setelah deploy.
 *
 * Tambahkan `?probe=1` untuk mencoba satu request live ke proxy
 * (GET /games?limit=1) dan melihat status/sumber responsnya.
 */
export async function GET(request: Request) {
  const proxyUrl = (process.env.STONE_PROXY_URL ?? "").replace(/\/$/, "")
  let host = ""
  try {
    host = proxyUrl ? new URL(proxyUrl).host : ""
  } catch {
    host = "invalid-url"
  }

  const payload: Record<string, unknown> = {
    proxyConfigured: Boolean(host) && host !== "invalid-url",
    proxyHost: host || null,
    proxyPathOk: proxyUrl.includes("/api/merchant/v1"),
    secretConfigured: Boolean(process.env.STONE_PROXY_SECRET),
    keyConfigured: Boolean(process.env.GAMESTONE_API_KEY),
  }

  const probe = new URL(request.url).searchParams.get("probe")
  if (probe && proxyUrl) {
    // Probe nembak request beneran ke provider pakai API key kita — tanpa
    // limit, endpoint ini bisa dipakai siapa aja buat spam provider.
    // 6/menit lebih dari cukup buat diagnosa.
    const probeLimit = await rateLimit("stone-probe", clientIp(request), 6, 60_000)
    if (!probeLimit.ok) {
      payload.probe = { error: `terlalu sering, coba lagi dalam ${probeLimit.retryAfter} detik` }
      return NextResponse.json(payload, { status: 429, headers: { "Retry-After": String(probeLimit.retryAfter) } })
    }
    const started = Date.now()
    try {
      const res = await fetch(`${proxyUrl}/games?limit=1`, {
        headers: {
          "x-api-key": process.env.GAMESTONE_API_KEY ?? "",
          "Content-Type": "application/json",
          ...(process.env.STONE_PROXY_SECRET ? { "x-proxy-secret": process.env.STONE_PROXY_SECRET } : {}),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      })
      const raw = await res.text()
      let isJson = true
      try {
        JSON.parse(raw)
      } catch {
        isJson = false
      }
      payload.probe = {
        status: res.status,
        contentType: res.headers.get("content-type"),
        isJson,
        hstsUpstreamStatus: res.headers.get("x-proxy-upstream-status"),
        cfRay: res.headers.get("cf-ray"),
        tookMs: Date.now() - started,
        bodySnippet: raw.replace(/\s+/g, " ").slice(0, 160),
      }
    } catch (err) {
      payload.probe = { error: String(err), tookMs: Date.now() - started }
    }
  }

  return NextResponse.json(payload)
}
