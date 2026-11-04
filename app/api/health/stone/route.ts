import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Health check konfigurasi provider/top-up di runtime.
 * Cuma mengembalikan BOOLEAN + host proxy (bukan secret), jadi aman
 * dipakai buat mastiin env production kebaca setelah deploy.
 */
export async function GET() {
  const proxyUrl = process.env.STONE_PROXY_URL ?? ""
  let host = ""
  try {
    host = proxyUrl ? new URL(proxyUrl).host : ""
  } catch {
    host = "invalid-url"
  }

  return NextResponse.json({
    proxyConfigured: Boolean(host) && host !== "invalid-url",
    proxyHost: host || null,
    proxyPathOk: proxyUrl.includes("/api/merchant/v1"),
    secretConfigured: Boolean(process.env.STONE_PROXY_SECRET),
    keyConfigured: Boolean(process.env.GAMESTONE_API_KEY),
  })
}
