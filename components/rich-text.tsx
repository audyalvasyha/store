import Link from "next/link"
import { Fragment, type ReactNode } from "react"
import { safeArticleHref } from "@/lib/article-index"

/**
 * Renderer inline untuk teks artikel:
 * - **bold**
 * - *italic*
 * - ++underline++
 * - [label](/path) atau [label](https://...)
 *
 * Semua link lewat safeArticleHref, jadi javascript:/data: tetap ditolak.
 * Parser mengembalikan elemen React langsung — bukan innerHTML.
 */
const LINK_CLASS =
  "text-accent underline decoration-accent/40 underline-offset-2 transition-colors hover:decoration-accent"
const PREVIEW_LINK_CLASS = "text-accent underline decoration-accent/40 underline-offset-2"

function renderInline(text: string, key: string, preview: boolean, depth = 0): ReactNode[] {
  // Batasi nesting supaya konten aneh nggak bikin render terlalu dalam.
  if (depth > 8) {
    return [<Fragment key={`${key}-max-depth`}>{text}</Fragment>]
  }

  const nodes: ReactNode[] = []
  let buffer = ""
  let token = 0
  let index = 0

  function flush() {
    if (!buffer) return
    nodes.push(<Fragment key={`${key}-text-${token++}`}>{buffer}</Fragment>)
    buffer = ""
  }

  function push(node: ReactNode) {
    flush()
    nodes.push(node)
  }

  while (index < text.length) {
    // Backslash escape supaya karakter format bisa ditulis literal.
    if (text[index] === "\\" && index + 1 < text.length && "*+[]()\\".includes(text[index + 1]!)) {
      buffer += text[index + 1]
      index += 2
      continue
    }

    // [label](href)
    if (text[index] === "[") {
      const match = /^\[([^[\]]+)\]\(([^)\s]+)\)/.exec(text.slice(index))
      if (match) {
        const href = safeArticleHref(match[2]!)
        if (href) {
          const label = renderInline(match[1]!, `${key}-link-${token}`, preview, depth + 1)
          const linkKey = `${key}-link-${token++}`
          if (preview) {
            push(
              <span key={linkKey} className={PREVIEW_LINK_CLASS} aria-disabled="true">
                {label}
              </span>
            )
          } else if (href.startsWith("https://")) {
            push(
              <a
                key={linkKey}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={LINK_CLASS}
              >
                {label}
              </a>
            )
          } else {
            push(
              <Link key={linkKey} href={href} className={LINK_CLASS}>
                {label}
              </Link>
            )
          }
          index += match[0].length
          continue
        }
      }
    }

    // **bold**
    if (text.startsWith("**", index)) {
      const end = text.indexOf("**", index + 2)
      if (end > index + 2) {
        push(
          <strong key={`${key}-bold-${token++}`} className="font-semibold text-foreground/85">
            {renderInline(text.slice(index + 2, end), `${key}-bold-${token}`, preview, depth + 1)}
          </strong>
        )
        index = end + 2
        continue
      }
    }

    // ++underline++
    if (text.startsWith("++", index)) {
      const end = text.indexOf("++", index + 2)
      if (end > index + 2) {
        push(
          <u
            key={`${key}-underline-${token++}`}
            className="underline decoration-accent/60 underline-offset-2"
          >
            {renderInline(text.slice(index + 2, end), `${key}-underline-${token}`, preview, depth + 1)}
          </u>
        )
        index = end + 2
        continue
      }
    }

    // *italic* — jangan sampai menangkap **bold**.
    if (text[index] === "*" && !text.startsWith("**", index)) {
      let end = index + 1
      while (true) {
        end = text.indexOf("*", end)
        if (end === -1) break
        if (text[end - 1] !== "*" && text[end + 1] !== "*") break
        end += 1
      }
      if (end > index + 1) {
        push(
          <em key={`${key}-italic-${token++}`} className="italic">
            {renderInline(text.slice(index + 1, end), `${key}-italic-${token}`, preview, depth + 1)}
          </em>
        )
        index = end + 1
        continue
      }
    }

    buffer += text[index]
    index += 1
  }

  flush()
  return nodes
}

export function RichText({ text, preview = false }: { text: string; preview?: boolean }) {
  if (!text) return null
  return <>{renderInline(text, "rich", preview)}</>
}
