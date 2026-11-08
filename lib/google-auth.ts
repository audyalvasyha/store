/**
 * Login Google pakai Google Identity Services (ID token).
 *
 * Tidak pakai client secret / redirect URI: browser dapat `credential` (JWT)
 * dari Google, lalu server verifikasi ke endpoint tokeninfo resmi. Yang wajib
 * dicek: audience = client ID kita, issuer Google, email terverifikasi, dan
 * token belum kedaluwarsa.
 */
import { normalizeEmail } from "./customer-auth";

const TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const CLIENT_ID_PATTERN = /^[a-z0-9-]+\.apps\.googleusercontent\.com$/i;

/** Client ID dari env, atau string kosong kalau belum dikonfigurasi. */
export function getGoogleClientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  return CLIENT_ID_PATTERN.test(id) ? id : "";
}

export type GoogleVerification =
  | { ok: true; email: string }
  | { ok: false; status: number; error: string };

const INVALID: Omit<Extract<GoogleVerification, { ok: false }>, "status"> = {
  ok: false,
  error: "Login Google nggak valid. Coba lagi.",
};

export async function verifyGoogleCredential(credential: string): Promise<GoogleVerification> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    return {
      ok: false,
      status: 503,
      error: "Login Google belum aktif. Pakai email atau WhatsApp dulu.",
    };
  }
  if (!credential || credential.length > 4096) {
    return { ...INVALID, status: 401 };
  }

  try {
    const res = await fetch(
      `${TOKENINFO_URL}?id_token=${encodeURIComponent(credential)}`,
      { cache: "no-store", signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return { ...INVALID, status: 401 };

    const data = (await res.json()) as Record<string, unknown>;
    const aud =
      typeof data.aud === "string"
        ? data.aud
        : Array.isArray(data.aud) && typeof data.aud[0] === "string"
          ? data.aud[0]
          : "";
    const iss = String(data.iss ?? "");
    const email = normalizeEmail(String(data.email ?? ""));
    const emailVerified = data.email_verified === true || data.email_verified === "true";
    const exp = Number(data.exp);
    const sub = typeof data.sub === "string" ? data.sub : "";

    if (
      !sub ||
      aud !== clientId ||
      (iss !== "accounts.google.com" && iss !== "https://accounts.google.com") ||
      !emailVerified ||
      !email ||
      !Number.isFinite(exp) ||
      exp * 1000 <= Date.now()
    ) {
      return { ...INVALID, status: 401 };
    }

    return { ok: true, email };
  } catch {
    return {
      ok: false,
      status: 503,
      error: "Login Google gagal karena koneksi. Coba lagi.",
    };
  }
}
