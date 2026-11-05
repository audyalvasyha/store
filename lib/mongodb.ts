import { MongoClient, type Db } from "mongodb";

// URI dibaca saat modul load, tapi TIDAK divalidasi & TIDAK bikin client di sini.
// Validasi pindah ke call-time (connectIfNeed/getDb): kalau MONGODB_URI hilang
// atau salah, halaman publik masih bisa render dengan fallback katalog statis
// (lihat lib/content.ts) — bukan crash total "landing down".
const uri = process.env.MONGODB_URI as string | undefined;

const globalForMongo = globalThis as typeof globalThis & { _mongoClient_?: MongoClient };

/**
 * Client di-cache di global juga di production: di serverless scope modul
 * bisa hilang antar-invocation, dan bikin ulang MongoClient tiap kali
 * itu artinya cold-start + pool baru untuk tiap instance.
 */
function makeClient(): MongoClient {
  if (!uri || !uri.startsWith("mongodb")) {
    throw new Error("MONGODB_URI is not set or invalid");
  }
  return new MongoClient(uri, { maxPoolSize: 10 });
}

function client(): MongoClient {
  const c = globalForMongo._mongoClient_ ?? makeClient();
  globalForMongo._mongoClient_ = c;
  return c;
}

export const DB_NAME = process.env.MONGODB_DB ?? "topup-store";

let connectPromise: Promise<void> | null = null;
export async function connectIfNeed(): Promise<void> {
  if (connectPromise) return connectPromise;
  connectPromise = client()
    .connect()
    .then(() => {
      connectPromise = null;
    })
    .catch((err) => {
      connectPromise = null;
      throw err;
    });
  return connectPromise;
}

export async function getDb(): Promise<Db> {
  await connectIfNeed();
  return client().db(DB_NAME);
}

export async function ensureIndexes(): Promise<void> {
  const db = await getDb();
  await db.collection("orders").createIndexes([
    { key: { code: 1 }, unique: true },
    { key: { createdAt: 1 } },
    { key: { status: 1 } },
    { key: { gameSlug: 1 } },
  ]);
  // Site content (hero event / games MC) + admin auth
  await db.collection("admins").createIndexes([{ key: { email: 1 }, unique: true }]);
  await db.collection("admin_sessions").createIndexes([
    { key: { token: 1 }, unique: true },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
  ]);
  await db.collection("site_content").createIndexes([{ key: { key: 1 }, unique: true }]);
  await db.collection("games").createIndexes([{ key: { slug: 1 }, unique: true }]);
  // Kupon promo: kode unik + bantu cari by game.
  await db.collection("coupons").createIndexes([
    { key: { code: 1 }, unique: true },
    { key: { gameSlug: 1 } },
  ]);
  // Rate limiter distribusi: dokumen window auto-hapus pas expiresAt lewat.
  await db
    .collection("rate_limits")
    .createIndexes([{ key: { expiresAt: 1 }, expireAfterSeconds: 0 }]);
}
