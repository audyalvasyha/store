import crypto from "node:crypto"

/**
 * Health check membeberkan konfigurasi provider dan bisa memicu request
 * berbayar ke Gamestone. Endpoint ini bukan untuk publik: wajib token.
 * Kirim lewat header `x-health-token` atau `Authorization: Bearer <token>`.
 */
export function healthTokenConfigured(): boolean {
  return Boolean(process.env.HEALTH_CHECK_TOKEN?.trim())
}

export function healthAuthorized(request: Request): boolean {
  const expected = process.env.HEALTH_CHECK_TOKEN?.trim() ?? ""
  if (!expected) return false

  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]
  // Jangan terima token di query string: URL gampang bocor ke log/Referer.
  const supplied =
    request.headers.get("x-health-token")?.trim() || bearer?.trim() || ""
  if (!supplied) return false

  const a = Buffer.from(expected)
  const b = Buffer.from(supplied)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
