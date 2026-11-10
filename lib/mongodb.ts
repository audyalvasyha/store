import { MongoClient, type Db } from "mongodb";

// URI dibaca saat modul load, tapi TIDAK divalidasi & TIDAK bikin client di sini.
// Validasi pindah ke call-time (connectIfNeed/getDb): kalau MONGODB_URI hilang
// atau salah, halaman publik masih bisa render dengan fallback katalog statis
// (lihat lib/content.ts) — bukan crash total "landing down".
const uri = process.env.MONGODB_URI as string | undefined;

const globalForMongo = globalThis as typeof globalThis & {
  _mongoClient_?: MongoClient;
  _ensureIndexesPromise_?: Promise<void>;
};

/**
 * Client di-cache di global juga di production: di serverless scope modul
 * bisa hilang antar-invocation, dan bikin ulang MongoClient tiap kali
 * itu artinya cold-start + pool baru untuk tiap instance.
 */
function makeClient(): MongoClient {
  if (!uri || !uri.startsWith("mongodb")) {
    throw new Error("MONGODB_URI is not set or invalid");
  }
  return new MongoClient(uri, {
    maxPoolSize: 10,
    // Default driver 30 detik: kalau DB down, halaman publik ikut menggantung
    // 30 detik sebelum fallback katalog. 5 detik cukup untuk DB normal.
    serverSelectionTimeoutMS: 5_000,
  });
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

/**
 * Single-flight: beberapa modul (content, reviews, orders, ...) sama-sama
 * memanggil ini saat request pertama. Tanpa guard, tiap pemanggil menjalankan
 * createIndexes-nya sendiri dan cold start jadi berkali-kali lipat.
 */
export function ensureIndexes(): Promise<void> {
  if (globalForMongo._ensureIndexesPromise_) return globalForMongo._ensureIndexesPromise_;
  const task = runEnsureIndexes().catch((err) => {
    // Jangan cache kegagalan permanen — request berikutnya boleh coba lagi.
    globalForMongo._ensureIndexesPromise_ = undefined;
    throw err;
  });
  globalForMongo._ensureIndexesPromise_ = task;
  return task;
}

async function runEnsureIndexes(): Promise<void> {
  const db = await getDb();
  // Collection-collection ini independen, jadi bikin index-nya paralel.
  // Sebelumnya berurutan → cold start nambah 4–5 detik.
  await Promise.all([
    db.collection("orders").createIndexes([
      { key: { code: 1 }, unique: true },
      { key: { createdAt: 1 } },
      { key: { status: 1 } },
      // Compound index buat analytics: filter status + rentang tanggal / game.
      { key: { status: 1, createdAt: 1 } },
      { key: { status: 1, gameSlug: 1 } },
      { key: { gameSlug: 1 } },
      // Nomor WA / email dipakai sebagai identitas akun pembeli → riwayat order.
      { key: { phone: 1 } },
      { key: { email: 1 } },
    ]),
    // Site content (hero event / games MC) + admin auth
    db.collection("admins").createIndexes([{ key: { email: 1 }, unique: true }]),
    db.collection("admin_sessions").createIndexes([
      { key: { token: 1 }, unique: true },
      { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
    ]),
    db.collection("site_content").createIndexes([{ key: { key: 1 }, unique: true }]),
    db.collection("games").createIndexes([{ key: { slug: 1 }, unique: true }]),
    // Artikel admin: slug unik + query daftar terbit berdasarkan tanggal.
    db.collection("articles").createIndexes([
      { key: { slug: 1 }, unique: true },
      { key: { status: 1, date: -1 } },
    ]),
    // Kupon promo: kode unik + bantu cari by game.
    db.collection("coupons").createIndexes([
      { key: { code: 1 }, unique: true },
      { key: { gameSlug: 1 } },
    ]),
    // Akun pembeli: identitas bisa email atau nomor WA. Index lama {phone:1}
    // unique dibuang karena dokumen email nggak punya field phone (unique index
    // menganggap semua dokumen tanpa phone sebagai null → bentrok).
    // Drop dulu, baru create — urutan ini harus tetap berurutan.
    (async () => {
      try {
        await db.collection("customer_accounts").dropIndex("phone_1");
      } catch {
        // belum ada / sudah dibuang — aman diabaikan
      }
      await db.collection("customer_accounts").createIndexes([
        { key: { kind: 1, identifier: 1 }, unique: true },
      ]);
    })(),
    db.collection("customer_otps").createIndexes([
      { key: { kind: 1, identifier: 1, createdAt: -1 } },
      { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
    ]),
    db.collection("customer_sessions").createIndexes([
      { key: { token: 1 }, unique: true },
      { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
    ]),
    // Ulasan pembeli: satu ulasan per order + query ulasan per game terbaru.
    db.collection("reviews").createIndexes([
      { key: { orderCode: 1 }, unique: true },
      { key: { gameSlug: 1, createdAt: -1 } },
    ]),
    // Rate limiter distribusi: dokumen window auto-hapus pas expiresAt lewat.
    db.collection("rate_limits").createIndexes([{ key: { expiresAt: 1 }, expireAfterSeconds: 0 }]),
  ]);
}
