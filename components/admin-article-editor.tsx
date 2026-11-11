"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type ReactNode } from "react"
import { ArticleBody } from "@/components/article-body"
import { RichTextEditor } from "@/components/rich-text-editor"
import {
  ARTICLE_LAYOUTS,
  normalizeArticleSettings,
  safeArticleHref,
  safeArticleHue,
  safeHttpsUrl,
  slugifyArticle,
  type ArticleCta,
  type ArticleSettings,
  type ArticleStatus,
} from "@/lib/article-index"
import type { ArticleBlock, ArticleSection } from "@/lib/articles"
import type { AdminArticle } from "@/lib/articles-db"

export type AdminGameOption = {
  slug: string
  short: string
  name: string
}

type Tab = "content" | "design" | "seo" | "preview"

const TABS: Array<{ value: Tab; label: string }> = [
  { value: "content", label: "Konten" },
  { value: "design", label: "Tampilan" },
  { value: "seo", label: "SEO" },
  { value: "preview", label: "Preview" },
]

const CATEGORY_SUGGESTIONS = [
  "Panduan Game",
  "Keamanan",
  "Dasar",
  "Tips",
  "Berita",
]

const BLOCK_TYPES: Array<{ type: ArticleBlock["type"]; label: string }> = [
  { type: "p", label: "Paragraf" },
  { type: "ul", label: "List" },
  { type: "ol", label: "List nomor" },
  { type: "note", label: "Catatan" },
  { type: "steps", label: "Langkah" },
  { type: "links", label: "Tautan" },
  { type: "table", label: "Tabel" },
]

const MAX_LIST_ITEMS = 12
const MAX_STEPS = 10
const MAX_LINKS = 8
const MAX_TABLE_COLUMNS = 6
const MAX_TABLE_ROWS = 30

const EMPTY_CTA: ArticleCta = {
  eyebrow: "[Langkah berikutnya]",
  title: "",
  description: "",
  label: "",
  href: "",
}

const INPUT =
  "min-h-[44px] w-full border border-border bg-background p-2.5 font-mono text-[11px] text-foreground placeholder:text-foreground/25 focus:border-accent focus:outline-none"
const LABEL = "mb-1.5 block font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/45"
const SMALL_BUTTON =
  "inline-flex min-h-[36px] items-center justify-center border border-border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-foreground/55 transition-colors hover:border-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-25"

function Panel({
  title,
  hint,
  action,
  children,
}: {
  title: string
  hint?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="border border-border bg-card p-4 md:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="block font-mono text-[9px] uppercase tracking-[0.22em] text-accent">
            [{title}]
          </span>
          {hint && (
            <p className="mt-1 font-mono text-[9px] leading-relaxed text-foreground/35">{hint}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 border border-border bg-background p-3 transition-colors hover:border-accent/50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 accent-red-600"
      />
      <span className="min-w-0">
        <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-foreground/65">
          {label}
        </span>
        {description && (
          <span className="mt-1 block font-mono text-[9px] leading-relaxed text-foreground/35">
            {description}
          </span>
        )}
      </span>
    </label>
  )
}

function uniqueSectionId(base: string, sections: ArticleSection[]): string {
  const root = slugifyArticle(base) || "bagian"
  let id = root
  let suffix = 2
  while (sections.some((section) => section.id === id)) {
    id = `${root}-${suffix}`
    suffix += 1
  }
  return id
}

function blankBlock(type: ArticleBlock["type"]): ArticleBlock {
  if (type === "p") return { type: "p", text: "" }
  if (type === "ul" || type === "ol") return { type, items: [""] }
  if (type === "note") return { type: "note", label: "Catatan", text: "" }
  if (type === "steps") return { type: "steps", items: [{ title: "", text: "" }] }
  if (type === "links") return { type: "links", title: "Tautan", items: [{ label: "", href: "" }] }
  return { type: "table", headers: ["Kolom 1", "Kolom 2"], rows: [["", ""]] }
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction
  if (index < 0 || target < 0 || target >= items.length) return items
  const next = [...items]
  const current = next[index]
  const swap = next[target]
  if (current === undefined || swap === undefined) return items
  next[index] = swap
  next[target] = current
  return next
}

function blockHasContent(block: ArticleBlock): boolean {
  if (block.type === "p") return Boolean(block.text.trim())
  if (block.type === "ul" || block.type === "ol") return block.items.some((item) => item.trim())
  if (block.type === "note") return Boolean(block.text.trim())
  if (block.type === "steps") {
    return block.items.some((item) => item.title.trim() && item.text.trim())
  }
  if (block.type === "links") {
    return block.items.some((item) => item.label.trim() && safeArticleHref(item.href))
  }
  return (
    block.headers.some((header) => header.trim()) &&
    block.rows.some((row) => row.some((cell) => cell.trim()))
  )
}

function hslToHex(hsl: string): string {
  const safe = safeArticleHue(hsl)
  const [hRaw, sRaw, lRaw] = safe.split(" ")
  const h = Number(hRaw) / 360
  const s = Number(sRaw?.replace("%", "") ?? 0) / 100
  const l = Number(lRaw?.replace("%", "") ?? 0) / 100

  const hueToRgb = (p: number, q: number, t: number) => {
    let value = t
    if (value < 0) value += 1
    if (value > 1) value -= 1
    if (value < 1 / 6) return p + (q - p) * 6 * value
    if (value < 1 / 2) return q
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6
    return p
  }

  let r = l
  let g = l
  let b = l
  if (s !== 0) {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hueToRgb(p, q, h + 1 / 3)
    g = hueToRgb(p, q, h)
    b = hueToRgb(p, q, h - 1 / 3)
  }

  const toHex = (value: number) => Math.round(value * 255).toString(16).padStart(2, "0")
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function hexToHsl(hex: string): string {
  const value = hex.replace("#", "")
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return "0 100% 50%"
  const r = parseInt(value.slice(0, 2), 16) / 255
  const g = parseInt(value.slice(2, 4), 16) / 255
  const b = parseInt(value.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h /= 6
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
}

function validateDraft(draft: AdminArticle): string[] {
  const issues: string[] = []
  const settings = draft.settings ?? normalizeArticleSettings()
  const rawCta = settings.cta

  if (draft.title.trim().length < 3) issues.push("Judul minimal 3 karakter.")
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)) {
    issues.push("Slug cuma boleh huruf kecil, angka, dan tanda hubung.")
  }
  if (draft.slug === "baru") {
    issues.push('Slug "baru" dipakai route admin, pilih slug lain.')
  }
  if (draft.description.trim().length < 10) issues.push("Deskripsi minimal 10 karakter.")
  if (draft.category.trim().length < 2) issues.push("Kategori wajib diisi.")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) issues.push("Tanggal publikasi nggak valid.")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.updated)) issues.push("Tanggal update nggak valid.")
  if (draft.keyPoints.filter((point) => point.trim()).length === 0) {
    issues.push("Isi minimal satu poin penting.")
  }
  if (draft.sections.length === 0) issues.push("Artikel butuh minimal satu bagian.")

  const ids = new Set<string>()
  draft.sections.forEach((section, index) => {
    if (!section.id.trim() || ids.has(section.id)) {
      issues.push(`ID bagian ${index + 1} kosong atau dobel.`)
    }
    ids.add(section.id)
    if (section.title.trim().length < 2) {
      issues.push(`Judul bagian ${index + 1} minimal 2 karakter.`)
    }
    if (!section.blocks.some(blockHasContent)) {
      issues.push(`Bagian ${index + 1} butuh minimal satu blok yang terisi.`)
    }
  })

  if (settings.heroImage && !safeHttpsUrl(settings.heroImage)) {
    issues.push("URL gambar hero harus HTTPS dan valid.")
  }
  if (draft.hue.trim() && safeArticleHue(draft.hue) !== draft.hue.trim()) {
    issues.push("Hue harus format HSL, contoh: 258 85% 55%.")
  }
  if (rawCta) {
    const hasAny = Boolean(
      rawCta.title.trim() ||
        rawCta.label.trim() ||
        rawCta.href.trim() ||
        rawCta.eyebrow.trim() ||
        rawCta.description.trim()
    )
    if (hasAny && (!rawCta.title.trim() || !rawCta.label.trim() || !safeArticleHref(rawCta.href))) {
      issues.push("CTA butuh judul, label tombol, dan link internal/HTTPS yang valid.")
    }
  }

  return issues
}

function BlockEditor({
  block,
  index,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  canMoveUp,
  canMoveDown,
}: {
  block: ArticleBlock
  index: number
  onChange: (block: ArticleBlock) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDuplicate: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  const typeLabel = BLOCK_TYPES.find((item) => item.type === block.type)?.label ?? block.type

  return (
    <div className="border border-border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center bg-accent font-mono text-[9px] text-accent-foreground">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-foreground/45">
            {typeLabel}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          <button type="button" onClick={onMoveUp} disabled={!canMoveUp} className={SMALL_BUTTON} aria-label="Geser blok ke atas">
            ↑
          </button>
          <button type="button" onClick={onMoveDown} disabled={!canMoveDown} className={SMALL_BUTTON} aria-label="Geser blok ke bawah">
            ↓
          </button>
          <button type="button" onClick={onDuplicate} className={SMALL_BUTTON}>
            Duplikat
          </button>
          <button type="button" onClick={onRemove} className={`${SMALL_BUTTON} hover:border-destructive hover:text-destructive`}>
            Hapus
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {block.type === "p" && (
          <RichTextEditor
            value={block.text}
            onChange={(text) => onChange({ type: "p", text })}
            rows={4}
            placeholder="Tulis paragraf..."
            className={INPUT}
            ariaLabel="Isi paragraf"
          />
        )}

        {(block.type === "ul" || block.type === "ol") && (
          <div className="flex flex-col gap-2">
            {block.items.map((item, itemIndex) => (
              <div key={`${block.type}-${itemIndex}`} className="flex items-start gap-2">
                <RichTextEditor
                  value={item}
                  onChange={(next) => {
                    const items = [...block.items]
                    items[itemIndex] = next
                    onChange({ type: block.type, items })
                  }}
                  multiline={false}
                  compact
                  placeholder={`Item ${itemIndex + 1}`}
                  className={INPUT}
                  ariaLabel={`Item ${itemIndex + 1}`}
                  wrapperClassName="flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    const items = block.items.filter((_, indexItem) => indexItem !== itemIndex)
                    onChange({ type: block.type, items: items.length ? items : [""] })
                  }}
                  className={`${SMALL_BUTTON} shrink-0`}
                  aria-label="Hapus item"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={block.items.length >= MAX_LIST_ITEMS}
              onClick={() => {
                if (block.items.length >= MAX_LIST_ITEMS) return
                onChange({ type: block.type, items: [...block.items, ""] })
              }}
              className={`${SMALL_BUTTON} self-start`}
            >
              + Item {block.items.length >= MAX_LIST_ITEMS ? `(maks. ${MAX_LIST_ITEMS})` : ""}
            </button>
          </div>
        )}

        {block.type === "note" && (
          <>
            <div>
              <span className={LABEL}>Label catatan</span>
              <input
                value={block.label}
                onChange={(event) => onChange({ type: "note", label: event.target.value, text: block.text })}
                className={INPUT}
              />
            </div>
            <RichTextEditor
              value={block.text}
              onChange={(text) => onChange({ type: "note", label: block.label, text })}
              rows={3}
              placeholder="Isi catatan..."
              className={INPUT}
              ariaLabel="Isi catatan"
            />
          </>
        )}

        {block.type === "steps" && (
          <div className="flex flex-col gap-2">
            {block.items.map((item, itemIndex) => (
              <div key={`step-${itemIndex}`} className="border border-border bg-background/50 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-accent">
                    Langkah {String(itemIndex + 1).padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const items = block.items.filter((_, indexItem) => indexItem !== itemIndex)
                      onChange({
                        type: "steps",
                        items: items.length ? items : [{ title: "", text: "" }],
                      })
                    }}
                    className={`${SMALL_BUTTON} border-destructive/30 text-destructive`}
                  >
                    Hapus
                  </button>
                </div>
                <input
                  value={item.title}
                  onChange={(event) => {
                    const items = block.items.map((entry, indexItem) =>
                      indexItem === itemIndex ? { ...entry, title: event.target.value } : entry
                    )
                    onChange({ type: "steps", items })
                  }}
                  placeholder="Judul langkah"
                  className={`${INPUT} mt-2`}
                />
                <div className="mt-2">
                  <RichTextEditor
                    value={item.text}
                    onChange={(text) => {
                      const items = block.items.map((entry, indexItem) =>
                        indexItem === itemIndex ? { ...entry, text } : entry
                      )
                      onChange({ type: "steps", items })
                    }}
                    rows={2}
                    placeholder="Penjelasan langkah"
                    className={INPUT}
                    ariaLabel={`Penjelasan langkah ${itemIndex + 1}`}
                    compact
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              disabled={block.items.length >= MAX_STEPS}
              onClick={() => {
                if (block.items.length >= MAX_STEPS) return
                onChange({ type: "steps", items: [...block.items, { title: "", text: "" }] })
              }}
              className={`${SMALL_BUTTON} self-start`}
            >
              + Langkah {block.items.length >= MAX_STEPS ? `(maks. ${MAX_STEPS})` : ""}
            </button>
          </div>
        )}

        {block.type === "links" && (
          <>
            <div>
              <span className={LABEL}>Judul blok</span>
              <input
                value={block.title}
                onChange={(event) => onChange({ type: "links", title: event.target.value, items: block.items })}
                className={INPUT}
              />
            </div>
            <div className="flex flex-col gap-2">
              {block.items.map((item, itemIndex) => (
                <div key={`link-${itemIndex}`} className="grid grid-cols-1 gap-2 border border-border bg-background/50 p-2.5 md:grid-cols-[0.8fr_1.2fr_auto]">
                  <input
                    value={item.label}
                    onChange={(event) => {
                      const items = block.items.map((entry, indexItem) =>
                        indexItem === itemIndex ? { ...entry, label: event.target.value } : entry
                      )
                      onChange({ type: "links", title: block.title, items })
                    }}
                    placeholder="Label"
                    className={INPUT}
                  />
                  <input
                    value={item.href}
                    onChange={(event) => {
                      const items = block.items.map((entry, indexItem) =>
                        indexItem === itemIndex ? { ...entry, href: event.target.value } : entry
                      )
                      onChange({ type: "links", title: block.title, items })
                    }}
                    placeholder="/top-up/... atau https://..."
                    className={INPUT}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const items = block.items.filter((_, indexItem) => indexItem !== itemIndex)
                      onChange({
                        type: "links",
                        title: block.title,
                        items: items.length ? items : [{ label: "", href: "" }],
                      })
                    }}
                    className={SMALL_BUTTON}
                  >
                    Hapus
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={block.items.length >= MAX_LINKS}
                onClick={() => {
                  if (block.items.length >= MAX_LINKS) return
                  onChange({
                    type: "links",
                    title: block.title,
                    items: [...block.items, { label: "", href: "" }],
                  })
                }}
                className={`${SMALL_BUTTON} self-start`}
              >
                + Tautan {block.items.length >= MAX_LINKS ? `(maks. ${MAX_LINKS})` : ""}
              </button>
            </div>
          </>
        )}

        {block.type === "table" && (
          <div className="flex flex-col gap-2">
            <div className="overflow-x-auto border border-border">
              <table className="w-full min-w-[420px] border-collapse">
                <thead>
                  <tr>
                    {block.headers.map((header, headerIndex) => (
                      <th key={`header-${headerIndex}`} className="border-b border-r border-border p-1.5 last:border-r-0">
                        <input
                          value={header}
                          onChange={(event) => {
                            const headers = [...block.headers]
                            headers[headerIndex] = event.target.value
                            onChange({ type: "table", headers, rows: block.rows })
                          }}
                          className={`${INPUT} min-w-[120px] border-0 bg-transparent`}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={`row-${rowIndex}`}>
                      {block.headers.map((_, cellIndex) => (
                        <td key={`cell-${rowIndex}-${cellIndex}`} className="border-b border-r border-border p-1.5 last:border-r-0">
                          <input
                            value={row[cellIndex] ?? ""}
                            onChange={(event) => {
                              const rows = block.rows.map((entry, indexRow) =>
                                indexRow === rowIndex
                                  ? entry.map((cell, indexCell) =>
                                      indexCell === cellIndex ? event.target.value : cell
                                    )
                                  : entry
                              )
                              onChange({ type: "table", headers: block.headers, rows })
                            }}
                            className={`${INPUT} min-w-[120px] border-0 bg-transparent`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={block.headers.length >= MAX_TABLE_COLUMNS}
                onClick={() => {
                  if (block.headers.length >= MAX_TABLE_COLUMNS) return
                  onChange({
                    type: "table",
                    headers: [...block.headers, `Kolom ${block.headers.length + 1}`],
                    rows: block.rows.map((row) => [...row, ""]),
                  })
                }}
                className={SMALL_BUTTON}
              >
                + Kolom {block.headers.length >= MAX_TABLE_COLUMNS ? `(maks. ${MAX_TABLE_COLUMNS})` : ""}
              </button>
              <button
                type="button"
                disabled={block.headers.length <= 1}
                onClick={() => {
                  const headers = block.headers.slice(0, -1)
                  if (!headers.length) return
                  onChange({
                    type: "table",
                    headers,
                    rows: block.rows.map((row) => row.slice(0, -1)),
                  })
                }}
                className={SMALL_BUTTON}
              >
                − Kolom
              </button>
              <button
                type="button"
                disabled={block.rows.length >= MAX_TABLE_ROWS}
                onClick={() => {
                  if (block.rows.length >= MAX_TABLE_ROWS) return
                  onChange({
                    type: "table",
                    headers: block.headers,
                    rows: [...block.rows, block.headers.map(() => "")],
                  })
                }}
                className={SMALL_BUTTON}
              >
                + Baris {block.rows.length >= MAX_TABLE_ROWS ? `(maks. ${MAX_TABLE_ROWS})` : ""}
              </button>
              <button
                type="button"
                disabled={block.rows.length <= 1}
                onClick={() =>
                  onChange({
                    type: "table",
                    headers: block.headers,
                    rows: block.rows.length > 1 ? block.rows.slice(0, -1) : block.rows,
                  })
                }
                className={SMALL_BUTTON}
              >
                − Baris
              </button>
            </div>
            <p className="font-mono text-[9px] text-foreground/30">
              Tabel bisa digeser horizontal di layar kecil.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export function AdminArticleEditor({
  article,
  games,
  mode,
}: {
  article: AdminArticle
  games: AdminGameOption[]
  mode: "create" | "edit"
}) {
  const router = useRouter()
  const [draft, setDraft] = useState<AdminArticle>(() => ({
    ...article,
    settings: normalizeArticleSettings(article.settings),
  }))
  const [tab, setTab] = useState<Tab>("content")
  const [busy, setBusy] = useState<ArticleStatus | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [dirty, setDirty] = useState(mode === "create")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const settings = draft.settings ?? normalizeArticleSettings()
  const cta = settings.cta ?? EMPTY_CTA
  const heroImage = safeHttpsUrl(settings.heroImage ?? "")
  const previewSettings = normalizeArticleSettings(settings)

  function touch() {
    setDirty(true)
    setError(null)
    setMessage(null)
  }

  function patch(next: Partial<AdminArticle>) {
    setDraft((previous) => ({ ...previous, ...next }))
    touch()
  }

  function patchSettings(next: Partial<ArticleSettings>) {
    setDraft((previous) => ({
      ...previous,
      settings: {
        ...(previous.settings ?? normalizeArticleSettings()),
        ...next,
      },
    }))
    touch()
  }

  function patchCta(next: Partial<ArticleCta>) {
    patchSettings({ cta: { ...cta, ...next } })
  }

  function patchSections(updater: (sections: ArticleSection[]) => ArticleSection[]) {
    setDraft((previous) => ({ ...previous, sections: updater(previous.sections) }))
    touch()
  }

  function updateSection(index: number, next: ArticleSection) {
    patchSections((sections) => sections.map((section, itemIndex) => (itemIndex === index ? next : section)))
  }

  function updateBlock(sectionIndex: number, blockIndex: number, next: ArticleBlock) {
    patchSections((sections) =>
      sections.map((section, itemIndex) =>
        itemIndex === sectionIndex
          ? {
              ...section,
              blocks: section.blocks.map((block, index) => (index === blockIndex ? next : block)),
            }
          : section
      )
    )
  }

  function addBlock(sectionIndex: number, type: ArticleBlock["type"]) {
    patchSections((sections) =>
      sections.map((section, itemIndex) =>
        itemIndex === sectionIndex
          ? { ...section, blocks: [...section.blocks, blankBlock(type)] }
          : section
      )
    )
  }

  function removeBlock(sectionIndex: number, blockIndex: number) {
    patchSections((sections) =>
      sections.map((section, itemIndex) =>
        itemIndex === sectionIndex
          ? {
              ...section,
              blocks: section.blocks.filter((_, index) => index !== blockIndex),
            }
          : section
      )
    )
  }

  function duplicateBlock(sectionIndex: number, blockIndex: number) {
    patchSections((sections) =>
      sections.map((section, itemIndex) => {
        if (itemIndex !== sectionIndex) return section
        if (section.blocks.length >= 30) return section
        const source = section.blocks[blockIndex]
        if (!source) return section
        const copy = JSON.parse(JSON.stringify(source)) as ArticleBlock
        const blocks = [...section.blocks]
        blocks.splice(blockIndex + 1, 0, copy)
        return { ...section, blocks }
      })
    )
  }

  function moveBlock(sectionIndex: number, blockIndex: number, direction: -1 | 1) {
    patchSections((sections) =>
      sections.map((section, itemIndex) =>
        itemIndex === sectionIndex
          ? { ...section, blocks: moveItem(section.blocks, blockIndex, direction) }
          : section
      )
    )
  }

  function addSection() {
    patchSections((sections) => [
      ...sections,
      {
        id: uniqueSectionId("bagian-baru", sections),
        title: "Bagian baru",
        blocks: [blankBlock("p")],
      },
    ])
  }

  function duplicateSection(index: number) {
    patchSections((sections) => {
      if (sections.length >= 20) return sections
      const source = sections[index]
      if (!source) return sections
      const copy = JSON.parse(JSON.stringify(source)) as ArticleSection
      copy.id = uniqueSectionId(`${source.id}-copy`, sections)
      copy.title = `${source.title} (copy)`
      const next = [...sections]
      next.splice(index + 1, 0, copy)
      return next
    })
  }

  function moveSection(index: number, direction: -1 | 1) {
    patchSections((sections) => moveItem(sections, index, direction))
  }

  function removeSection(index: number) {
    patchSections((sections) => sections.filter((_, itemIndex) => itemIndex !== index))
  }

  async function save(status: ArticleStatus) {
    if (
      status === "draft" &&
      draft.status === "published" &&
      !window.confirm(
        "Simpan sebagai draft akan menyembunyikan artikel ini dari halaman publik. Lanjut?"
      )
    ) {
      return
    }

    const issues = validateDraft(draft)
    if (issues.length > 0) {
      setError(issues.slice(0, 5).join(" "))
      setTab("content")
      return
    }

    setBusy(status)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch("/api/admin/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article: {
            ...draft,
            slug: draft.slug.trim().toLowerCase(),
            status,
            settings: normalizeArticleSettings(draft.settings),
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan artikel.")

      setDirty(false)
      setMessage(
        status === "published"
          ? "Artikel sudah live dan halaman publik sudah di-refresh."
          : "Perubahan disimpan sebagai draft."
      )

      if (mode === "create") {
        router.replace(`/admin/artikel/${data.slug ?? draft.slug}`)
      } else {
        setDraft((previous) => ({
          ...previous,
          status,
          source: "db",
          savedAt: new Date().toISOString(),
        }))
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan artikel.")
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    if (mode !== "edit") return
    const restoring = draft.hasStaticBase
    const confirmation = restoring
      ? `Kembalikan "${draft.title}" ke versi default? Semua perubahan admin akan dihapus.`
      : `Hapus permanen "${draft.title}"? Tindakan ini nggak bisa dibatalkan.`
    if (!window.confirm(confirmation)) return

    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/articles?slug=${encodeURIComponent(draft.slug)}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Gagal menghapus artikel.")
      router.replace("/admin/artikel")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus artikel.")
    } finally {
      setDeleting(false)
    }
  }

  const statusLabel = draft.status === "published" ? "Published" : "Draft"

  return (
    <main className="relative min-h-screen">
      <div className="noise-overlay" aria-hidden="true" />

      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/admin/artikel"
              className="flex h-9 w-9 shrink-0 items-center justify-center border border-border font-mono text-sm text-foreground/55 transition-colors hover:border-accent hover:text-foreground"
              aria-label="Kembali ke daftar artikel"
            >
              ←
            </Link>
            <div className="min-w-0">
              <span className="block font-mono text-[8px] uppercase tracking-[0.22em] text-accent">
                {mode === "create" ? "[Artikel Baru]" : "[Editor Artikel]"}
              </span>
              <h1 className="max-w-[42vw] truncate font-sans text-2xl uppercase leading-none tracking-tight text-foreground md:max-w-[48vw] md:text-3xl">
                {draft.title || "Tanpa judul"}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex min-h-[36px] items-center gap-1.5 border px-2.5 font-mono text-[9px] uppercase tracking-[0.12em] ${
                draft.status === "published"
                  ? "border-emerald-400/40 text-emerald-300"
                  : "border-amber-400/40 text-amber-300"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 ${
                  draft.status === "published" ? "bg-emerald-400" : "bg-amber-400"
                }`}
                aria-hidden="true"
              />
              {statusLabel}
            </span>
            {mode === "edit" && draft.status === "published" && (
              <Link
                href={`/artikel/${draft.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[38px] items-center justify-center border border-border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-foreground/55 transition-colors hover:border-accent hover:text-foreground"
              >
                Lihat ↗
              </Link>
            )}
            <button
              type="button"
              onClick={() => save("draft")}
              disabled={busy !== null || deleting}
              className="inline-flex min-h-[38px] items-center justify-center border border-border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-foreground/60 transition-colors hover:border-accent hover:text-foreground disabled:opacity-40"
            >
              {busy === "draft" ? "Menyimpan..." : "Simpan draft"}
            </button>
            <button
              type="button"
              onClick={() => save("published")}
              disabled={busy !== null || deleting}
              className="inline-flex min-h-[38px] items-center justify-center bg-accent px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-accent-foreground transition-opacity hover:opacity-85 disabled:opacity-40"
            >
              {busy === "published"
                ? "Menyimpan..."
                : draft.status === "published"
                  ? "Simpan & publish"
                  : "Publish"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1500px] px-4 py-4 md:px-8 md:py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="grid w-full grid-cols-2 gap-1.5 sm:flex sm:w-auto sm:flex-wrap">
            {TABS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setTab(item.value)}
                className={`min-h-[44px] border px-3 font-mono text-[9px] uppercase tracking-[0.14em] transition-colors ${
                  tab === item.value
                    ? "border-accent text-accent"
                    : "border-border text-foreground/45 hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-foreground/30">
            {dirty ? "● Belum disimpan" : "● Tersimpan"}
          </span>
        </div>

        {message && (
          <p className="mb-4 border border-emerald-400/30 bg-emerald-400/10 p-3 font-mono text-[10px] leading-relaxed text-emerald-300">
            {message}
          </p>
        )}
        {error && (
          <p className="mb-4 border border-destructive/40 bg-destructive/10 p-3 font-mono text-[10px] leading-relaxed text-destructive">
            {error}
          </p>
        )}

        {tab === "content" && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-w-0 flex-col gap-4">
              <Panel title="Informasi utama" hint="Data ini dipakai di kartu artikel, metadata, dan halaman publik.">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="md:col-span-2">
                    <span className={LABEL}>Judul *</span>
                    <input
                      value={draft.title}
                      onChange={(event) => patch({ title: event.target.value })}
                      placeholder="Cara top up ... yang aman"
                      maxLength={160}
                      className={INPUT}
                    />
                  </label>
                  <label>
                    <span className={LABEL}>Slug URL *</span>
                    <div className="flex gap-1.5">
                      <input
                        value={draft.slug}
                        onChange={(event) => patch({ slug: event.target.value.toLowerCase() })}
                        placeholder="cara-top-up..."
                        disabled={mode === "edit"}
                        className={`${INPUT} disabled:cursor-not-allowed disabled:opacity-55`}
                      />
                      {mode === "create" && (
                        <button
                          type="button"
                          onClick={() => patch({ slug: slugifyArticle(draft.title) })}
                          className={`${SMALL_BUTTON} shrink-0`}
                        >
                          Dari judul
                        </button>
                      )}
                    </div>
                  </label>
                  <label>
                    <span className={LABEL}>Kategori *</span>
                    <input
                      value={draft.category}
                      onChange={(event) => patch({ category: event.target.value })}
                      list="article-category-options"
                      className={INPUT}
                    />
                    <datalist id="article-category-options">
                      {CATEGORY_SUGGESTIONS.map((category) => (
                        <option key={category} value={category} />
                      ))}
                    </datalist>
                  </label>
                  <label className="md:col-span-2">
                    <span className={LABEL}>Deskripsi *</span>
                    <textarea
                      value={draft.description}
                      onChange={(event) => patch({ description: event.target.value })}
                      rows={3}
                      maxLength={320}
                      placeholder="Ringkasan yang muncul di kartu dan meta description."
                      className={INPUT}
                    />
                  </label>
                  <label>
                    <span className={LABEL}>Game terkait</span>
                    <select
                      value={draft.gameSlug ?? ""}
                      onChange={(event) => patch({ gameSlug: event.target.value || undefined })}
                      className={INPUT}
                    >
                      <option value="">— tanpa game —</option>
                      {games.map((game) => (
                        <option key={game.slug} value={game.slug}>
                          {game.short} — {game.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className={LABEL}>Tag</span>
                    <input
                      value={draft.tags.join(", ")}
                      onChange={(event) =>
                        patch({
                          // Biarkan item kosong saat mengetik supaya koma nggak
                          // langsung hilang; server yang membuang tag kosong.
                          tags: event.target.value
                            .split(",")
                            .map((tag) => tag.trim())
                            .slice(0, 8),
                        })
                      }
                      placeholder="diamond mlbb, top up, tips"
                      className={INPUT}
                    />
                  </label>
                  <label>
                    <span className={LABEL}>Tanggal publikasi</span>
                    <input
                      type="date"
                      value={draft.date}
                      onChange={(event) => patch({ date: event.target.value })}
                      className={INPUT}
                    />
                  </label>
                  <label>
                    <span className={LABEL}>Tanggal diperbarui</span>
                    <input
                      type="date"
                      value={draft.updated}
                      onChange={(event) => patch({ updated: event.target.value })}
                      className={INPUT}
                    />
                  </label>
                  <label>
                    <span className={LABEL}>Estimasi baca (menit)</span>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={draft.readMinutes}
                      onChange={(event) =>
                        patch({ readMinutes: Number(event.target.value) || 1 })
                      }
                      className={INPUT}
                    />
                  </label>
                  <label>
                    <span className={LABEL}>Glyph kartu</span>
                    <input
                      value={draft.glyph}
                      onChange={(event) => patch({ glyph: event.target.value.slice(0, 4) })}
                      maxLength={4}
                      placeholder="ML"
                      className={INPUT}
                    />
                  </label>
                </div>
              </Panel>

              <Panel
                title="Poin penting"
                hint="Maksimal 8 poin. Tampil di kotak [Yang penting dulu] sebelum isi artikel."
              >
                <div className="flex flex-col gap-2">
                  {draft.keyPoints.map((point, index) => (
                    <div key={`point-${index}`} className="flex gap-2">
                      <input
                        value={point}
                        onChange={(event) => {
                          const keyPoints = [...draft.keyPoints]
                          keyPoints[index] = event.target.value
                          patch({ keyPoints })
                        }}
                        placeholder={`Poin ${index + 1}`}
                        className={INPUT}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          patch({
                            keyPoints:
                              draft.keyPoints.length > 1
                                ? draft.keyPoints.filter((_, itemIndex) => itemIndex !== index)
                                : [""],
                          })
                        }
                        className={`${SMALL_BUTTON} shrink-0`}
                        aria-label="Hapus poin"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => patch({ keyPoints: [...draft.keyPoints, ""] })}
                    disabled={draft.keyPoints.length >= 8}
                    className={`${SMALL_BUTTON} self-start`}
                  >
                    + Poin (maks. 8)
                  </button>
                </div>
              </Panel>

              <Panel
                title="Konten halaman"
                hint="Susun bagian dan blok. ID bagian dipakai untuk anchor daftar isi."
                action={
                  <button type="button" onClick={addSection} disabled={draft.sections.length >= 20} className="inline-flex min-h-[34px] items-center justify-center bg-accent px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-accent-foreground transition-opacity hover:opacity-85 disabled:opacity-40">
                    + Bagian (maks. 20)
                  </button>
                }
              >
                <div className="flex flex-col gap-3">
                  {draft.sections.map((section, sectionIndex) => (
                    <div key={`${section.id}-${sectionIndex}`} className="border border-border bg-background/35 p-3">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-accent">
                          Bagian {String(sectionIndex + 1).padStart(2, "0")}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          <button type="button" onClick={() => moveSection(sectionIndex, -1)} disabled={sectionIndex === 0} className={SMALL_BUTTON} aria-label="Geser bagian ke atas">
                            ↑
                          </button>
                          <button type="button" onClick={() => moveSection(sectionIndex, 1)} disabled={sectionIndex === draft.sections.length - 1} className={SMALL_BUTTON} aria-label="Geser bagian ke bawah">
                            ↓
                          </button>
                          <button type="button" onClick={() => duplicateSection(sectionIndex)} className={SMALL_BUTTON}>
                            Duplikat
                          </button>
                          <button type="button" onClick={() => removeSection(sectionIndex)} disabled={draft.sections.length <= 1} className={`${SMALL_BUTTON} hover:border-destructive hover:text-destructive`}>
                            Hapus
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1.3fr_0.7fr]">
                        <label>
                          <span className={LABEL}>Judul bagian *</span>
                          <input
                            value={section.title}
                            onChange={(event) => updateSection(sectionIndex, { ...section, title: event.target.value })}
                            className={INPUT}
                          />
                        </label>
                        <label>
                          <span className={LABEL}>ID anchor *</span>
                          <input
                            value={section.id}
                            onChange={(event) => updateSection(sectionIndex, { ...section, id: slugifyArticle(event.target.value) })}
                            className={INPUT}
                          />
                        </label>
                      </div>

                      <div className="mt-3 flex flex-col gap-2">
                        {section.blocks.map((block, blockIndex) => (
                          <BlockEditor
                            key={`${section.id}-block-${blockIndex}`}
                            block={block}
                            index={blockIndex}
                            onChange={(next) => updateBlock(sectionIndex, blockIndex, next)}
                            onRemove={() => removeBlock(sectionIndex, blockIndex)}
                            onMoveUp={() => moveBlock(sectionIndex, blockIndex, -1)}
                            onMoveDown={() => moveBlock(sectionIndex, blockIndex, 1)}
                            onDuplicate={() => duplicateBlock(sectionIndex, blockIndex)}
                            canMoveUp={blockIndex > 0}
                            canMoveDown={blockIndex < section.blocks.length - 1}
                          />
                        ))}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
                        <span className="mr-1 self-center font-mono text-[9px] uppercase tracking-[0.12em] text-foreground/30">
                          Tambah blok:
                        </span>
                        {BLOCK_TYPES.map((type) => (
                          <button
                            key={type.type}
                            type="button"
                            onClick={() => addBlock(sectionIndex, type.type)}
                            disabled={section.blocks.length >= 30}
                            className={SMALL_BUTTON}
                          >
                            + {type.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Pertanyaan umum" hint="Tampil sebagai accordion FAQ dan masuk ke daftar isi.">
                <div className="flex flex-col gap-2">
                  {draft.faqs?.map((faq, index) => (
                    <div key={`faq-${index}`} className="grid grid-cols-1 gap-2 border border-border bg-background/50 p-2.5 md:grid-cols-[0.8fr_1.2fr_auto]">
                      <input
                        value={faq.q}
                        onChange={(event) => {
                          const faqs = (draft.faqs ?? []).map((item, itemIndex) =>
                            itemIndex === index ? { ...item, q: event.target.value } : item
                          )
                          patch({ faqs })
                        }}
                        placeholder="Pertanyaan"
                        className={INPUT}
                      />
                      <textarea
                        value={faq.a}
                        onChange={(event) => {
                          const faqs = (draft.faqs ?? []).map((item, itemIndex) =>
                            itemIndex === index ? { ...item, a: event.target.value } : item
                          )
                          patch({ faqs })
                        }}
                        rows={2}
                        placeholder="Jawaban"
                        className={INPUT}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          patch({ faqs: (draft.faqs ?? []).filter((_, itemIndex) => itemIndex !== index) })
                        }
                        className={`${SMALL_BUTTON} self-start`}
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => patch({ faqs: [...(draft.faqs ?? []), { q: "", a: "" }] })}
                    disabled={(draft.faqs?.length ?? 0) >= 12}
                    className={`${SMALL_BUTTON} self-start`}
                  >
                    + Pertanyaan (maks. 12)
                  </button>
                </div>
              </Panel>
            </div>

            <aside className="flex flex-col gap-4">
              <Panel title="Publikasi">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3 border-b border-border pb-2.5">
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-foreground/35">
                      Status
                    </span>
                    <span className={draft.status === "published" ? "font-mono text-[9px] uppercase tracking-[0.12em] text-emerald-300" : "font-mono text-[9px] uppercase tracking-[0.12em] text-amber-300"}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 font-mono text-[9px] text-foreground/35">
                    <span>Sumber</span>
                    <span className="text-foreground/60">
                      {draft.source === "default" ? "Default Gastros" : "Override admin"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 font-mono text-[9px] text-foreground/35">
                    <span>Terakhir disimpan</span>
                    <span className="text-right text-foreground/60">{formatDateTime(draft.savedAt)}</span>
                  </div>
                  <Toggle
                    checked={Boolean(draft.featured)}
                    onChange={(checked) => patch({ featured: checked })}
                    label="Featured"
                    description="Kartu ini dapat slot besar di halaman /artikel."
                  />
                  {mode === "edit" && draft.source === "db" && (
                    <button
                      type="button"
                      onClick={remove}
                      disabled={deleting || busy !== null}
                      className="mt-1 inline-flex min-h-[38px] items-center justify-center border border-destructive/35 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-destructive/80 transition-colors hover:bg-destructive/10 disabled:opacity-40"
                    >
                      {deleting
                        ? "Memproses..."
                        : draft.hasStaticBase
                          ? "Reset ke default"
                          : "Hapus artikel"}
                    </button>
                  )}
                </div>
              </Panel>

              <Panel title="Alur publish" hint="Draft nggak muncul di /artikel, sidebar, sitemap, atau OG image.">
                <ol className="flex flex-col gap-2 font-mono text-[9px] leading-relaxed text-foreground/40">
                  <li>01. Isi konten dan cek tab Preview.</li>
                  <li>02. Simpan draft kalau masih mau diedit.</li>
                  <li>03. Klik Publish untuk menayangkan ke publik.</li>
                  <li>04. Untuk artikel default, simpan draft akan menyembunyikan versi lamanya sampai di-publish.</li>
                </ol>
              </Panel>
            </aside>
          </div>
        )}

        {tab === "design" && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex flex-col gap-4">
              <Panel title="Layout halaman" hint="Pilih kepadatan halaman detail artikel.">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  {ARTICLE_LAYOUTS.map((layout) => (
                    <button
                      key={layout.value}
                      type="button"
                      onClick={() => patchSettings({ layout: layout.value })}
                      className={`flex min-h-[116px] flex-col items-start border p-3 text-left transition-colors ${
                        settings.layout === layout.value
                          ? "border-accent bg-accent/[0.06]"
                          : "border-border bg-background hover:border-accent/50"
                      }`}
                    >
                      <span className="font-sans text-2xl uppercase leading-none tracking-tight text-foreground">
                        {layout.label}
                      </span>
                      <span className="mt-2 font-mono text-[9px] leading-relaxed text-foreground/40">
                        {layout.description}
                      </span>
                    </button>
                  ))}
                </div>
              </Panel>

              <Panel title="Hero image" hint="Opsional. URL HTTPS, tampil di halaman detail dan kartu artikel.">
                <label>
                  <span className={LABEL}>URL gambar</span>
                  <input
                    value={settings.heroImage ?? ""}
                    onChange={(event) => patchSettings({ heroImage: event.target.value })}
                    placeholder="https://.../hero.webp"
                    className={INPUT}
                  />
                </label>
                {settings.heroImage && (
                  <p className={`mt-2 font-mono text-[9px] ${heroImage ? "text-emerald-300/70" : "text-destructive"}`}>
                    {heroImage ? "URL valid — preview di bawah." : "URL belum valid. Gunakan HTTPS."}
                  </p>
                )}
                {heroImage && (
                  <div className="mt-3 overflow-hidden border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={heroImage} alt="Preview hero artikel" className="h-44 w-full object-cover" />
                  </div>
                )}
              </Panel>

              <Panel title="Visual kartu" hint="Hue dipakai untuk gradien kartu dan aksen visual artikel.">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <label>
                    <span className={LABEL}>Glyph</span>
                    <input
                      value={draft.glyph}
                      onChange={(event) => patch({ glyph: event.target.value.slice(0, 4) })}
                      maxLength={4}
                      className={INPUT}
                    />
                  </label>
                  <label>
                    <span className={LABEL}>Hue HSL</span>
                    <input
                      value={draft.hue}
                      onChange={(event) => patch({ hue: event.target.value })}
                      placeholder="258 85% 55%"
                      className={INPUT}
                    />
                  </label>
                  <label>
                    <span className={LABEL}>Warna</span>
                    <input
                      type="color"
                      value={hslToHex(draft.hue)}
                      onChange={(event) => patch({ hue: hexToHsl(event.target.value) })}
                      className="h-[42px] w-full min-w-[56px] cursor-pointer border border-border bg-background p-1"
                      aria-label="Pilih hue artikel"
                    />
                  </label>
                </div>
                <div
                  className="mt-3 flex h-24 items-center justify-center border border-border"
                  style={{
                    background: `radial-gradient(circle at 25% 25%, hsl(${safeArticleHue(draft.hue)} / 0.4), transparent 58%), linear-gradient(135deg, hsl(${safeArticleHue(draft.hue)} / 0.16), #080808 72%)`,
                  }}
                >
                  <span className="font-sans text-5xl leading-none tracking-tighter text-foreground/20">
                    {draft.glyph || "AR"}
                  </span>
                </div>
              </Panel>

              <Panel title="CTA bawah artikel" hint="Kalau kosong, CTA otomatis memakai game terkait atau katalog.">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label>
                    <span className={LABEL}>Eyebrow</span>
                    <input
                      value={cta.eyebrow}
                      onChange={(event) => patchCta({ eyebrow: event.target.value })}
                      placeholder="[Langkah berikutnya]"
                      className={INPUT}
                    />
                  </label>
                  <label>
                    <span className={LABEL}>Label tombol</span>
                    <input
                      value={cta.label}
                      onChange={(event) => patchCta({ label: event.target.value })}
                      placeholder="Buka halaman top up →"
                      className={INPUT}
                    />
                  </label>
                  <label className="md:col-span-2">
                    <span className={LABEL}>Judul CTA</span>
                    <input
                      value={cta.title}
                      onChange={(event) => patchCta({ title: event.target.value })}
                      placeholder="Top up sekarang."
                      className={INPUT}
                    />
                  </label>
                  <label className="md:col-span-2">
                    <span className={LABEL}>Deskripsi</span>
                    <input
                      value={cta.description}
                      onChange={(event) => patchCta({ description: event.target.value })}
                      placeholder="Mulai dari Rp ... · tanpa login akun"
                      className={INPUT}
                    />
                  </label>
                  <label className="md:col-span-2">
                    <span className={LABEL}>Link CTA</span>
                    <input
                      value={cta.href}
                      onChange={(event) => patchCta({ href: event.target.value })}
                      placeholder="/top-up/mobile-legends atau https://..."
                      className={INPUT}
                    />
                  </label>
                </div>
                {settings.cta && (
                  <button
                    type="button"
                    onClick={() => patchSettings({ cta: undefined })}
                    className={`${SMALL_BUTTON} mt-3`}
                  >
                    Hapus CTA kustom
                  </button>
                )}
              </Panel>
            </div>

            <aside className="flex flex-col gap-4">
              <Panel title="Visibilitas elemen">
                <div className="flex flex-col gap-2">
                  <Toggle
                    checked={settings.showKeyPoints !== false}
                    onChange={(checked) => patchSettings({ showKeyPoints: checked })}
                    label="Poin penting"
                    description="Kotak ringkasan di atas isi."
                  />
                  <Toggle
                    checked={settings.showToc !== false}
                    onChange={(checked) => patchSettings({ showToc: checked })}
                    label="Daftar isi"
                    description="Sidebar anchor per bagian."
                  />
                  <Toggle
                    checked={settings.showRelated !== false}
                    onChange={(checked) => patchSettings({ showRelated: checked })}
                    label="Artikel terkait"
                    description="Dua rekomendasi di bawah artikel."
                  />
                  <Toggle
                    checked={settings.showFaq !== false}
                    onChange={(checked) => patchSettings({ showFaq: checked })}
                    label="FAQ"
                    description="Accordion pertanyaan umum."
                  />
                </div>
              </Panel>
              <Panel title="Catatan tampilan" hint="Pengaturan ini nggak mengubah konten, cuma cara halaman ditampilkan.">
                <p className="font-mono text-[9px] leading-relaxed text-foreground/40">
                  Layout Minimal menyembunyikan sidebar. Layout Wide memberi ruang lebih
                  untuk tabel dan langkah. Hero image tetap dijaga dalam rasio yang aman.
                </p>
              </Panel>
            </aside>
          </div>
        )}

        {tab === "seo" && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex flex-col gap-4">
              <Panel title="Metadata pencarian" hint="Kosongkan untuk memakai judul dan deskripsi utama.">
                <div className="flex flex-col gap-3">
                  <label>
                    <span className={LABEL}>SEO title</span>
                    <input
                      value={draft.seoTitle ?? ""}
                      onChange={(event) => patch({ seoTitle: event.target.value || undefined })}
                      maxLength={70}
                      placeholder={draft.title || "Judul untuk hasil pencarian"}
                      className={INPUT}
                    />
                    <span className="mt-1 block text-right font-mono text-[8px] text-foreground/25">
                      {(draft.seoTitle ?? "").length}/70
                    </span>
                  </label>
                  <label>
                    <span className={LABEL}>Meta description</span>
                    <textarea
                      value={draft.seoDescription ?? ""}
                      onChange={(event) => patch({ seoDescription: event.target.value || undefined })}
                      rows={3}
                      maxLength={160}
                      placeholder={draft.description || "Deskripsi untuk hasil pencarian"}
                      className={INPUT}
                    />
                    <span className="mt-1 block text-right font-mono text-[8px] text-foreground/25">
                      {(draft.seoDescription ?? "").length}/160
                    </span>
                  </label>
                  <Toggle
                    checked={Boolean(draft.noIndex)}
                    onChange={(checked) => patch({ noIndex: checked })}
                    label="Noindex halaman ini"
                    description="Halaman tetap bisa dibuka, tapi tidak diindeks Google."
                  />
                </div>
              </Panel>

              <Panel title="Preview hasil pencarian" hint="Tampilan kasar, bukan hasil final Google.">
                <div className="border border-border bg-background p-4">
                  <div className="font-mono text-[10px] text-emerald-300/80">
                    gastros.id › artikel › {draft.slug || "slug-artikel"}
                  </div>
                  <div className="mt-1 text-[15px] leading-snug text-sky-300">
                    {draft.seoTitle || draft.title || "Judul artikel kamu"}
                  </div>
                  <p className="mt-1 font-mono text-[10px] leading-relaxed text-foreground/50">
                    {draft.seoDescription || draft.description || "Deskripsi artikel akan muncul di sini."}
                  </p>
                </div>
              </Panel>
            </div>

            <aside className="flex flex-col gap-4">
              <Panel title="Checklist SEO">
                <ul className="flex flex-col gap-2 font-mono text-[9px] leading-relaxed text-foreground/45">
                  <li>· Slug pendek dan mengandung kata kunci.</li>
                  <li>· Title unik, jangan cuma mengulang nama game.</li>
                  <li>· Description menjelaskan manfaat artikel.</li>
                  <li>· Satu topik utama per artikel.</li>
                  <li>· Gunakan FAQ untuk pertanyaan yang sering dicari.</li>
                </ul>
              </Panel>
              <Panel title="Canonical" hint="Otomatis mengikuti slug dan domain publik.">
                <p className="break-all font-mono text-[10px] leading-relaxed text-foreground/50">
                  https://gastros.id/artikel/{draft.slug || "slug-artikel"}
                </p>
              </Panel>
            </aside>
          </div>
        )}

        {tab === "preview" && (
          <div className="mx-auto w-full max-w-[1100px]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border border-border bg-card px-3 py-2.5">
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-accent">
                [Preview konten]
              </span>
              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-foreground/30">
                {previewSettings.layout} · {statusLabel}
              </span>
            </div>

            <div className="border border-border bg-background p-4 md:p-8">
              {safeHttpsUrl(previewSettings.heroImage ?? "") && (
                <div className="relative mb-6 overflow-hidden border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={safeHttpsUrl(previewSettings.heroImage ?? "")}
                    alt=""
                    className="h-52 w-full object-cover md:h-72"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                </div>
              )}

              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-[0.14em] text-foreground/40">
                <span className="text-accent">{draft.category || "Kategori"}</span>
                <span aria-hidden="true">/</span>
                <span>{draft.date || "Tanggal"}</span>
                <span aria-hidden="true">/</span>
                <span>{draft.readMinutes} menit baca</span>
              </div>
              <h2 className="max-w-4xl font-sans text-5xl uppercase leading-[0.88] tracking-tighter text-foreground md:text-7xl">
                {draft.title || "Judul artikel"}
              </h2>
              <p className="mt-4 max-w-2xl font-mono text-[11px] leading-relaxed text-foreground/55 md:text-sm">
                {draft.description || "Deskripsi artikel akan muncul di sini."}
              </p>

              {previewSettings.showKeyPoints && draft.keyPoints.some((point) => point.trim()) && (
                <div className="mt-6 border border-border bg-card p-4">
                  <span className="mb-2 block font-mono text-[9px] uppercase tracking-[0.2em] text-accent">
                    [Yang penting dulu]
                  </span>
                  <ul className="flex flex-col gap-2">
                    {draft.keyPoints.filter((point) => point.trim()).map((point, index) => (
                      <li key={`preview-point-${index}`} className="flex gap-2.5 font-mono text-[10px] leading-relaxed text-foreground/60">
                        <span className="mt-[0.45em] h-1.5 w-1.5 shrink-0 bg-accent" aria-hidden="true" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {previewSettings.showToc && draft.sections.length > 0 && (
                <div className="mt-6 border border-border bg-card p-4">
                  <span className="mb-2 block font-mono text-[9px] uppercase tracking-[0.2em] text-accent">
                    [Daftar isi]
                  </span>
                  <ol className="flex flex-col gap-1.5">
                    {draft.sections.map((section, index) => (
                      <li key={`preview-toc-${section.id}-${index}`} className="font-mono text-[10px] leading-relaxed text-foreground/45">
                        <span className="mr-2 text-foreground/25">{String(index + 1).padStart(2, "0")}</span>
                        {section.title || "Tanpa judul"}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="mt-8">
                <ArticleBody
                  sections={draft.sections}
                  faqs={previewSettings.showFaq ? draft.faqs : undefined}
                  preview
                />
              </div>

              {previewSettings.cta && (
                <div className="mt-8 flex flex-col items-start justify-between gap-4 border-2 border-accent bg-card p-4 md:flex-row md:items-center md:p-6">
                  <div>
                    <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.2em] text-accent">
                      {previewSettings.cta.eyebrow}
                    </span>
                    <p className="font-sans text-2xl uppercase leading-none tracking-tight text-foreground md:text-3xl">
                      {previewSettings.cta.title}
                    </p>
                    {previewSettings.cta.description && (
                      <p className="mt-1.5 font-mono text-[10px] text-foreground/45">
                        {previewSettings.cta.description}
                      </p>
                    )}
                  </div>
                  <span className="inline-flex min-h-[44px] shrink-0 items-center justify-center bg-accent px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-foreground">
                    {previewSettings.cta.label}
                  </span>
                </div>
              )}

              <p className="mt-6 border-t border-border pt-4 font-mono text-[9px] leading-relaxed text-foreground/30">
                Preview ini tidak menjalankan link. Buka halaman publik setelah publish untuk
                mengecek hasil final.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
