/**
 * Auth pembeli (customer) — login tanpa password pakai OTP.
 *
 * Dua channel:
 * - EMAIL (utama) lewat Resend — murah, cepat, tanpa device WhatsApp.
 * - WHATSAPP (cadangan) lewat Fonnte — buat yang lebih nyaman di WA.
 *
 * Identitas akun = email ATAU nomor WA yang dipakai saat checkout, jadi
 * riwayat order otomatis nyambung tanpa migrasi data lama.
 *
 * Keamanan: kode disimpan sebagai hash + salt, berlaku 5 menit, maksimal 5
 * percobaan, session token random di DB (TTL 30 hari) + cookie httpOnly.
 */
import crypto from "node:crypto";
import { getDb, ensureIndexes } from "./mongodb";
import { getOrdersByEmail, getOrdersByPhone, type Order } from "./orders";

export const CUSTOMER_COOKIE = "gas_customer";
const SESSION_TTL_DAYS = 30;
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const FONNTE_API_URL = "https://api.fonnte.com/send";
const RESEND_API_URL = "https://api.resend.com/emails";

export type LoginKind = "email" | "phone";

export type CustomerIdentity = {
  kind: LoginKind;
  identifier: string;
};

type OtpDoc = {
  kind: LoginKind;
  identifier: string;
  salt: string;
  codeHash: string;
  attempts: number;
  createdAt: string;
  expiresAt: Date;
};

type SessionDoc = {
  token: string;
  kind: LoginKind;
  identifier: string;
  createdAt: string;
  expiresAt: Date;
  /** Format lama (sebelum login email) — dibaca sebagai fallback. */
  phone?: string;
};

type CustomerDoc = {
  kind: LoginKind;
  identifier: string;
  createdAt: string;
  lastLoginAt: string;
};

let readyPromise: Promise<void> | null = null;

async function ready(): Promise<void> {
  if (!readyPromise) {
    readyPromise = ensureIndexes().catch((err) => {
      readyPromise = null;
      throw err;
    });
  }
  await readyPromise;
}

// ── Normalisasi & masking ───────────────────────────────────────────────────

/** 08xx / 628xx / 8xx → 628xx. Null kalau nggak valid. */
export function normalizePhone(input: string): string | null {
  const digits = String(input).replace(/\D/g, "");
  if (!digits) return null;
  const canonical = digits.startsWith("0")
    ? `62${digits.slice(1)}`
    : digits.startsWith("62")
      ? digits
      : `62${digits}`;
  if (!/^62\d{8,13}$/.test(canonical)) return null;
  return canonical;
}

export function normalizeEmail(input: string): string | null {
  const email = String(input).trim().toLowerCase();
  if (email.length > 254) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function normalizeIdentifier(kind: LoginKind, value: string): string | null {
  return kind === "email" ? normalizeEmail(value) : normalizePhone(value);
}

/** Varian nomor yang mungkin tersimpan di order lama (62… atau 0…). */
export function phoneVariants(phone: string): string[] {
  const canonical = normalizePhone(phone);
  if (!canonical) return [];
  return [canonical, `0${canonical.slice(2)}`];
}

/** Tampilan aman: 62812****1234. */
export function maskPhone(phone: string): string {
  if (phone.length < 8) return phone;
  return `${phone.slice(0, 4)}****${phone.slice(-4)}`;
}

/** Tampilan aman: budi***@gmail.com. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const head = local.slice(0, Math.min(3, Math.max(1, local.length - 1)));
  return `${head}***@${domain}`;
}

export function maskIdentity(identity: CustomerIdentity): string {
  return identity.kind === "email" ? maskEmail(identity.identifier) : maskPhone(identity.identifier);
}

// ── OTP ─────────────────────────────────────────────────────────────────────

function hashCode(salt: string, code: string): string {
  return crypto.createHash("sha256").update(`${salt}:${code}`).digest("hex");
}

async function sendOtpEmail(email: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "Email login belum dikonfigurasi (RESEND_API_KEY kosong)." };

  const from = process.env.NOTIFY_FROM_EMAIL ?? "Gastros <onboarding@resend.dev>";
  const html = `
<div style="font-family:monospace;max-width:520px;margin:0 auto;background:#0a0a0a;border:2px solid #dc2626;padding:28px;color:#e8e6e1;">
  <p style="letter-spacing:.25em;font-size:10px;color:#dc2626;margin:0 0 14px;text-transform:uppercase;">GASTROS — Login Akun</p>
  <h2 style="letter-spacing:-0.02em;font-size:22px;margin:0 0 10px;">Kode masuk kamu</h2>
  <p style="font-size:13px;color:#9a958c;margin:0 0 18px;">Masukkan 6 digit ini di halaman Akun. Berlaku 5 menit.</p>
  <div style="font-size:34px;letter-spacing:.42em;color:#ffffff;font-weight:bold;padding:18px 0 18px 12px;border:1px solid #2a2a2a;text-align:center;">${code}</div>
  <p style="font-size:11px;color:#9a958c;margin:18px 0 0;line-height:1.6;">Kalau kamu tidak merasa minta kode ini, abaikan emailnya — kode akan kedaluwarsa sendiri. Jangan kasih kode ini ke siapa pun.</p>
</div>`;

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `Kode login GASTROS: ${code}`,
        html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      // 403 dari Resend = pengirim belum beres. Bedakan dua kasus yang paling
      // sering: NOTIFY_FROM_EMAIL belum di-set (masih onboarding@resend.dev,
      // cuma boleh kirim ke email pemilik akun) vs domain belum terverifikasi.
      const fromConfigured = Boolean(process.env.NOTIFY_FROM_EMAIL);
      if (res.status === 403) {
        return {
          ok: false,
          error: fromConfigured
            ? "Email gagal dikirim: domain NOTIFY_FROM_EMAIL belum terverifikasi di Resend (HTTP 403). Cek DNS domainnya di dashboard Resend."
            : "Email gagal dikirim: NOTIFY_FROM_EMAIL belum di-set, pengirim masih onboarding@resend.dev yang cuma bisa kirim ke email pemilik akun Resend. Verifikasi domain di Resend lalu set NOTIFY_FROM_EMAIL (contoh: Gastros <noreply@gastros.id>)."
        };
      }
      // Error lain (mis. 422 alamat tujuan ditolak) — tampilkan alasan aslinya,
      // jangan salah tuduh domain pengirim.
      let reason = "";
      try {
        const parsed = JSON.parse(await res.text()) as { message?: string };
        reason = typeof parsed.message === "string" ? parsed.message : "";
      } catch {
        // body bukan JSON, cukup pakai status
      }
      return {
        ok: false,
        error: `Email gagal dikirim: Resend menolak permintaan (HTTP ${res.status})${reason ? ` — ${reason.slice(0, 160)}` : ""}.`
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Email gagal dikirim karena koneksi ke Resend bermasalah." };
  }
}

async function sendOtpWhatsApp(phone: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.FONNTE_TOKEN;
  if (!token) return { ok: false, error: "Login WhatsApp belum dikonfigurasi (FONNTE_TOKEN kosong)." };
  try {
    const res = await fetch(FONNTE_API_URL, {
      method: "POST",
      headers: { Authorization: token, "Content-Type": "application/json" },
      body: JSON.stringify({
        target: phone,
        message: [
          `GASTROS — kode login kamu: ${code}`,
          "Berlaku 5 menit.",
          "Jangan kasih kode ini ke siapa pun, termasuk yang ngaku CS.",
        ].join("\n"),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok
      ? { ok: true }
      : { ok: false, error: `WhatsApp gagal mengirim kode (HTTP ${res.status}). Coba lagi atau pakai email.` };
  } catch {
    return { ok: false, error: "WhatsApp gagal mengirim kode karena koneksi bermasalah." };
  }
}

/** Kirim OTP. Throws kalau channel gagal — caller tampilkan pesannya ke user. */
export async function startCustomerLogin(identity: CustomerIdentity): Promise<void> {
  await ready();
  const db = await getDb();
  const { kind, identifier } = identity;
  // Satu kode aktif per identitas — kirim ulang membatalkan kode lama.
  await db.collection<OtpDoc>("customer_otps").deleteMany({ kind, identifier });

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  const salt = crypto.randomBytes(16).toString("hex");
  const otp: OtpDoc = {
    kind,
    identifier,
    salt,
    codeHash: hashCode(salt, code),
    attempts: 0,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  };

  const sent =
    kind === "email"
      ? await sendOtpEmail(identifier, code)
      : await sendOtpWhatsApp(identifier, code);
  if (!sent.ok) throw new Error(sent.error ?? "Gagal mengirim kode.");

  await db.collection<OtpDoc>("customer_otps").insertOne(otp);
}

/** Verifikasi OTP → session token. Throws dengan pesan ramah kalau gagal. */
export async function verifyCustomerLogin(
  identity: CustomerIdentity,
  code: string
): Promise<string> {
  await ready();
  const db = await getDb();
  const { kind, identifier } = identity;
  const col = db.collection<OtpDoc>("customer_otps");
  const otp = await col.findOne({ kind, identifier }, { sort: { createdAt: -1 } });
  if (!otp) throw new Error("Kode nggak ditemukan. Kirim ulang kode ya.");
  if (otp.expiresAt.getTime() <= Date.now()) {
    await col.deleteMany({ kind, identifier });
    throw new Error("Kode sudah kedaluwarsa. Kirim ulang kode ya.");
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    await col.deleteMany({ kind, identifier });
    throw new Error("Terlalu banyak percobaan. Kirim ulang kode baru.");
  }

  const expected = Buffer.from(otp.codeHash, "hex");
  const actual = Buffer.from(hashCode(otp.salt, code), "hex");
  const ok = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  if (!ok) {
    await col.updateOne({ _id: otp._id }, { $inc: { attempts: 1 } });
    throw new Error("Kode salah. Cek lagi ya.");
  }

  await col.deleteMany({ kind, identifier });
  const now = new Date().toISOString();
  await db.collection<CustomerDoc>("customer_accounts").updateOne(
    { kind, identifier },
    {
      $setOnInsert: { kind, identifier, createdAt: now },
      $set: { lastLoginAt: now },
    },
    { upsert: true }
  );

  const token = crypto.randomBytes(32).toString("hex");
  await db.collection<SessionDoc>("customer_sessions").insertOne({
    token,
    kind,
    identifier,
    createdAt: now,
    expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000),
  });
  return token;
}

export async function getCustomerIdentity(token: string | undefined): Promise<CustomerIdentity | null> {
  if (!token) return null;
  await ready();
  const db = await getDb();
  const session = await db
    .collection<SessionDoc>("customer_sessions")
    .findOne({ token, expiresAt: { $gt: new Date() } });
  if (!session) return null;
  // Sesi lama (sebelum fitur email) cuma punya field phone.
  if (session.identifier && session.kind) {
    return { kind: session.kind, identifier: session.identifier };
  }
  if (session.phone) return { kind: "phone", identifier: session.phone };
  return null;
}

export async function logoutCustomer(token: string | undefined): Promise<void> {
  if (!token) return;
  await ready();
  const db = await getDb();
  await db.collection<SessionDoc>("customer_sessions").deleteOne({ token });
}

/** Riwayat order milik identitas ini (termasuk order lama sebelum punya akun). */
export async function getCustomerOrders(identity: CustomerIdentity): Promise<Order[]> {
  if (identity.kind === "email") {
    return getOrdersByEmail([identity.identifier], 30);
  }
  const variants = phoneVariants(identity.identifier);
  if (variants.length === 0) return [];
  return getOrdersByPhone(variants, 30);
}

export const CUSTOMER_COOKIE_MAX_AGE = SESSION_TTL_DAYS * 24 * 60 * 60;
