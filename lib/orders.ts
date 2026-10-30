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
  /** DOKU hosted checkout URL */
  paymentUrl?: string;
  paymentError?: string;
  paidAt?: string;
  /** Status pengiriman item lewat APIGames */
  topupStatus?: TopupStatus;
  topupRef?: string;
  topupMessage?: string;
};

export function generateOrderCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `GAS-${suffix}`;
}

export async function saveOrder(order: Order): Promise<Order> {
  await ensureReady();
  const db = await getDb();
  await db.collection<Order>("orders").insertOne(order);
  return order;
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
