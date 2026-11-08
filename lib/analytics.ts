import { getDb, ensureIndexes } from "./mongodb";
import type { Order } from "./orders";

let initPromise: Promise<void> | null = null;

async function ensureReady(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = ensureIndexes().catch((err) => {
    initPromise = null;
    throw err;
  });
  await initPromise;
}

export type AdminStats = {
  /** Pendapatan (order SELESAI) sejak awal bulan, Rupiah. */
  revenueMonth: number;
  /** Jumlah order dibuat bulan ini (semua status). */
  ordersMonth: number;
  /** Order SELESAI bulan ini. */
  completedMonth: number;
  /** Rata-rata nilai order SELESAI bulan ini. */
  avgOrder: number;
  /** Pakai kupon bulan ini. */
  couponsMonth: number;
  /** Hitungan semua order per status (all-time). */
  statusCounts: Record<string, number>;
  /** Total order semua waktu. */
  totalOrders: number;
  /** Grafik 14 hari terakhir (timezone Asia/Jakarta). */
  daily: { date: string; label: string; revenue: number; orders: number }[];
  /** Top 5 game berdasarkan pendapatan (order SELESAI). */
  topGames: { slug: string; name: string; orders: number; revenue: number }[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getAdminStats(): Promise<AdminStats> {
  await ensureReady();
  const db = await getDb();
  const col = db.collection<Order>("orders");

  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  ).toISOString();
  const dayStart = new Date(Date.now() - 13 * DAY_MS);
  dayStart.setUTCHours(0, 0, 0, 0);

  const monthly = await col
    .aggregate<{
      _id: null;
      orders: number;
      completed: number;
      revenue: number;
      coupons: number;
    }>([
      { $match: { createdAt: { $gte: monthStart } } },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "SELESAI"] }, 1, 0] } },
          revenue: {
            $sum: { $cond: [{ $eq: ["$status", "SELESAI"] }, "$amount", 0] },
          },
          coupons: { $sum: { $cond: [{ $ifNull: ["$couponCode", false] }, 1, 0] } },
        },
      },
    ])
    .toArray();

  const statusRows = await col
    .aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ])
    .toArray();

  const dailyRows = await col
    .aggregate<{ _id: string; orders: number; revenue: number }>([
      { $match: { createdAt: { $gte: dayStart.toISOString() } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: { $toDate: "$createdAt" },
              timezone: "Asia/Jakarta",
            },
          },
          orders: { $sum: 1 },
          revenue: {
            $sum: { $cond: [{ $eq: ["$status", "SELESAI"] }, "$amount", 0] },
          },
        },
      },
    ])
    .toArray();

  const topRows = await col
    .aggregate<{ _id: string; name: string; orders: number; revenue: number }>([
      { $match: { status: "SELESAI" } },
      {
        $group: {
          _id: "$gameSlug",
          name: { $first: "$gameName" },
          orders: { $sum: 1 },
          revenue: { $sum: "$amount" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ])
    .toArray();

  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const labelFmt = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
  });
  const byDate = new Map(dailyRows.map((r) => [r._id, r]));
  const daily: AdminStats["daily"] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY_MS);
    const key = dateKey.format(d);
    const row = byDate.get(key);
    daily.push({
      date: key,
      label: labelFmt.format(d),
      revenue: row?.revenue ?? 0,
      orders: row?.orders ?? 0,
    });
  }

  const statusCounts: Record<string, number> = {};
  for (const row of statusRows) statusCounts[row._id] = row.count;

  const m = monthly[0];
  const completedMonth = m?.completed ?? 0;
  const revenueMonth = m?.revenue ?? 0;

  return {
    revenueMonth,
    ordersMonth: m?.orders ?? 0,
    completedMonth,
    avgOrder: completedMonth > 0 ? Math.round(revenueMonth / completedMonth) : 0,
    couponsMonth: m?.coupons ?? 0,
    statusCounts,
    totalOrders: statusRows.reduce((sum, row) => sum + row.count, 0),
    daily,
    topGames: topRows.map((row) => ({
      slug: row._id,
      name: row.name,
      orders: row.orders,
      revenue: row.revenue,
    })),
  };
}
