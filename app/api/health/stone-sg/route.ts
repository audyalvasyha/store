import { NextResponse } from "next/server"

// Probe dijalankan dari Singapore — buat ngisolasi apakah penolakan provider
// bergantung pada region/edge pemanggil (Vercel US East vs Asia).
export const dynamic = "force-dynamic"
export const preferredRegion = "sin1"

export async function GET() {
  const proxyUrl = (process.env.STONE_PROXY_URL ?? "").replace(/\/$/, "")
  if (!proxyUrl) {
    return NextResponse.json({ proxyConfigured: false })
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
    return NextResponse.json({
      region: "sin1",
      status: res.status,
      contentType: res.headers.get("content-type"),
      isJson,
      upstreamStatus: res.headers.get("x-proxy-upstream-status"),
      cfRay: res.headers.get("cf-ray"),
      tookMs: Date.now() - started,
      bodySnippet: raw.replace(/\s+/g, " ").slice(0, 140),
    })
  } catch (err) {
    return NextResponse.json({ region: "sin1", error: String(err), tookMs: Date.now() - started })
  }
}
