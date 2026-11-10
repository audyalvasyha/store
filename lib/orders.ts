import crypto from "node:crypto";
import { getDb, ensureIndexes } from "./mongodb";
import { denomLabelKey, type PopularDenomsByGame } from "./catalog";

let initPromise: Promise<void> | null = null;

// Social proof/analytics nggak perlu real-time per request. Cache 5 menit
// bikin landing yang revalidate tiap 30 detik nggak scan orders terus-terusan.
const ANALYTICS_TTL_MS = 5 * 60_000;

const globalForOrders = globalThis as typeof globalThis & {
  _gasSoldCountsCache_?: { value: Record<string, number>; expiresAt: number };
  _gasSoldCountsInflight_?: Promise<Record<string, number>>;
  _gasPopularDenomsCache_?: {
    value: PopularDenomsByGame;
    expiresAt: number;
  };
  _gasPopularDenomsInflight_?: Promise<PopularDenomsByGame>;
};

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
  /** Kapan cashback kupon sudah ditransfer manual oleh admin (ISO). */
  cashbackPaidAt?: string;
  /** Email admin yang menandai cashback sudah ditransfer. */
  cashbackPaidBy?: string;
  /** Referensi transfer / catatan internal buat rekonsiliasi cashback. */
  cashbackRef?: string;
  topupMessage?: string;
};

/** Data order yang aman dikirim ke client admin untuk antrean cashback. */
export type CashbackOrder = {
  code: string
  gameName: string
  denomLabel: string
  quantity: number
  amount: number
  discount?: number
  couponCode?: string
  phone?: string
  createdAt: string
  cashbackPaidAt?: string
  cashbackPaidBy?: string
  cashbackRef?: string
}

const CASHBACK_PROJECTION = {
  code: 1,
  gameName: 1,
  denomLabel: 1,
  quantity: 1,
  amount: 1,
  discount: 1,
  couponCode: 1,
  phone: 1,
  createdAt: 1,
  cashbackPaidAt: 1,
  cashbackPaidBy: 1,
  cashbackRef: 1,
} as const

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
 * Order Gamestone yang sudah SELESAI dan punya kupon = antrean cashback.
 * Yang belum ditransfer selalu di atas, lalu urut waktu order terbaru.
 */
export async function listCashbackOrders(limit = 200): Promise<CashbackOrder[]> {
  await ensureReady();
  const db = await getDb();
  return db
    .collection<Order>("orders")
    .aggregate<CashbackOrder>([
      {
        $match: {
          status: "SELESAI",
          stoneOrderId: { $exists: true },
          discount: { $gt: 0 },
          couponCode: { $exists: true, $ne: "" },
        },
      },
      {
        $addFields: {
          _cashbackUnpaid: {
            $cond: [{ $ifNull: ["$cashbackPaidAt", false] }, 0, 1],
          },
        },
      },
      { $sort: { _cashbackUnpaid: -1, createdAt: -1 } },
      { $limit: limit },
      { $unset: "_cashbackUnpaid" },
      { $project: { _id: 0, ...CASHBACK_PROJECTION } },
    ])
    .toArray();
}

/**
 * Tandai cashback sudah/belum ditransfer. Filter eligibility diulang di
 * query supaya order manual, order gagal, atau order tanpa kupon nggak bisa
 * diubah lewat endpoint admin.
 */
export async function setCashbackPaid({
  code,
  paid,
  by,
  ref,
}: {
  code: string
  paid: boolean
  by: string
  ref?: string
}): Promise<CashbackOrder | null> {
  await ensureReady();
  const db = await getDb();
  const filter = {
    code,
    status: "SELESAI" as const,
    stoneOrderId: { $exists: true },
    discount: { $gt: 0 },
    couponCode: { $exists: true, $ne: "" },
  }
  const options = {
    returnDocument: "after" as const,
    projection: { _id: 0, ...CASHBACK_PROJECTION },
  }

  if (!paid) {
    return db.collection<Order>("orders").findOneAndUpdate(
      filter,
      { $unset: { cashbackPaidAt: "", cashbackPaidBy: "", cashbackRef: "" } },
      options
    )
  }

  const set: Partial<Order> = {
    cashbackPaidAt: new Date().toISOString(),
    cashbackPaidBy: by,
  }
  const cleanRef = ref?.trim().slice(0, 160)
  if (cleanRef) set.cashbackRef = cleanRef

  return db.collection<Order>("orders").findOneAndUpdate(
    filter,
    { $set: set },
    options
  )
}

/**
 * Social proof: total item terjual (quantity dijumlah) per gameSlug bulan ini.
 * Order yang gagal/expired tidak dihitung. Return map slug -> jumlah terjual;
 * game yang belum ada order sama sekali tidak masuk map.
 */
export async function soldCountsByGame(): Promise<Record<string, number>> {
  const cached = globalForOrders._gasSoldCountsCache_;
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (globalForOrders._gasSoldCountsInflight_) {
    return globalForOrders._gasSoldCountsInflight_;
  }

  const task = (async () => {
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
    globalForOrders._gasSoldCountsCache_ = {
      value: out,
      expiresAt: Date.now() + ANALYTICS_TTL_MS,
    };
    return out;
  })().finally(() => {
    globalForOrders._gasSoldCountsInflight_ = undefined;
  });

  globalForOrders._gasSoldCountsInflight_ = task;
  return task;
}

/**
 * Popularitas nominal per game dari seluruh order yang sudah dibayar.
 * Dicocokkan lewat denomId (katalog lokal) dan label (varian provider yang
 * punya id numerik berbeda), jadi price list tetap bisa ranking walau game
 * memakai harga live Gamestone.
 */
export async function popularDenomsByGame(): Promise<PopularDenomsByGame> {
  const cached = globalForOrders._gasPopularDenomsCache_;
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (globalForOrders._gasPopularDenomsInflight_) {
    return globalForOrders._gasPopularDenomsInflight_;
  }

  const task = (async () => {
    await ensureReady();
    const db = await getDb();
    const rows = await db
      .collection<Order>("orders")
      .aggregate<{
        _id: { gameSlug?: string; denomId?: string; denomLabel?: string };
        count: number;
      }>([
        {
          $match: {
            status: { $in: ["SELESAI", "DIPROSES"] },
            gameSlug: { $type: "string" },
            denomId: { $type: "string" },
          },
        },
        {
          $group: {
            _id: {
              gameSlug: "$gameSlug",
              denomId: "$denomId",
              denomLabel: "$denomLabel",
            },
            count: { $sum: "$quantity" },
          },
        },
      ])
      .toArray();

    const out: PopularDenomsByGame = {};
    for (const row of rows) {
      const slug = row._id?.gameSlug;
      const denomId = row._id?.denomId;
      if (!slug || !denomId) continue;

      const game = out[slug] ?? (out[slug] = { byId: {}, byLabel: {} });
      game.byId[denomId] = (game.byId[denomId] ?? 0) + row.count;

      const label = row._id.denomLabel;
      if (label) {
        const key = denomLabelKey(label);
        game.byLabel[key] = (game.byLabel[key] ?? 0) + row.count;
      }
    }
    globalForOrders._gasPopularDenomsCache_ = {
      value: out,
      expiresAt: Date.now() + ANALYTICS_TTL_MS,
    };
    return out;
  })().finally(() => {
    globalForOrders._gasPopularDenomsInflight_ = undefined;
  });

  globalForOrders._gasPopularDenomsInflight_ = task;
  return task;
}
