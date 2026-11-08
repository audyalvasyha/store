import crypto from "node:crypto";
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

export type OrderStatus = "MENUNGGU_PEMBAYARAN" | "DIPROSES" | "SELESAI" | "GAGAL";

export type TopupStatus = "BELUM" | "DIKIRIM" | "SUKSES" | "GAGAL" | "MANUAL";

export type Order = {
  code: string;
  status: OrderStatus;
  createdAt: string;
  gameSlug: string;
  gameName: string;
  currency: string;
  denomId: string;
  denomLabel: string;
  quantity: number;
  amount: number;
  method: string;
  userId: string;
  server?: string;
  email: string;
  paymentError?: string;
  paidAt?: string;
  /** Nomor HP/WA pembayar (wajib untuk order Gamestone). */
  phone?: string;
  /** Order Gamestone (payment bawaan): id order upstream untuk polling status. */
  stoneOrderId?: string;
  stoneTotal?: number;
  /** payment_code Gamestone (QRIS EMV / nomor VA / kode bayar). */
  stonePaymentCode?: string;
  /** Waktu kadaluarsa order Gamestone (ISO string). */
  stoneExpiredAt?: string;
  /** Snapshot data penting dari order Gamestone. */
  stoneSnapshot?: { price?: number; fee?: number; paymentFee?: number; total?: number };
  /** Flag supaya sync Gamestone nggak di-poll terus kalau statusnya final. */
  stoneSynced?: boolean;
  /** Provider yang nge-handle order ini: Gamestone (payment bawaan). */
  provider?: "gamestone" | "apigames";
  /** Kalau Gamestone gagal dan order jalan manual via CS, alasannya dicatat di sini. */
  fallbackReason?: string;
  /** Status pengiriman item lewat APIGames */
  topupStatus?: TopupStatus;
  topupRef?: string;
  /** Potongan kupon (Rupiah). Order manual = diskon (amount sdh dikurangi);
   * order Gamestone = cashback yang di-transfer CS setelah SELESAI. */
  discount?: number;
  /** Kode kupon yang dipakai, biar bisa diperiksa admin & anti double-apply. */
  couponCode?: string;
  topupMessage?: string;
};

export function generateOrderCode(): string {
  // Kode order = satu-satunya "kunci" akses detail order (berisi PII email/HP),
  // jadi harus RNG kriptografis — Math.random() itu prediktabel.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[crypto.randomInt(alphabet.length)];
  }
  return `GAS-${suffix}`;
}

export async function saveOrder(order: Order): Promise<Order> {
  await ensureReady();
  const db = await getDb();
  // Kode order punya unique index. Tabrakan itu super jarang (dari 32^6 kode
  // kripto), tapi kalau kejadian dan gak di-handle, user kena 500 tanpa order.
  // Solusi: regenerate code di objek yang sama (route membaca order.code setelah
  // saveOrder, jadi mutasi objek yang diteruskan itu memang disengaja).
  for (let attempt = 0; ; attempt++) {
    try {
      await db.collection<Order>("orders").insertOne(order);
      return order;
    } catch (err) {
      if ((err as { code?: number }).code === 11000 && attempt < 5) {
        order.code = generateOrderCode();
        continue;
      }
      throw err;
    }
  }
}

export async function getOrder(code: string): Promise<Order | null> {
  await ensureReady();
  const db = await getDb();
  return db.collection<Order>("orders").findOne({ code });
}

export async function updateOrder(code: string, patch: Partial<Order>): Promise<Order | null> {
  await ensureReady();
  const db = await getDb();
  return db
    .collection<Order>("orders")
    .findOneAndUpdate({ code }, { $set: patch }, { returnDocument: "after" });
}

/** Riwayat order untuk email akun (case-insensitive, cocokkan data lama). */
export async function getOrdersByEmail(emails: string[], limit = 30): Promise<Order[]> {
  await ensureReady();
  const db = await getDb();
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return db
    .collection<Order>("orders")
    .find({
      $or: emails.map((email) => ({
        email: { $regex: `^${escape(email)}$`, $options: "i" },
      })),
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

/** Riwayat order untuk satu nomor WA (akun pembeli). */
export async function getOrdersByPhone(phones: string[], limit = 30): Promise<Order[]> {
  await ensureReady();
  const db = await getDb();
  return db
    .collection<Order>("orders")
    .find({ phone: { $in: phones } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Social proof: total item terjual (quantity dijumlah) per gameSlug bulan ini.
 * Order yang gagal/expired tidak dihitung. Return map slug -> jumlah terjual;
 * game yang belum ada order sama sekali tidak masuk map.
 */
export async function soldCountsByGame(): Promise<Record<string, number>> {
  await ensureReady();
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0); // awal bulan UTC
  const db = await getDb();
  const rows = await db
    .collection<Order>("orders")
    .aggregate<{ _id: string; count: number }>([
      { $match: { status: { $in: ["SELESAI", "DIPROSES"] }, createdAt: { $gte: start.toISOString() } } },
      { $group: { _id: "$gameSlug", count: { $sum: "$quantity" } } },
    ])
    .toArray();
  const out: Record<string, number> = {};
  for (const r of rows) {
    if (r._id) out[r._id] = r.count;
  }
  return out;
}
