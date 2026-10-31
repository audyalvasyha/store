/**
 * Auth admin: akun disimpan di MongoDB.
 * - Password di-hash pakai scrypt (node:crypto) dengan salt per-akun.
 * - Session = token random di collection `admin_sessions` (TTL 7 hari),
 *   dikirim sebagai httpOnly cookie `gas_admin`.
 */
import crypto from "node:crypto";
import { getDb, ensureIndexes } from "./mongodb";

export const SESSION_COOKIE = "gas_admin";
const SESSION_TTL_DAYS = 7;

const ADMIN_EXPRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

export type AdminDoc = {
  email: string;
  passwordHash: string;
  createdAt: string;
};

type SessionDoc = {
  token: string;
  email: string;
  createdAt: string;
  expiresAt: Date;
};

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function ready(): Promise<void> {
  await ensureIndexes();
}

export async function countAdmins(): Promise<number> {
  await ready();
  const db = await getDb();
  return db.collection<AdminDoc>("admins").countDocuments();
}

/** Buat akun admin baru. Hanya dipakai saat bootstrap (belum ada admin). */
export async function createAdmin(email: string, password: string): Promise<void> {
  await ready();
  const db = await getDb();
  try {
    await db.collection<AdminDoc>("admins").insertOne({
      email: email.toLowerCase(),
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw new Error("Email admin sudah terdaftar");
    }
    throw err;
  }
}

/** Login: verifikasi kredensial, lalu bikin session token di DB. */
export async function login(email: string, password: string): Promise<string> {
  await ready();
  const db = await getDb();
  const admin = await db
    .collection<AdminDoc>("admins")
    .findOne({ email: email.toLowerCase() });
  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    throw new Error("Email atau password salah");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.collection<SessionDoc>("admin_sessions").insertOne({
    token,
    email: admin.email,
    createdAt: new Date().toISOString(),
    expiresAt,
  });
  return token;
}

export async function logout(token: string): Promise<void> {
  await ready();
  const db = await getDb();
  await db.collection<SessionDoc>("admin_sessions").deleteOne({ token });
}

/** Ambil email admin dari session cookie di request. Null kalau nggak login. */
export async function getAdminEmail(sessionToken: string | undefined): Promise<string | null> {
  if (!sessionToken) return null;
  await ready();
  const db = await getDb();
  const session = await db
    .collection<SessionDoc>("admin_sessions")
    .findOne({ token: sessionToken, expiresAt: { $gt: new Date() } });
  return session?.email ?? null;
}

/** Validasi kredensial form register/login. */
export function validateCredentials(email: string, password: string): string | null {
  if (!ADMIN_EXPRESS.test(email)) return "Email tidak valid";
  if (password.length < MIN_PASSWORD) return `Password minimal ${MIN_PASSWORD} karakter`;
  return null;
}

export const COOKIE_MAX_AGE = SESSION_TTL_DAYS * 24 * 60 * 60;
