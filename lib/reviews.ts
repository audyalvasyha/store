import { getDb, ensureIndexes } from "./mongodb";

let initPromise: Promise<void> | null = null;

async function ensureReady(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = ensureIndexes().catch((err) => {
    initPromise = null;
    throw err;
  });
  await initPromise;
}

/** Ulasan pembeli — cuma boleh dari order berstatus SELESAI, satu ulasan per order. */
export type Review = {
  /** Kode order asal ulasan (unique — anti dobel). */
  orderCode: string;
  gameSlug: string;
  /** 1–5 bintang. */
  rating: number;
  comment?: string;
  /** Nama tampil yang sudah disamarkan (bukan PII mentah). */
  authorName: string;
  createdAt: string;
};

/**
 * Simpan ulasan baru. Return false kalau order ini sudah pernah diulas
 * (unique index orderCode) — caller balikin 409, bukan 500.
 */
export async function saveReview(review: Review): Promise<boolean> {
  await ensureReady();
  const db = await getDb();
  try {
    await db.collection<Review>("reviews").insertOne(review);
    return true;
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return false;
    throw err;
  }
}

/**
 * Ulasan terbaru lintas game buat strip testimoni di landing.
 * Cuma yang ada teksnya — kartu testimoni isinya kutipan, bukan bintang kosong.
 */
export async function getLatestReviews(limit = 12): Promise<Review[]> {
  await ensureReady();
  const db = await getDb();
  return db
    .collection<Review>("reviews")
    .find({ comment: { $exists: true, $ne: "" } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

/** Ulasan terbaru sebuah game. */
export async function getGameReviews(gameSlug: string, limit = 6): Promise<Review[]> {
  await ensureReady();
  const db = await getDb();
  return db
    .collection<Review>("reviews")
    .find({ gameSlug })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

/** Rata-rata rating (1 desimal) + jumlah ulasan. */
export async function getGameRating(
  gameSlug: string
): Promise<{ average: number; count: number }> {
  await ensureReady();
  const db = await getDb();
  const rows = await db
    .collection<Review>("reviews")
    .aggregate<{ _id: string; avg: number; count: number }>([
      { $match: { gameSlug } },
      { $group: { _id: "$gameSlug", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ])
    .toArray();
  const row = rows[0];
  if (!row) return { average: 0, count: 0 };
  return { average: Math.round(row.avg * 10) / 10, count: row.count };
}

/** Rating semua game sekaligus — buat badge bintang di katalog (satu query). */
export async function getRatingsByGame(): Promise<
  Record<string, { average: number; count: number }>
> {
  await ensureReady();
  const db = await getDb();
  const rows = await db
    .collection<Review>("reviews")
    .aggregate<{ _id: string; avg: number; count: number }>([
      { $group: { _id: "$gameSlug", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ])
    .toArray();
  const out: Record<string, { average: number; count: number }> = {};
  for (const row of rows) {
    out[row._id] = { average: Math.round(row.avg * 10) / 10, count: row.count };
  }
  return out;
}

/** Cek apakah sebuah order sudah diulas. */
export async function hasReviewed(orderCode: string): Promise<boolean> {
  await ensureReady();
  const db = await getDb();
  const doc = await db.collection<Review>("reviews").findOne(
    { orderCode },
    { projection: { _id: 1 } }
  );
  return Boolean(doc);
}
