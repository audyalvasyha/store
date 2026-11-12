/**
 * Atribusi campaign UTM.
 *
 * Nilai UTM disimpan di localStorage selama 30 hari supaya user yang datang
 * dari link bio/IG/TikTok tetap tercatat walaupun pindah halaman sebelum
 * checkout. Tidak ada PII yang disimpan di sini — cuma source/medium/campaign.
 */
export const ATTRIBUTION_KEYS = [
  "source",
  "medium",
  "campaign",
  "content",
  "term",
] as const

export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number]
export type Attribution = Partial<Record<AttributionKey, string>>

export const ATTRIBUTION_STORAGE_KEY = "gastros:attribution:v1"
const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000
const MAX_VALUE_LENGTH = 80

function cleanValue(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") return ""
  return String(value)
    .trim()
    .slice(0, MAX_VALUE_LENGTH)
    .replace(/[\u0000-\u001f\u007f]/g, "")
}

/**
 * Ambil hanya field yang dikenal + batasi panjangnya. Source/medium/campaign
 * dinormalisasi lowercase supaya laporan campaign nggak pecah karena kapital.
 */
export function sanitizeAttribution(input: unknown): Attribution {
  if (!input || typeof input !== "object") return {}
  const record = input as Record<string, unknown>
  const out: Attribution = {}

  for (const key of ATTRIBUTION_KEYS) {
    const value = cleanValue(record[key])
    if (!value) continue
    out[key] = key === "content" || key === "term" ? value : value.toLowerCase()
  }

  return out
}

export function hasAttribution(attribution: Attribution): boolean {
  return ATTRIBUTION_KEYS.some((key) => Boolean(attribution[key]))
}

/** Baca `utm_source`, `utm_medium`, dst. dari URLSearchParams. */
export function attributionFromSearchParams(params: URLSearchParams): Attribution {
  const raw: Record<string, string> = {}
  for (const key of ATTRIBUTION_KEYS) {
    const value = params.get(`utm_${key}`)
    if (value) raw[key] = value
  }
  return sanitizeAttribution(raw)
}

/**
 * Tempelkan UTM yang sedang aktif ke link internal. Link eksternal dan anchor
 * dibiarkan apa adanya supaya tidak ada URL aneh di navigasi.
 */
export function appendAttribution(href: string, attribution: Attribution): string {
  if (!hasAttribution(attribution) || !href.startsWith("/")) return href

  const url = new URL(href, "https://gastros.id")
  for (const key of ATTRIBUTION_KEYS) {
    const value = attribution[key]
    if (value) url.searchParams.set(`utm_${key}`, value)
  }
  return `${url.pathname}${url.search}${url.hash}`
}

/** Simpan campaign terakhir. Hanya jalan di browser. */
export function storeAttribution(attribution: Attribution): void {
  if (typeof window === "undefined") return
  const clean = sanitizeAttribution(attribution)
  if (!hasAttribution(clean)) return

  try {
    window.localStorage.setItem(
      ATTRIBUTION_STORAGE_KEY,
      JSON.stringify({ data: clean, expiresAt: Date.now() + ATTRIBUTION_TTL_MS })
    )
  } catch {
    // localStorage bisa diblokir di private mode — tracking tetap opsional.
  }
}

export function getStoredAttribution(): Attribution {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as { data?: unknown; expiresAt?: unknown }
    if (typeof parsed.expiresAt !== "number" || parsed.expiresAt <= Date.now()) {
      window.localStorage.removeItem(ATTRIBUTION_STORAGE_KEY)
      return {}
    }
    return sanitizeAttribution(parsed.data)
  } catch {
    return {}
  }
}

/**
 * Ambil UTM dari URL sekarang. Kalau ada, simpan sebagai campaign terakhir;
 * kalau tidak, pakai campaign tersimpan. Ini yang dikirim saat checkout.
 */
export function getCurrentAttribution(): Attribution {
  if (typeof window === "undefined") return {}

  const fromUrl = attributionFromSearchParams(new URLSearchParams(window.location.search))
  if (hasAttribution(fromUrl)) {
    storeAttribution(fromUrl)
    return fromUrl
  }
  return getStoredAttribution()
}

/** Dipanggil sekali per navigasi oleh <AttributionTracker />. */
export function captureAttribution(): void {
  getCurrentAttribution()
}
