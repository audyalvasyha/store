"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { formatIDR } from "@/lib/catalog"
import type { CashbackOrder } from "@/lib/orders"

function waNumber(phone?: string): string | null {
  const digits = String(phone ?? "").replace(/\D/g, "")
  if (!digits) return null
  if (digits.startsWith("0")) return `62${digits.slice(1)}`
  if (digits.startsWith("62")) return digits
  return `62${digits}`
}

function formatDate(iso?: string): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return `${date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  })} WIB`
}

export function AdminCashback({ initialOrders }: { initialOrders: CashbackOrder[] }) {
  const router = useRouter()
  const [orders, setOrders] = useState(initialOrders)
  const [filter, setFilter] = useState<"unpaid" | "all">("unpaid")
  const [paying, setPaying] = useState<string | null>(null)
  const [ref, setRef] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Server refresh setelah update mengirim prop baru; sinkronkan biar status
  // nggak balik lagi waktu tab ditinggal lalu dibuka.
  useEffect(() => setOrders(initialOrders), [initialOrders])

  const unpaid = useMemo(() => orders.filter((order) => !order.cashbackPaidAt), [orders])
  const totalUnpaid = useMemo(
    () => unpaid.reduce((sum, order) => sum + (order.discount ?? 0), 0),
    [unpaid]
  )
  const shown = filter === "unpaid" ? unpaid : orders

  async function update(order: CashbackOrder, paid: boolean) {
    setBusy(order.code)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/cashback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: order.code,
          paid,
          ref: paid ? ref.trim() || undefined : undefined,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? "Gagal menyimpan status cashback")

      const updated = data.order as CashbackOrder
      setOrders((list) => list.map((item) => (item.code === updated.code ? updated : item)))
      setPaying(null)
      setRef("")
      setMessage(
        paid
          ? `Cashback ${order.code} ditandai sudah ditransfer.`
          : `Status cashback ${order.code} dibatalkan.`
      )
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan status cashback")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="border border-border bg-card p-4 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <span className="block font-mono text-[10px] uppercase tracking-[0.25em] text-accent md:text-xs">
            [Cashback Kupon]
          </span>
          <h2 className="mt-1 font-sans text-xl uppercase leading-none tracking-tight text-foreground md:text-2xl">
            Antrean transfer manual
          </h2>
          <p className="mt-2 max-w-xl font-mono text-[10px] leading-relaxed text-foreground/50">
            Hanya order Gamestone berstatus SELESAI yang memakai kupon. Tandai setelah transfer
            benar-benar dikirim supaya nggak dobel.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="border border-border bg-background px-3 py-2.5">
            <span className="block font-mono text-[9px] uppercase tracking-[0.12em] text-foreground/40">
              Belum ditransfer
            </span>
            <span className="mt-1 block font-sans text-xl tabular-nums text-foreground">
              {unpaid.length}
            </span>
          </div>
          <div className="border border-border bg-background px-3 py-2.5">
            <span className="block font-mono text-[9px] uppercase tracking-[0.12em] text-foreground/40">
              Total cashback
            </span>
            <span className="mt-1 block font-sans text-xl tabular-nums text-accent">
              {formatIDR(totalUnpaid)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setFilter("unpaid")}
          className={`min-h-[40px] border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] md:text-[10px] ${
            filter === "unpaid"
              ? "border-accent text-accent"
              : "border-border text-foreground/50 hover:text-foreground"
          }`}
        >
          Belum dibayar ({unpaid.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`min-h-[40px] border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] md:text-[10px] ${
            filter === "all"
              ? "border-accent text-accent"
              : "border-border text-foreground/50 hover:text-foreground"
          }`}
        >
          Semua riwayat ({orders.length})
        </button>
      </div>

      {message && (
        <p role="status" className="mt-3 font-mono text-[10px] leading-relaxed text-accent">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 border border-destructive/40 p-2 font-mono text-[10px] leading-relaxed text-destructive">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {shown.length === 0 && (
          <div className="border border-border bg-background p-4">
            <p className="font-mono text-[10px] leading-relaxed text-foreground/45">
              {filter === "unpaid"
                ? "Semua cashback sudah ditransfer. Nggak ada antrean."
                : "Belum ada order Gamestone selesai yang memakai kupon."}
            </p>
          </div>
        )}

        {shown.map((order) => {
          const paid = Boolean(order.cashbackPaidAt)
          const wa = waNumber(order.phone)
          return (
            <div key={order.code} className="border border-border bg-background p-3 md:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-foreground">{order.code}</span>
                    <span
                      className={`border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] ${
                        paid
                          ? "border-emerald-400/50 text-emerald-300"
                          : "border-amber-400/50 text-amber-300"
                      }`}
                    >
                      {paid ? "Sudah ditransfer" : "Belum ditransfer"}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-mono text-[10px] text-foreground/60">
                    {order.gameName} &mdash; {order.denomLabel}
                    {order.quantity > 1 ? ` ×${order.quantity}` : ""}
                  </p>
                  <p className="mt-0.5 font-mono text-[9px] text-foreground/35">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <div className="shrink-0 sm:text-right">
                  <span className="block font-mono text-[9px] uppercase tracking-[0.12em] text-foreground/40">
                    Nominal cashback
                  </span>
                  <span className="mt-0.5 block font-sans text-xl tabular-nums text-accent md:text-2xl">
                    {formatIDR(order.discount ?? 0)}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-3">
                <div className="min-w-0">
                  <span className="block font-mono text-[8px] uppercase tracking-[0.12em] text-foreground/35">
                    Kupon
                  </span>
                  <span className="block truncate font-mono text-[10px] uppercase text-foreground/75">
                    {order.couponCode ?? "-"}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="block font-mono text-[8px] uppercase tracking-[0.12em] text-foreground/35">
                    Nomor WA
                  </span>
                  <span className="block truncate font-mono text-[10px] text-foreground/75">
                    {order.phone ?? "-"}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="block font-mono text-[8px] uppercase tracking-[0.12em] text-foreground/35">
                    Total order
                  </span>
                  <span className="block font-mono text-[10px] tabular-nums text-foreground/75">
                    {formatIDR(order.amount)}
                  </span>
                </div>
              </div>

              {paid && (
                <p className="mt-3 border-t border-border pt-3 font-mono text-[9px] leading-relaxed text-foreground/40">
                  Ditransfer {formatDate(order.cashbackPaidAt)}
                  {order.cashbackPaidBy ? ` oleh ${order.cashbackPaidBy}` : ""}
                  {order.cashbackRef ? ` · Ref: ${order.cashbackRef}` : ""}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {!paid && paying !== order.code && (
                  <button
                    type="button"
                    onClick={() => {
                      setPaying(order.code)
                      setRef("")
                      setMessage(null)
                      setError(null)
                    }}
                    className="min-h-[40px] border border-accent bg-accent px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-accent-foreground hover-glitch md:text-[10px]"
                  >
                    Tandai sudah ditransfer
                  </button>
                )}

                {!paid && paying === order.code && (
                  <div className="flex w-full flex-col gap-2 border border-accent/40 bg-accent/5 p-3 sm:flex-row sm:items-end">
                    <label className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-foreground/40">
                        Referensi transfer / catatan (opsional)
                      </span>
                      <input
                        value={ref}
                        onChange={(event) => setRef(event.target.value)}
                        maxLength={160}
                        placeholder="cth: BCA 10 Nov 20:41"
                        className="min-h-[40px] w-full border border-border bg-background px-2.5 py-2 font-mono text-[10px] text-foreground placeholder:text-foreground/25 focus:border-accent focus:outline-none"
                      />
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void update(order, true)}
                        disabled={busy === order.code}
                        className="min-h-[40px] border border-accent bg-accent px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-accent-foreground disabled:opacity-40 md:text-[10px]"
                      >
                        {busy === order.code ? "Menyimpan..." : "Simpan"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPaying(null)
                          setRef("")
                        }}
                        disabled={busy === order.code}
                        className="min-h-[40px] border border-border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-foreground/50 hover:text-foreground disabled:opacity-40 md:text-[10px]"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}

                {paid && (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Batalkan status cashback ${order.code}? Gunakan kalau transfer belum benar-benar dikirim.`
                        )
                      ) {
                        void update(order, false)
                      }
                    }}
                    disabled={busy === order.code}
                    className="min-h-[40px] border border-border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-foreground/45 hover:text-destructive disabled:opacity-40 md:text-[10px]"
                  >
                    Batalkan status
                  </button>
                )}

                {wa && (
                  <a
                    href={`https://wa.me/${wa}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-[40px] items-center border border-border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-foreground/55 hover:border-accent hover:text-accent md:text-[10px]"
                  >
                    Chat WA
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
