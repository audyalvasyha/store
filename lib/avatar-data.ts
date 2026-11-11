/** Browser sudah crop + resize ke 256px, jadi ini cuma batas pengaman. */
export const MAX_AVATAR_DATA_URL = 300_000
export const MAX_AVATAR_BYTES = 220_000

const AVATAR_DATA_URL_EXP =
  /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/i

/** Null = valid. Selain itu pesan error buat user. */
export function validateAvatarDataUrl(value: string): string | null {
  if (value.length > MAX_AVATAR_DATA_URL) {
    return "Foto terlalu besar. Coba pilih foto lain."
  }
  const match = AVATAR_DATA_URL_EXP.exec(value)
  if (!match) {
    return "Format foto harus JPG, PNG, atau WebP."
  }

  let bytes: Buffer
  try {
    bytes = Buffer.from(match[2], "base64")
  } catch {
    return "Isi foto nggak valid. Coba pilih foto lain."
  }
  if (bytes.length === 0 || bytes.length > MAX_AVATAR_BYTES) {
    return "Foto terlalu besar. Coba pilih foto lain."
  }

  const mime = match[1].toLowerCase()
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const isWebp =
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"

  if (
    (mime === "image/png" && isPng) ||
    (mime === "image/jpeg" && isJpeg) ||
    (mime === "image/webp" && isWebp)
  ) {
    return null
  }
  return "Isi foto nggak valid. Coba pilih foto lain."
}
