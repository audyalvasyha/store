/**
 * Validasi ID AdSense. Publisher ID bukan rahasia (dipakai di HTML publik),
 * tapi tetap divalidasi supaya env yang salah nggak menghasilkan script rusak
 * atau ads.txt yang tidak valid.
 */
const CLIENT_ID_EXP = /^ca-pub-\d{16}$/
const SLOT_ID_EXP = /^\d{6,12}$/

/** Terima `pub-...` maupun `ca-pub-...`, selalu kembalikan format client. */
export function normalizeAdsenseClient(value?: string | null): string | null {
  const raw = value?.trim()
  if (!raw) return null
  const client = raw.startsWith("ca-") ? raw : `ca-${raw}`
  return CLIENT_ID_EXP.test(client) ? client : null
}

/** Slot ad unit Google AdSense berupa angka (biasanya 10 digit). */
export function normalizeAdSlot(value?: string | null): string | null {
  const raw = value?.trim()
  return raw && SLOT_ID_EXP.test(raw) ? raw : null
}
