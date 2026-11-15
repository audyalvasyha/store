const DEFAULT_CHECK_URL = "https://api.isan.eu.org/nickname/ml"
const FETCH_TIMEOUT_MS = 8_000

export type MlbbCheckResult =
  | {
      ok: true
      valid: boolean
      username?: string
      country?: string
      message?: string
      regionMismatch?: boolean
    }
  | { ok: false; error: string }

export type MlbbExpectedCountry = "malaysia" | "philippines"

/** Normalisasi nama negara dari provider; kosong = tidak bisa divalidasi. */
export function mlbbCountryMatches(
  country: string | undefined,
  expected: MlbbExpectedCountry,
): boolean {
  if (!country?.trim()) return true
  const value = country.trim().toLowerCase()
  return expected === "malaysia"
    ? value === "malaysia" || value === "my"
    : value === "philippines" || value === "ph"
}

type MlbbPayload = {
  success?: boolean
  name?: unknown
  country?: unknown
  message?: unknown
}

/**
 * Parser dipisah dari fetch supaya bisa dites tanpa memanggil provider.
 * Provider membalas success:true + name untuk akun yang ketemu; akun yang
 * nggak ada biasanya success:false dengan pesan not found.
 */
export function parseMlbbCheckPayload(payload: unknown): MlbbCheckResult {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Checker MLBB membalas data yang tidak valid" }
  }

  const data = payload as MlbbPayload
  if (data.success !== true) {
    const message = typeof data.message === "string" ? data.message : ""
    if (/not found|tidak ditemukan|nggak ada|tidak ada|player.*invalid|invalid.*(id|user|player)/i.test(message)) {
      return { ok: true, valid: false, message }
    }
    return { ok: false, error: "Checker MLBB menolak pengecekan" }
  }

  const username = typeof data.name === "string" ? data.name.trim() : ""
  if (!username) return { ok: true, valid: false }

  const country = typeof data.country === "string" ? data.country.trim() : undefined
  return {
    ok: true,
    valid: true,
    username,
    ...(country ? { country } : {}),
  }
}

/**
 * Fallback khusus MLBB (termasuk akun region MY/PH yang tidak dikenali
 * checker APIGames). Endpoint ini publik dan tidak butuh API key, jadi
 * pemanggil tetap wajib memakai cache + rate limit.
 */
export async function checkMlbbAccount({
  userId,
  zoneId,
  expectedCountry,
}: {
  userId: string
  zoneId: string
  expectedCountry?: MlbbExpectedCountry
}): Promise<MlbbCheckResult> {
  try {
    const url = new URL(process.env.MLBB_CHECK_URL ?? DEFAULT_CHECK_URL)
    url.searchParams.set("id", userId)
    url.searchParams.set("server", zoneId)

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) {
      return { ok: false, error: "Checker MLBB sedang tidak tersedia" }
    }

    const payload = await res.json().catch(() => null)
    const result = parseMlbbCheckPayload(payload)
    if (
      result.ok &&
      result.valid &&
      expectedCountry &&
      !mlbbCountryMatches(result.country, expectedCountry)
    ) {
      return { ok: true, valid: false, regionMismatch: true }
    }
    return result
  } catch {
    return { ok: false, error: "Checker MLBB sedang tidak tersedia" }
  }
}
