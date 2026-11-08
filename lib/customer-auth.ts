/**
 * Auth pembeli (customer): email + password, OTP email/WA, dan Google.
 *
 * Password cuma bisa dipakai untuk identitas email; nomor WA tetap OTP.
 * Pendaftaran password wajib verifikasi OTP dulu supaya email orang lain
 * nggak bisa diklaim dan riwayat order-nya nggak bocor.
 *
 * Identitas akun = email ATAU nomor WA yang dipakai saat checkout, jadi
 * riwayat order otomatis nyambung tanpa migrasi data lama.
 *
 * Keamanan: password di-hash scrypt + salt; OTP di-hash + salt, berlaku 10
 * menit, maksimal 5 percobaan; session token random di DB (TTL 30 hari) + cookie.
 */
import crypto from "node:crypto";
import { getDb, ensureIndexes } from "./mongodb";
import { getOrdersByEmail, getOrdersByPhone, type Order } from "./orders";

export const CUSTOMER_COOKIE = "gas_customer";
const SESSION_TTL_DAYS = 30;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const FONNTE_API_URL = "https://api.fonnte.com/send";
const RESEND_API_URL = "https://api.resend.com/emails";

export type LoginKind = "email" | "phone";
export type LoginProvider = "otp" | "google" | "password";

export type CustomerIdentity = {
  kind: LoginKind;
  identifier: string;
  /** Cara masuk sesi ini — buat label keamanan di halaman akun. */
  provider?: LoginProvider;
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
  provider?: LoginProvider;
  createdAt: string;
  expiresAt: Date;
  /** Format lama (sebelum login email) — dibaca sebagai fallback. */
  phone?: string;
};

type CustomerDoc = {
  kind: LoginKind;
  identifier: string;
  /** Nama tampilan opsional — diisi sendiri dari halaman Akun. */
  name?: string;
  /** Hash scrypt password (kalau user sudah bikin password). */
  passwordHash?: string;
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

// ── Password ────────────────────────────────────────────────────────────────

/** Validasi kebijakan password. Null = valid. */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password minimal ${PASSWORD_MIN_LENGTH} karakter.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password maksimal ${PASSWORD_MAX_LENGTH} karakter.`;
  }
  return null;
}

type ScryptOptions = { N: number; r: number; p: number; maxmem: number };

function scryptKey(
  password: string,
  salt: Buffer,
  options: ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, options, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

async function hashCustomerPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scryptKey(password, salt, SCRYPT_OPTS);
  return `scrypt$${SCRYPT_OPTS.N}$${SCRYPT_OPTS.r}$${SCRYPT_OPTS.p}$${salt.toString(
    "hex"
  )}$${key.toString("hex")}`;
}

async function verifyCustomerPasswordHash(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (
    !Number.isInteger(n) ||
    !Number.isInteger(r) ||
    !Number.isInteger(p) ||
    n < 1024 ||
    n > 131072 ||
    r < 1 ||
    r > 16 ||
    p < 1 ||
    p > 4 ||
    !/^[0-9a-f]+$/i.test(parts[4]) ||
    !/^[0-9a-f]+$/i.test(parts[5])
  ) {
    return false;
  }
  const salt = Buffer.from(parts[4], "hex");
  const expected = Buffer.from(parts[5], "hex");
  if (salt.length < 8 || expected.length !== SCRYPT_KEYLEN) return false;
  try {
    const actual = await scryptKey(password, salt, {
      N: n,
      r,
      p,
      maxmem: 128 * 1024 * 1024,
    });
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/** Hash dummy buat nyamain waktu saat email nggak punya password/akun. */
async function burnPasswordCheck(password: string): Promise<void> {
  await scryptKey(password, crypto.randomBytes(16), SCRYPT_OPTS).catch(() => null);
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
  <p style="font-size:13px;color:#9a958c;margin:0 0 18px;">Masukkan 6 digit ini di halaman Akun. Berlaku 10 menit.</p>
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
          "Berlaku 10 menit.",
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
  // JANGAN hapus kode lama dulu. Email/WA bisa telat, atau user klik "kirim
  // ulang"; kalau kode lama langsung dibunuh, kode yang telanjur dibaca user
  // jadi nggak bisa dipakai. Semua kode aktif (10 menit) diterima saat verify.
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

/** Konsumsi kode OTP yang valid. Dipakai login OTP & pendaftaran password. */
async function consumeCustomerOtp(identity: CustomerIdentity, code: string): Promise<void> {
  await ready();
  const db = await getDb();
  const { kind, identifier } = identity;
  const col = db.collection<OtpDoc>("customer_otps");
  const activeSince = new Date();

  // Terima semua kode yang masih aktif, bukan cuma yang terakhir. Ini bikin
  // kode dari email/WA yang telat atau sebelum "kirim ulang" tetap kepakai.
  const docs = await col
    .find({ kind, identifier, expiresAt: { $gt: activeSince } })
    .sort({ createdAt: -1 })
    .limit(8)
    .toArray();
  if (docs.length === 0) {
    throw new Error("Kode nggak ditemukan atau sudah kedaluwarsa. Kirim ulang kode ya.");
  }

  const usable = docs.filter((otp) => otp.attempts < OTP_MAX_ATTEMPTS);
  if (usable.length === 0) {
    throw new Error("Terlalu banyak percobaan. Kirim ulang kode baru.");
  }

  let valid = false;
  for (const otp of usable) {
    const expected = Buffer.from(otp.codeHash, "hex");
    const actual = Buffer.from(hashCode(otp.salt, code), "hex");
    if (expected.length === actual.length && crypto.timingSafeEqual(expected, actual)) {
      valid = true;
      break;
    }
  }

  if (!valid) {
    // Naikkan percobaan di semua kode aktif yang belum terkunci, biar kode
    // lama nggak bisa dipakai buat brute-force tambahan.
    await col.updateMany(
      { _id: { $in: usable.map((otp) => otp._id) } },
      { $inc: { attempts: 1 } }
    );
    const left = await col.countDocuments({
      kind,
      identifier,
      expiresAt: { $gt: new Date() },
      attempts: { $lt: OTP_MAX_ATTEMPTS },
    });
    throw new Error(
      left === 0
        ? "Terlalu banyak percobaan. Kirim ulang kode baru."
        : "Kode salah. Cek lagi ya."
    );
  }

  // Kode valid: hanguskan semua kode identitas ini (termasuk kode lama).
  await col.deleteMany({ kind, identifier });
}

/** Verifikasi OTP → session token. Throws dengan pesan ramah kalau gagal. */
export async function verifyCustomerLogin(
  identity: CustomerIdentity,
  code: string
): Promise<string> {
  await consumeCustomerOtp(identity, code);
  const db = await getDb();
  const { kind, identifier } = identity;
  const now = new Date().toISOString();
  await db.collection<CustomerDoc>("customer_accounts").updateOne(
    { kind, identifier },
    {
      $setOnInsert: { kind, identifier, createdAt: now },
      $set: { lastLoginAt: now },
    },
    { upsert: true }
  );

  return createCustomerSession({ kind, identifier }, "otp");
}

/** Bikin sesi login baru. `provider` cuma buat nampilin metode di halaman akun. */
async function createCustomerSession(
  identity: CustomerIdentity,
  provider: LoginProvider
): Promise<string> {
  const db = await getDb();
  const token = crypto.randomBytes(32).toString("hex");
  await db.collection<SessionDoc>("customer_sessions").insertOne({
    token,
    kind: identity.kind,
    identifier: identity.identifier,
    provider,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000),
  });
  return token;
}

/**
 * Login Google yang emailnya udah diverifikasi server. Diperlakukan sebagai
 * identitas email yang sama supaya profil + riwayat order OTP ikut kebawa.
 */
export async function loginCustomerWithGoogle(email: string): Promise<string> {
  await ready();
  const db = await getDb();
  const identifier = normalizeEmail(email);
  if (!identifier) throw new Error("Email Google tidak valid.");

  const now = new Date().toISOString();
  await db.collection<CustomerDoc>("customer_accounts").updateOne(
    { kind: "email", identifier },
    {
      $setOnInsert: { kind: "email", identifier, createdAt: now },
      $set: { lastLoginAt: now },
    },
    { upsert: true }
  );

  return createCustomerSession({ kind: "email", identifier, provider: "google" }, "google");
}

/** Login email + password. Error sengaja generik biar email nggak bisa di-enumerate. */
export async function loginCustomerWithPassword(
  email: string,
  password: string
): Promise<string> {
  await ready();
  const db = await getDb();
  const identifier = normalizeEmail(email);
  if (!identifier || !password || password.length > PASSWORD_MAX_LENGTH) {
    await burnPasswordCheck(password || "dummy-password");
    throw new Error("Email atau password salah.");
  }

  const account = await db.collection<CustomerDoc>("customer_accounts").findOne({
    kind: "email",
    identifier,
  });
  if (!account?.passwordHash) {
    await burnPasswordCheck(password);
    throw new Error("Email atau password salah.");
  }

  const valid = await verifyCustomerPasswordHash(password, account.passwordHash);
  if (!valid) throw new Error("Email atau password salah.");

  await db.collection<CustomerDoc>("customer_accounts").updateOne(
    { _id: account._id },
    { $set: { lastLoginAt: new Date().toISOString() } }
  );
  return createCustomerSession(
    { kind: "email", identifier, provider: "password" },
    "password"
  );
}

/**
 * Daftar password: wajib konsumsi OTP email dulu. Kalau email sudah punya
 * akun, ini sekaligus jadi reset password (tetap butuh akses ke email).
 */
export async function registerCustomerWithPassword(
  email: string,
  code: string,
  password: string
): Promise<string> {
  const identifier = normalizeEmail(email);
  if (!identifier) throw new Error("Email tidak valid.");
  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(passwordError);

  await consumeCustomerOtp({ kind: "email", identifier }, code);
  await ready();
  const db = await getDb();
  const passwordHash = await hashCustomerPassword(password);
  const now = new Date().toISOString();
  await db.collection<CustomerDoc>("customer_accounts").updateOne(
    { kind: "email", identifier },
    {
      $setOnInsert: { kind: "email", identifier, createdAt: now },
      $set: { passwordHash, lastLoginAt: now },
    },
    { upsert: true }
  );

  return createCustomerSession(
    { kind: "email", identifier, provider: "password" },
    "password"
  );
}

/**
 * Set/ganti password dari sesi yang sudah login. Sesi password harus tahu
 * password lama; sesi OTP/Google sudah membuktikan kepemilikan email, jadi
 * boleh reset tanpa password lama (jalur "lupa password").
 */
export async function changeCustomerPassword(
  identity: CustomerIdentity,
  newPassword: string,
  currentPassword?: string
): Promise<void> {
  if (identity.kind !== "email") {
    throw new Error("Password cuma bisa dipakai untuk akun email.");
  }
  const identifier = normalizeEmail(identity.identifier);
  if (!identifier) throw new Error("Email tidak valid.");
  const passwordError = validatePassword(newPassword);
  if (passwordError) throw new Error(passwordError);

  await ready();
  const db = await getDb();
  const account = await db.collection<CustomerDoc>("customer_accounts").findOne({
    kind: "email",
    identifier,
  });

  if (account?.passwordHash && identity.provider === "password") {
    if (!currentPassword) throw new Error("Masukkan password sekarang.");
    if (currentPassword.length > PASSWORD_MAX_LENGTH) throw new Error("Password sekarang salah.");
    const valid = await verifyCustomerPasswordHash(currentPassword, account.passwordHash);
    if (!valid) throw new Error("Password sekarang salah.");
  }

  const passwordHash = await hashCustomerPassword(newPassword);
  const now = new Date().toISOString();
  await db.collection<CustomerDoc>("customer_accounts").updateOne(
    { kind: "email", identifier },
    {
      $setOnInsert: { kind: "email", identifier, createdAt: now, lastLoginAt: now },
      $set: { passwordHash },
    },
    { upsert: true }
  );
}

export async function getCustomerIdentity(token: string | undefined): Promise<CustomerIdentity | null> {
  if (!token) return null;
  await ready();
  const db = await getDb();
  const session = await db
    .collection<SessionDoc>("customer_sessions")
    .findOne({ token, expiresAt: { $gt: new Date() } });
  if (!session) return null;
  // Sesi lama (sebelum fitur email) cuma punya field phone — normalisasi ke
  // 62… supaya profil & riwayat tetap ketemu walau dulu disimpan 08….
  if (session.identifier && session.kind) {
    const identifier =
      session.kind === "phone"
        ? (normalizePhone(session.identifier) ?? session.identifier)
        : session.identifier;
    return { kind: session.kind, identifier, provider: session.provider };
  }
  if (session.phone) {
    return { kind: "phone", identifier: normalizePhone(session.phone) ?? session.phone };
  }
  return null;
}

export async function logoutCustomer(token: string | undefined): Promise<void> {
  if (!token) return;
  await ready();
  const db = await getDb();
  await db.collection<SessionDoc>("customer_sessions").deleteOne({ token });
}

/** Cabut SEMUA sesi identitas ini (logout dari semua perangkat). */
export async function logoutCustomerEverywhere(identity: CustomerIdentity): Promise<void> {
  await ready();
  const db = await getDb();
  const filter =
    identity.kind === "phone"
      ? {
          $or: [
            { kind: identity.kind, identifier: identity.identifier },
            { phone: { $in: phoneVariants(identity.identifier) } },
          ],
        }
      : { kind: identity.kind, identifier: identity.identifier };
  await db.collection<SessionDoc>("customer_sessions").deleteMany(filter);
}

/** Profil akun pembeli (nama, tanggal daftar, login terakhir). */
export type CustomerProfile = {
  name?: string;
  hasPassword: boolean;
  createdAt: string;
  lastLoginAt: string;
};

export async function getCustomerProfile(
  identity: CustomerIdentity
): Promise<CustomerProfile | null> {
  await ready();
  const db = await getDb();
  const doc = await db.collection<CustomerDoc>("customer_accounts").findOne({
    kind: identity.kind,
    identifier: identity.identifier,
  });
  if (!doc) return null;
  return {
    name: typeof doc.name === "string" ? doc.name : undefined,
    hasPassword: typeof doc.passwordHash === "string" && doc.passwordHash.length > 0,
    createdAt: doc.createdAt,
    lastLoginAt: doc.lastLoginAt,
  };
}

/** Simpan nama tampilan. String kosong = hapus nama (balik ke identitas tersamar). */
export async function updateCustomerName(
  identity: CustomerIdentity,
  name: string | undefined
): Promise<void> {
  await ready();
  const db = await getDb();
  const now = new Date().toISOString();
  await db.collection<CustomerDoc>("customer_accounts").updateOne(
    { kind: identity.kind, identifier: identity.identifier },
    {
      $setOnInsert: { kind: identity.kind, identifier: identity.identifier, createdAt: now, lastLoginAt: now },
      ...(name ? { $set: { name } } : { $unset: { name: "" } }),
    },
    { upsert: true }
  );
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
