"use client"

import { useEffect, useRef, useState } from "react"
import { safeArticleHref } from "@/lib/article-index"

type Field = HTMLInputElement | HTMLTextAreaElement

type LinkDraft = {
  start: number
  end: number
  label: string
  href: string
  error: string | null
}

const TOOL_BUTTON =
  "inline-flex h-8 min-w-8 items-center justify-center border border-border bg-background px-2 font-mono text-[10px] text-foreground/55 transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-25"
const LINK_INPUT =
  "min-h-[36px] w-full border border-border bg-background px-2 py-1.5 font-mono text-[10px] text-foreground placeholder:text-foreground/25 focus:border-accent focus:outline-none"

/**
 * Controlled textarea/input dengan toolbar format inline.
 * Nilai tetap disimpan sebagai teks dengan marker sederhana supaya schema
 * artikel dan konten lama nggak perlu migrasi.
 */
export function RichTextEditor({
  value,
  onChange,
  multiline = true,
  rows = 4,
  placeholder,
  className = "",
  wrapperClassName = "",
  ariaLabel,
  compact = false,
}: {
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  rows?: number
  placeholder?: string
  className?: string
  wrapperClassName?: string
  ariaLabel?: string
  compact?: boolean
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const linkHrefRef = useRef<HTMLInputElement>(null)
  const [link, setLink] = useState<LinkDraft | null>(null)
  const linkOpen = link !== null

  function field(): Field | null {
    return multiline ? textareaRef.current : inputRef.current
  }

  function selection() {
    const element = field()
    return {
      start: element?.selectionStart ?? value.length,
      end: element?.selectionEnd ?? value.length,
    }
  }

  function focusRange(start: number, end: number) {
    requestAnimationFrame(() => {
      const element = field()
      element?.focus()
      element?.setSelectionRange(start, end)
    })
  }

  function wrap(before: string, after: string, fallback: string) {
    // Kalau panel link masih kebuka, posisi seleksinya sudah nggak relevan
    // setelah teks berubah — tutup dulu biar nggak nimpa range lama.
    if (linkOpen) setLink(null)
    const { start, end } = selection()
    const selected = value.slice(start, end)
    const alreadyWrapped =
      value.slice(Math.max(0, start - before.length), start) === before &&
      value.slice(end, end + after.length) === after

    if (alreadyWrapped) {
      const next = value.slice(0, start - before.length) + selected + value.slice(end + after.length)
      onChange(next)
      focusRange(start - before.length, start - before.length + selected.length)
      return
    }

    const content = selected || fallback
    const next = value.slice(0, start) + before + content + after + value.slice(end)
    onChange(next)
    focusRange(start + before.length, start + before.length + content.length)
  }

  function openLink() {
    const { start, end } = selection()
    setLink({
      start,
      end,
      label: value.slice(start, end) || "teks link",
      href: "",
      error: null,
    })
  }

  useEffect(() => {
    // Fokus cuma saat panel link pertama dibuka, bukan setiap kali input berubah.
    if (linkOpen) linkHrefRef.current?.focus()
  }, [linkOpen])

  function applyLink() {
    if (!link) return
    const href = safeArticleHref(link.href)
    if (!href) {
      setLink({
        ...link,
        error: "Link harus path internal (mis. /top-up/mobile-legends) atau URL https://.",
      })
      return
    }

    const label = link.label.trim().replace(/[[\]]/g, "") || "teks link"
    const markdown = `[${label}](${href})`
    const next = value.slice(0, link.start) + markdown + value.slice(link.end)
    onChange(next)
    setLink(null)
    focusRange(link.start + markdown.length, link.start + markdown.length)
  }

  function handleKeyDown(event: React.KeyboardEvent<Field>) {
    if (!event.metaKey && !event.ctrlKey) return
    const key = event.key.toLowerCase()
    if (key === "b") {
      event.preventDefault()
      wrap("**", "**", "tebal")
    } else if (key === "i") {
      event.preventDefault()
      wrap("*", "*", "miring")
    } else if (key === "u") {
      event.preventDefault()
      wrap("++", "++", "garis bawah")
    } else if (key === "k") {
      event.preventDefault()
      openLink()
    }
  }

  const fieldProps = {
    value,
    onChange: (event: React.ChangeEvent<Field>) => {
      if (linkOpen) setLink(null)
      onChange(event.target.value)
    },
    onKeyDown: handleKeyDown,
    onFocus: () => {
      // Klik balik ke editor = batalin panel link yang masih kebuka, supaya
      // range seleksi lama nggak dipakai setelah kursor dipindah.
      if (linkOpen) setLink(null)
    },
    placeholder,
    "aria-label": ariaLabel,
    className,
  }

  return (
    <div className={`min-w-0 ${wrapperClassName}`}>
      <div className={`flex flex-wrap items-center gap-1 ${compact ? "" : "mb-2"}`}>
        <button
          type="button"
          title="Bold (Ctrl+B)"
          aria-label="Bold"
          className={`${TOOL_BUTTON} font-bold`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => wrap("**", "**", "tebal")}
        >
          B
        </button>
        <button
          type="button"
          title="Italic (Ctrl+I)"
          aria-label="Italic"
          className={`${TOOL_BUTTON} italic`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => wrap("*", "*", "miring")}
        >
          I
        </button>
        <button
          type="button"
          title="Underline (Ctrl+U)"
          aria-label="Underline"
          className={`${TOOL_BUTTON} underline`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => wrap("++", "++", "garis bawah")}
        >
          U
        </button>
        <button
          type="button"
          title="Sisipkan link (Ctrl+K)"
          aria-label="Sisipkan link"
          className={`${TOOL_BUTTON} gap-1.5`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={openLink}
        >
          <span aria-hidden="true">↗</span>
          Link
        </button>
        {!compact && (
          <span className="ml-auto hidden font-mono text-[8px] text-foreground/25 sm:inline">
            **bold** · *italic* · ++underline++ · [label](url)
          </span>
        )}
      </div>

      {link && (
        <div className="mb-2 border border-accent/40 bg-background p-2.5">
          <div className="grid gap-2 sm:grid-cols-[0.8fr_1.2fr]">
            <label className="min-w-0">
              <span className="mb-1 block font-mono text-[8px] uppercase tracking-[0.12em] text-foreground/40">
                Label link
              </span>
              <input
                value={link.label}
                onChange={(event) => setLink({ ...link, label: event.target.value, error: null })}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    linkHrefRef.current?.focus()
                  } else if (event.key === "Escape") {
                    setLink(null)
                  }
                }}
                placeholder="teks yang tampil"
                className={LINK_INPUT}
              />
            </label>
            <label className="min-w-0">
              <span className="mb-1 block font-mono text-[8px] uppercase tracking-[0.12em] text-foreground/40">
                URL tujuan
              </span>
              <input
                ref={linkHrefRef}
                value={link.href}
                onChange={(event) => setLink({ ...link, href: event.target.value, error: null })}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    applyLink()
                  } else if (event.key === "Escape") {
                    setLink(null)
                  }
                }}
                placeholder="/top-up/... atau https://..."
                className={LINK_INPUT}
              />
            </label>
          </div>
          {link.error && (
            <p role="alert" className="mt-2 font-mono text-[9px] leading-relaxed text-destructive">
              {link.error}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={applyLink}
              className="inline-flex min-h-[36px] items-center bg-accent px-3 font-mono text-[9px] uppercase tracking-[0.12em] text-accent-foreground hover:opacity-85"
            >
              Sisipkan link
            </button>
            <button
              type="button"
              onClick={() => setLink(null)}
              className="inline-flex min-h-[36px] items-center border border-border px-3 font-mono text-[9px] uppercase tracking-[0.12em] text-foreground/50 hover:text-foreground"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {multiline ? (
        <textarea {...fieldProps} ref={textareaRef} rows={rows} />
      ) : (
        <input {...fieldProps} ref={inputRef} />
      )}
    </div>
  )
}
