import { formatIDR } from "@/lib/catalog"
import type { AdminStats } from "@/lib/analytics"

const STATUS_TONE: Record<string, string> = {
  MENUNGGU_PEMBAYARAN: "border-amber-400/50 text-amber-300",
  DIPROSES: "border-sky-400/50 text-sky-300",
  SELESAI: "border-emerald-400/50 text-emerald-300",
  GAGAL: "border-destructive/60 text-destructive",
}

export function AdminStatsView({ stats }: { stats: AdminStats | null }) {
  if (!stats) {
    return (
      <div className="border border-border bg-card p-4 md:p-6">
        <span className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] uppercase block mb-2">
          [Statistik]
        </span>
        <p className="font-mono text-[10px] md:text-xs text-foreground/50 leading-relaxed">
          Statistik belum bisa dimuat — database lagi nggak nyambung. Coba refresh
          sebentar lagi; tab lain tetap bisa dipakai.
        </p>
      </div>
    )
  }

  const maxRevenue = Math.max(...stats.daily.map((d) => d.revenue), 1)
  const cards = [
    { label: "Pendapatan bulan ini", value: formatIDR(stats.revenueMonth), accent: true },
    { label: "Order bulan ini", value: String(stats.ordersMonth), accent: false },
    { label: "Order selesai", value: String(stats.completedMonth), accent: false },
    { label: "Rata-rata / order", value: formatIDR(stats.avgOrder), accent: false },
  ]

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Kartu ringkasan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
        {cards.map((c) => (
          <div key={c.label} className="border border-border bg-card p-3 md:p-4">
            <span className="font-mono text-[9px] md:text-[10px] text-foreground/40 tracking-[0.12em] uppercase block mb-1.5">
              {c.label}
            </span>
            <span
              className={`font-sans text-xl md:text-2xl tracking-tight tabular-nums ${
                c.accent ? "text-accent" : "text-foreground"
              }`}
            >
              {c.value}
            </span>
          </div>
        ))}
      </div>

      {/* Grafik 14 hari */}
      <div className="border border-border bg-card p-4 md:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <span className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] uppercase">
            14 Hari Terakhir
          </span>
          <span className="font-mono text-[9px] md:text-[10px] text-foreground/35 uppercase tracking-[0.15em]">
            revenue · order
          </span>
        </div>
        <div className="flex items-end gap-1 md:gap-1.5 h-28 md:h-36">
          {stats.daily.map((d) => {
            const h = d.revenue > 0 ? Math.max(3, Math.round((d.revenue / maxRevenue) * 100)) : 1
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0 group">
                <div
                  className={`w-full transition-colors ${
                    d.revenue > 0 ? "bg-accent/80 group-hover:bg-accent" : "bg-foreground/10"
                  }`}
                  style={{ height: `${h}%` }}
                  title={`${d.label}: ${formatIDR(d.revenue)} · ${d.orders} order`}
                />
                <span className="font-mono text-[7px] md:text-[8px] text-foreground/30 uppercase truncate w-full text-center">
                  {d.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Status order (all-time) */}
        <div className="border border-border bg-card p-4 md:p-6">
          <span className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] uppercase block mb-3">
            Status Order (total)
          </span>
          <div className="flex flex-wrap gap-2">
            {["MENUNGGU_PEMBAYARAN", "DIPROSES", "SELESAI", "GAGAL"].map((status) => (
              <span
                key={status}
                className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[9px] md:text-[10px] tracking-[0.1em] uppercase ${
                  STATUS_TONE[status] ?? "border-border text-foreground/60"
                }`}
              >
                {status.replace(/_/g, " ")}
                <span className="tabular-nums">{stats.statusCounts[status] ?? 0}</span>
              </span>
            ))}
          </div>
          <p className="font-mono text-[10px] text-foreground/40 mt-3">
            {stats.totalOrders} order tercatat sepanjang waktu · {stats.couponsMonth} pakai kupon bulan ini
          </p>
        </div>

        {/* Top game */}
        <div className="border border-border bg-card p-4 md:p-6">
          <span className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] uppercase block mb-3">
            Top Game (Pendapatan)
          </span>
          {stats.topGames.length === 0 ? (
            <p className="font-mono text-[10px] text-foreground/40">
              Belum ada order SELESAI — data muncul otomatis begitu transaksi selesai.
            </p>
          ) : (
            <div className="flex flex-col">
              {stats.topGames.map((g, i) => (
                <div
                  key={g.slug}
                  className="flex items-center justify-between gap-3 border-b border-border/50 last:border-b-0 py-2 font-mono text-[10px] md:text-[11px]"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-accent tabular-nums shrink-0">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-foreground/75 truncate uppercase">{g.name}</span>
                  </span>
                  <span className="flex items-center gap-3 shrink-0 text-foreground/45 tabular-nums">
                    <span>{g.orders}x</span>
                    <span className="text-foreground/75">{formatIDR(g.revenue)}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
