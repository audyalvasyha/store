"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { formatArticleDate } from "@/lib/article-index"
import type { AdminArticle } from "@/lib/articles-db"

type Filter = "all" | "published" | "draft"

function StatusBadge({ status }: { status: AdminArticle["status"] }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] ${
        status === "published"
          ? "border-emerald-400/40 text-emerald-300"
          : "border-amber-400/40 text-amber-300"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 ${
          status === "published" ? "bg-emerald-400" : "bg-amber-400"
        }`}
        aria-hidden="true"
      />
      {status === "published" ? "Published" : "Draft"}
    </span>
  )
}

export function AdminArticlesList({
  articles,
  dbError,
}: {
  articles: AdminArticle[]
  dbError?: string | null
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const counts = useMemo(
    () => ({
      total: articles.length,
      published: articles.filter((article) => article.status === "published").length,
      draft: articles.filter((article) => article.status === "draft").length,
      defaults: articles.filter((article) => article.source === "default").length,
    }),
    [articles]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return articles.filter((article) => {
      if (filter !== "all" && article.status !== filter) return false
      if (!q) return true
      return [article.title, article.slug, article.category, ...article.tags]
        .join(" ")
        .toLowerCase()
        .includes(q)
    })
  }, [articles, filter, query])

  async function remove(article: AdminArticle) {
    const restoring = article.hasStaticBase
    const confirmation = restoring
      ? `Kembalikan "${article.title}" ke versi default? Override admin akan dihapus.`
      : `Hapus permanen "${article.title}"? Artikel ini nggak punya versi default.`
    if (!window.confirm(confirmation)) return

    setBusy(article.slug)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch(
        `/api/admin/articles?slug=${encodeURIComponent(article.slug)}`,
        { method: "DELETE" }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Gagal menghapus artikel.")
      setMessage(
        data.restored
          ? `"${article.title}" kembali ke versi default.`
          : `"${article.title}" dihapus permanen.`
      )
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus artikel.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {dbError && (
        <div className="border border-destructive/50 bg-destructive/10 p-4">
          <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.2em] text-destructive">
            [Database nggak nyambung]
          </span>
          <p className="font-mono text-[10px] leading-relaxed text-foreground/60">
            {dbError} Artikel default tetap bisa dibuka dari menu edit setelah
            koneksi pulih.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          { label: "Total artikel", value: counts.total, tone: "text-foreground" },
          { label: "Published", value: counts.published, tone: "text-emerald-300" },
          { label: "Draft", value: counts.draft, tone: "text-amber-300" },
          { label: "Default", value: counts.defaults, tone: "text-foreground/55" },
        ].map((stat) => (
          <div key={stat.label} className="border border-border bg-card p-3 md:p-4">
            <span className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-foreground/40">
              {stat.label}
            </span>
            <span className={`font-sans text-2xl leading-none tracking-tight tabular-nums md:text-3xl ${stat.tone}`}>
              {String(stat.value).padStart(2, "0")}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 border border-border bg-card p-3 md:flex-row md:items-center md:justify-between md:p-4">
        <label className="flex min-w-0 flex-1 items-center gap-2 border border-border bg-background px-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-foreground/30">
            Cari
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="judul, slug, kategori, tag..."
            className="min-h-[40px] w-full bg-transparent font-mono text-[11px] text-foreground placeholder:text-foreground/25 focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { value: "all", label: "Semua" },
              { value: "published", label: "Published" },
              { value: "draft", label: "Draft" },
            ] as const
          ).map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`min-h-[40px] border px-3 font-mono text-[9px] uppercase tracking-[0.14em] transition-colors ${
                filter === item.value
                  ? "border-accent text-accent"
                  : "border-border text-foreground/45 hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <p className="border border-emerald-400/30 bg-emerald-400/10 p-3 font-mono text-[10px] leading-relaxed text-emerald-300">
          {message}
        </p>
      )}
      {error && (
        <p className="border border-destructive/40 bg-destructive/10 p-3 font-mono text-[10px] leading-relaxed text-destructive">
          {error}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="border border-dashed border-border bg-card p-8 text-center">
          <p className="font-sans text-2xl uppercase leading-none tracking-tight text-foreground/55">
            Nggak ada artikel.
          </p>
          <p className="mt-2 font-mono text-[10px] text-foreground/35">
            Coba ganti filter, atau bikin artikel baru.
          </p>
          <Link
            href="/admin/artikel/baru"
            className="mt-4 inline-flex min-h-[40px] items-center justify-center bg-accent px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.18em] text-accent-foreground transition-opacity hover:opacity-85"
          >
            + Artikel baru
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((article) => {
            const isDefault = article.source === "default"
            return (
              <article
                key={article.slug}
                className="border border-border bg-card p-3 transition-colors hover:border-accent/50 md:p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={article.status} />
                      {article.featured && (
                        <span className="border border-accent/40 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-accent">
                          Featured
                        </span>
                      )}
                      <span className="border border-border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-foreground/35">
                        {isDefault ? "Default" : "Admin override"}
                      </span>
                    </div>
                    <h2 className="font-sans text-2xl uppercase leading-none tracking-tight text-foreground md:text-3xl">
                      {article.title}
                    </h2>
                    <p className="mt-1.5 break-all font-mono text-[9px] text-foreground/35">
                      /artikel/{article.slug}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-[0.12em] text-foreground/40">
                      <span className="text-accent">{article.category}</span>
                      <span>{formatArticleDate(article.updated)}</span>
                      <span>{article.readMinutes} menit</span>
                      <span>{article.tags.length} tag</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {article.status === "published" && (
                      <Link
                        href={`/artikel/${article.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[38px] items-center justify-center border border-border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-foreground/55 transition-colors hover:border-accent hover:text-foreground"
                      >
                        Lihat ↗
                      </Link>
                    )}
                    <Link
                      href={`/admin/artikel/${article.slug}`}
                      className="inline-flex min-h-[38px] items-center justify-center bg-accent px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-accent-foreground transition-opacity hover:opacity-85"
                    >
                      Edit
                    </Link>
                    {!isDefault && (
                      <button
                        type="button"
                        onClick={() => remove(article)}
                        disabled={busy === article.slug}
                        className="inline-flex min-h-[38px] items-center justify-center border border-border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-foreground/45 transition-colors hover:border-destructive hover:text-destructive disabled:opacity-40"
                      >
                        {busy === article.slug
                          ? "Memproses..."
                          : article.hasStaticBase
                            ? "Reset"
                            : "Hapus"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
