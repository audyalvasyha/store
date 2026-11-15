import { NextResponse } from "next/server"
import { getDynamicGame } from "@/lib/content"
import {
  apigamesConfigured,
  checkApigamesUsername,
  isApigamesGameCode,
  type ApigamesCheckResult,
} from "@/lib/apigames"
import { checkMlbbAccount } from "@/lib/mlbb-check"
import { clientIp, rateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

/**
 * Cek ID/nickname game. APIGames jadi provider utama untuk MLBB global/ID
 * dan Free Fire. APIGames belum mengenali akun MLBB region MY/PH, jadi
 * varian itu memakai fallback MLBB; varian utama juga fallback kalau APIGames
 * bilang tidak ditemukan. APIGames menagih Rp5/cek, jadi endpoint ini tetap:
 * - rate-limit per IP,
 * - cache hasil 10 menit per game+user (cek ulang gratis).
 */
const CACHE_TTL_MS = 10 * 60_000
const CACHE_MAX = 500

type CheckIdResult = ApigamesCheckResult & { regionMismatch?: boolean }

const globalForCheckId = globalThis as typeof globalThis & {
  _gasCheckIdCache_?: Map<string, { value: CheckIdResult; expiresAt: number }>
}

const cache: Map<string, { value: CheckIdResult; expiresAt: number }> =
  globalForCheckId._gasCheckIdCache_ ?? new Map()

// APIGames checker MLBB tidak mengenali akun region MY/PH. Untuk katalog ini
// langsung pakai fallback supaya tidak membuang biaya cek APIGames.
const MLBB_FALLBACK_ONLY_SLUGS = new Set([
  "mobile-legends-bang-bang-my",
  "mobile-legends-bang-bang-my-partner",
  "mobile-legends-bang-bang-ph",
])

// Pastikan akun yang dicek memang region katalog yang dipilih. Tanpa ini,
// akun Indonesia bisa tampil "valid" di katalog MY padahal top-up-nya bisa gagal.
const MLBB_EXPECTED_COUNTRY = new Map<string, "malaysia" | "philippines">([
  ["mobile-legends-bang-bang-my", "malaysia"],
  ["mobile-legends-bang-bang-my-partner", "malaysia"],
  ["mobile-legends-bang-bang-ph", "philippines"],
])
globalForCheckId._gasCheckIdCache_ = cache

function readCache(key: string): CheckIdResult | null {
  const hit = cache.get(key)
  if (!hit) return null
  if (hit.expiresAt <= Date.now()) {
    cache.delete(key)
    return null
  }
  return hit.value
}

function writeCache(key: string, value: CheckIdResult): void {
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
  // MLBB punya fallback independen; game lain tetap butuh kredensial APIGames.
  if (game.apigamesCode !== "mobilelegend" && !apigamesConfigured()) {
    return NextResponse.json(
      { error: "Cek ID belum aktif (APIGames belum dikonfigurasi)." },
      { status: 503 }
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

  function responseFor(result: CheckIdResult) {
    const headers = { "Cache-Control": "no-store" }
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502, headers })
    }
    if (!result.valid) {
      return NextResponse.json(
        {
          valid: false,
          error: result.regionMismatch
            ? "Akun ini terdaftar di region lain, bukan region katalog ini."
            : `ID game nggak ditemukan. Cek lagi User ID${server ? " & Zone ID" : ""}-nya.`,
        },
        { status: result.regionMismatch ? 422 : 404, headers }
      )
    }
    return NextResponse.json(
      { valid: true, username: result.username ?? null },
      { headers }
    )
  }

  // Slug ikut masuk key: hasil katalog MY/PH punya validasi region sendiri,
  // jangan sampai cache katalog utama membocorkan hasil ke katalog region.
  const cacheKey = `${game.slug}:${game.apigamesCode}:${userId}:${server}`
  const cached = readCache(cacheKey)
  if (cached) return responseFor(cached)

  const isMlbb = game.apigamesCode === "mobilelegend"
  const useFallbackOnly = isMlbb && MLBB_FALLBACK_ONLY_SLUGS.has(game.slug)
  const expectedCountry = MLBB_EXPECTED_COUNTRY.get(game.slug)

  let result: CheckIdResult = useFallbackOnly
    ? await checkMlbbAccount({ userId, zoneId: server, expectedCountry })
    : await checkApigamesUsername({
        gameCode: game.apigamesCode,
        userId,
        zoneId: server || undefined,
      })

  // APIGames pernah menganggap akun MLBB yang valid (mis. region MY) sebagai
  // tidak ditemukan. Kalau hasilnya invalid/error, coba checker MLBB publik
  // sebelum menyerah. Kalau fallback juga error, pertahankan hasil APIGames.
  if (!useFallbackOnly && isMlbb && (!result.ok || !result.valid)) {
    const fallback = await checkMlbbAccount({ userId, zoneId: server, expectedCountry })
    if (fallback.ok) result = fallback
  }

  if (result.ok) writeCache(cacheKey, result)

  return responseFor(result)
}
