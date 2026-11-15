import { NextResponse } from "next/server"
import { getDynamicGame } from "@/lib/content"
import {
  apigamesConfigured,
  checkApigamesUsername,
  isApigamesGameCode,
  type ApigamesCheckResult,
} from "@/lib/apigames"
import { clientIp, rateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

/**
 * Cek ID/nickname game lewat APIGames (fitur yang cuma ada di sana).
 * APIGames menagih Rp5 per pengecekan, jadi endpoint ini:
 * - rate-limit per IP,
 * - cache hasil 10 menit per game+user (cek ulang gratis).
 */
const CACHE_TTL_MS = 10 * 60_000
const CACHE_MAX = 500

const globalForCheckId = globalThis as typeof globalThis & {
  _gasCheckIdCache_?: Map<string, { value: ApigamesCheckResult; expiresAt: number }>
}

const cache: Map<string, { value: ApigamesCheckResult; expiresAt: number }> =
  globalForCheckId._gasCheckIdCache_ ?? new Map()
globalForCheckId._gasCheckIdCache_ = cache

function readCache(key: string): ApigamesCheckResult | null {
  const hit = cache.get(key)
  if (!hit) return null
  if (hit.expiresAt <= Date.now()) {
    cache.delete(key)
    return null
  }
  return hit.value
}

function writeCache(key: string, value: ApigamesCheckResult): void {
  if (cache.size >= CACHE_MAX) cache.clear()
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
}

export async function GET(request: Request) {
  const limit = await rateLimit("games-check-id", clientIp(request), 8, 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak cek ID. Coba lagi dalam ${limit.retryAfter} detik.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    )
  }

  if (!apigamesConfigured()) {
    return NextResponse.json(
      { error: "Cek ID belum aktif (APIGames belum dikonfigurasi)." },
      { status: 503 }
    )
  }

  const { searchParams } = new URL(request.url)
  const slug = String(searchParams.get("game") ?? "").trim()
  const userId = String(searchParams.get("userId") ?? "").trim()
  // Mobile Legends butuh Zone ID; Free Fire tidak.
  const server = String(searchParams.get("server") ?? searchParams.get("zoneId") ?? "").trim()

  if (!/^[A-Za-z0-9._:\-]{4,24}$/.test(userId)) {
    return NextResponse.json({ error: "User ID tidak valid" }, { status: 400 })
  }
  if (server && !/^[A-Za-z0-9]{1,16}$/.test(server)) {
    return NextResponse.json({ error: "Zone ID tidak valid" }, { status: 400 })
  }

  const game = await getDynamicGame(slug)
  if (!game) return NextResponse.json({ error: "Game tidak ditemukan" }, { status: 404 })
  if (!game.apigamesCode || !isApigamesGameCode(game.apigamesCode)) {
    return NextResponse.json(
      { error: `Cek ID belum tersedia untuk ${game.short}.` },
      { status: 400 }
    )
  }
  // APIGames cuma mendukung User ID numerik. Tanpa ini, ID asal-asalan
  // seperti "abcd" bisa dibalas valid:true + username kosong oleh provider.
  if (!/^\d{4,24}$/.test(userId)) {
    return NextResponse.json({ error: "User ID harus berupa angka" }, { status: 400 })
  }
  if (game.needsServer && !server) {
    return NextResponse.json(
      { error: "Zone ID wajib diisi untuk game ini." },
      { status: 400 }
    )
  }
  if (server && !/^\d{1,16}$/.test(server)) {
    return NextResponse.json({ error: "Zone ID harus berupa angka" }, { status: 400 })
  }

  function responseFor(result: ApigamesCheckResult) {
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 })
    }
    if (!result.valid) {
      return NextResponse.json(
        {
          valid: false,
          error: `ID game nggak ditemukan. Cek lagi User ID${server ? " & Zone ID" : ""}-nya.`,
        },
        { status: 404 }
      )
    }
    return NextResponse.json({ valid: true, username: result.username ?? null })
  }

  const cacheKey = `${game.apigamesCode}:${userId}:${server}`
  const cached = readCache(cacheKey)
  if (cached) return responseFor(cached)

  const result = await checkApigamesUsername({
    gameCode: game.apigamesCode,
    userId,
    zoneId: server || undefined,
  })
  if (result.ok) writeCache(cacheKey, result)

  return responseFor(result)
}
