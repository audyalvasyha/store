"use client"

import { useCallback, useEffect, useState } from "react"
import type { CouponDoc } from "@/lib/coupons"

/**
 * Panel kupon promo di admin: list + form buat/b-update + hapus + toggle.
 * Self-contained client component — fetch ke /api/admin/coupons sendiri,
 * jadi AdminPanel & server page nggak perlu kena.
 */
export function AdminCoupons() {
  const [coupons, setCoupons] = useState<CouponDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [code, setCode] = useState("")
  const [kind, setKind] = useState<"percent" | "fixed">("percent")
  const [value, setValue] = useState("10")
  const [gameSlug, setGameSlug] = useState("")
  const [minSpend, setMinSpend] = useState("0")
  const [maxDiscount, setMaxDiscount] = useState("")
  const [usageLimit, setUsageLimit] = useState("")
  const [expiresDays, setExpiresDays] = useState("30")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/coupons", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Gagal memuat kupon")
      setCoupons(data.coupons ?? [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat kupon")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    setError(null)
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coupon: {
            code,
            kind,
            value: Number(value),
            gameSlug: gameSlug || undefined,
            minSpend: Number(minSpend || 0),
            maxDiscount: kind === "percent" && maxDiscount ? Number(maxDiscount) : undefined,
            usageLimit: usageLimit ? Number(usageLimit) : undefined,
            expiresDays: Number(expiresDays || 0),
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan kupon")
      setMsg(`Kupon ${data.code} tersimpan.`)
      setCode("")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan kupon")
    } finally {
      setSaving(false)
    }
  }

  async function remove(c: string) {
    setError(null)
    const res = await fetch(`/api/admin/coupons?code=${encodeURIComponent(c)}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setError(data?.error ?? "Gagal menghapus kupon")
      return
    }
    await load()
  }

  async function toggle(c: CouponDoc) {
    setError(null)
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coupon: {
          code: c.code,
          kind: c.kind,
          value: c.value,
          gameSlug: c.gameSlug,
          minSpend: c.minSpend,
          maxDiscount: c.maxDiscount,
          usageLimit: c.usageLimit,
          expiresDays: c.expiresAt
            ? Math.max(1, Math.ceil((new Date(c.expiresAt).getTime() - Date.now()) / 86_400_000))
            : 0,
          active: !c.active,
        },
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setError(data?.error ?? "Gagal menyimpan kupon")
      return
    }
    await load()
  }

  const inputCls = "bg-background border border-border p-2.5 font-mono text-xs text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-accent"
  const labelCls = "font-mono text-[10px] text-foreground/60 tracking-[0.15em] uppercase"

  return (
    <div className="flex flex-col gap-4">
      <div className="border border-border bg-card p-4 md:p-6">
        <span className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] uppercase block mb-3">
          Kupon Promo
        </span>
        <form onSubmit={save} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Kode *</span>
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="GASHEMAT" className={inputCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Jenis *</span>
              <select value={kind} onChange={(e) => setKind(e.target.value as "percent" | "fixed")} className={inputCls}>
                <option value="percent">Persen (%)</option>
                <option value="fixed">Nominal (Rp)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>{kind === "percent" ? "Nilai % (1-100) *" : "Nominal Rp (>=500) *"}</span>
              <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="numeric" className={inputCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Slug game (kosong = global)</span>
              <input value={gameSlug} onChange={(e) => setGameSlug(e.target.value)} placeholder="mobile-legends" className={inputCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Min. belanja (Rp)</span>
              <input value={minSpend} onChange={(e) => setMinSpend(e.target.value)} inputMode="numeric" className={inputCls} />
            </label>
            {kind === "percent" && (
              <label className="flex flex-col gap-1.5">
                <span className={labelCls}>Cap diskon (Rp, kosong = tanpa cap)</span>
                <input value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} inputMode="numeric" className={inputCls} />
              </label>
            )}
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Batas pakai (kosong = unlimited)</span>
              <input value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} inputMode="numeric" className={inputCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Aktif sampai (hari, 0 = selamanya)</span>
              <input value={expiresDays} onChange={(e) => setExpiresDays(e.target.value)} inputMode="numeric" className={inputCls} />
            </label>
          </div>
          <button
            type="submit"
            disabled={saving || !code.trim()}
            className="self-start inline-flex items-center justify-center bg-accent text-accent-foreground font-mono text-[11px] tracking-[0.2em] uppercase px-4 py-2.5 hover:scale-[1.02] transition-transform disabled:opacity-40"
          >
            {saving ? "Menyimpan..." : "Simpan kupon"}
          </button>
          {msg && <p className="font-mono text-[11px] text-accent">{msg}</p>}
          {error && <p className="font-mono text-[11px] text-destructive border border-destructive/40 p-2">{error}</p>}
        </form>
      </div>

      <div className="border border-border bg-card p-4 md:p-6">
        <span className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] uppercase block mb-3">
          Daftar Kupon ({coupons.length})
        </span>
        {loading ? (
          <p className="font-mono text-xs text-foreground/50">Memuat...</p>
        ) : coupons.length === 0 ? (
          <p className="font-mono text-xs text-foreground/50">Belum ada kupon.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {coupons.map((c) => (
              <div key={c.code} className="flex items-center justify-between gap-3 border border-border bg-background p-2.5">
                <div className="min-w-0">
                  <span className={`font-mono text-xs block truncate ${c.active ? "text-foreground" : "text-foreground/40 line-through"}`}>
                    {c.code} — {c.kind === "percent" ? `${c.value}%` : `Rp ${c.value.toLocaleString("id-ID")}`}
                  </span>
                  <span className="font-mono text-[10px] text-foreground/45 block truncate">
                    {c.gameSlug ? `game: ${c.gameSlug} · ` : "global · "}
                    tervalidasi {c.usedCount}{c.usageLimit ? `/${c.usageLimit}` : ""}×
                    {c.expiresAt ? ` · exp ${new Date(c.expiresAt).toLocaleDateString("id-ID")}` : ""}
                  </span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => toggle(c)} className="border border-border px-2.5 py-1.5 font-mono text-[10px] uppercase text-foreground hover:border-accent hover:text-accent transition-colors">
                    {c.active ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                  <button type="button" onClick={() => remove(c.code)} className="border border-destructive/40 px-2.5 py-1.5 font-mono text-[10px] uppercase text-destructive hover:bg-destructive/10 transition-colors">
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
