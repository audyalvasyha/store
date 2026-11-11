import Link from "next/link"
import { Fragment, type ReactNode } from "react"
import { safeArticleHref } from "@/lib/article-index"
import type { ArticleBlock, ArticleSection } from "@/lib/articles"

function Block({ block, preview = false }: { block: ArticleBlock; preview?: boolean }) {
  if (block.type === "p") {
    return (
      <p className="font-mono text-[11px] leading-[1.85] text-foreground/65 md:text-[13px]">
        {block.text}
      </p>
    )
  }

  if (block.type === "ul" || block.type === "ol") {
    const Tag = block.type === "ul" ? "ul" : "ol"
    return (
      <Tag
        className={`flex flex-col gap-2 pl-5 font-mono text-[11px] leading-[1.8] text-foreground/65 md:text-[13px] ${
          block.type === "ul" ? "list-disc" : "list-decimal"
        }`}
      >
        {block.items.map((item) => (
          <li key={item} className="pl-1 marker:text-accent">
            {item}
          </li>
        ))}
      </Tag>
    )
  }

  if (block.type === "note") {
    return (
      <aside className="relative border border-accent/35 bg-accent/[0.06] p-4 md:p-5">
        <span className="absolute left-0 top-0 h-full w-[3px] bg-accent" aria-hidden="true" />
        <span className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.2em] text-accent">
          [{block.label}]
        </span>
        <p className="font-mono text-[10px] leading-relaxed text-foreground/70 md:text-xs">
          {block.text}
        </p>
      </aside>
    )
  }

  if (block.type === "steps") {
    return (
      <ol className="flex flex-col gap-3">
        {block.items.map((item, index) => (
          <li key={item.title} className="flex gap-3 border border-border bg-card p-3 md:p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-accent font-mono text-[10px] text-accent-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <span className="block font-sans text-lg uppercase leading-none tracking-tight text-foreground">
                {item.title}
              </span>
              <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-foreground/55 md:text-xs">
                {item.text}
              </p>
            </div>
          </li>
        ))}
      </ol>
    )
  }

  if (block.type === "links") {
    return (
      <div className="border border-border bg-background/60 p-4">
        <span className="mb-3 block font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/40">
          {block.title}
        </span>
        <div className="flex flex-col gap-1.5">
          {block.items.map((item, index) => {
            const href = safeArticleHref(item.href)
            if (!href) return null
            const linkClass =
              "group inline-flex min-h-[36px] items-center justify-between gap-3 border-b border-border/60 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-foreground/65 transition-colors hover:text-accent md:text-[11px]"
            const label = (
              <>
                {item.label}
                <span className="text-accent transition-transform group-hover:translate-x-1" aria-hidden="true">
                  →
                </span>
              </>
            )

            if (preview) {
              return (
                <span key={`${href}-${index}`} className={linkClass} aria-disabled="true">
                  {label}
                </span>
              )
            }

            if (href.startsWith("https://")) {
              return (
                <a
                  key={`${href}-${index}`}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  {label}
                </a>
              )
            }

            return (
              <Link key={`${href}-${index}`} href={href} className={linkClass}>
                {label}
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  if (block.type === "table") {
    return (
      <div className="overflow-x-auto border border-border">
        <table className="w-full min-w-[480px] border-collapse text-left">
          <thead>
            <tr className="bg-card">
              {block.headers.map((header) => (
                <th
                  key={header}
                  className="border-b border-border px-3 py-2.5 font-mono text-[9px] uppercase tracking-[0.15em] text-accent"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={`${row[0]}-${rowIndex}`} className="border-b border-border/60 last:border-b-0">
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${cell}-${cellIndex}`}
                    className={`px-3 py-2.5 font-mono text-[10px] leading-relaxed md:text-[11px] ${
                      cellIndex === 0 ? "text-foreground" : "text-foreground/55"
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return null
}

export function ArticleBody({
  sections,
  faqs,
  preview = false,
  inArticleAd,
  adAfterSection = 2,
}: {
  sections: ArticleSection[]
  faqs?: Array<{ q: string; a: string }>
  preview?: boolean
  /** Slot iklan yang disisipkan setelah section tertentu. */
  inArticleAd?: ReactNode
  /** Section ke berapa iklan dipasang (1-based). */
  adAfterSection?: number
}) {
  return (
    <div className="flex flex-col gap-9 md:gap-12">
      {sections.map((section, sectionIndex) => (
        <Fragment key={section.id}>
          <section id={section.id} className="scroll-mt-24">
            <h2 className="mb-3 border-l-2 border-accent pl-3 font-sans text-2xl uppercase leading-none tracking-tight text-foreground md:mb-4 md:text-3xl">
              {section.title}
            </h2>
            <div className="flex flex-col gap-4 md:gap-5">
              {section.blocks.map((block, index) => (
                <Block
                  key={`${section.id}-${block.type}-${index}`}
                  block={block}
                  preview={preview}
                />
              ))}
            </div>
          </section>
          {inArticleAd && sectionIndex + 1 === adAfterSection ? (
            <div className="w-full">{inArticleAd}</div>
          ) : null}
        </Fragment>
      ))}

      {faqs && faqs.length > 0 && (
        <section id="faq" className="scroll-mt-24">
          <h2 className="mb-3 border-l-2 border-accent pl-3 font-sans text-2xl uppercase leading-none tracking-tight text-foreground md:mb-4 md:text-3xl">
            Pertanyaan umum
          </h2>
          <div className="border border-border">
            {faqs.map((faq) => (
              <details key={faq.q} className="group border-b border-border last:border-b-0">
                <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-mono text-[11px] leading-relaxed text-foreground/75 transition-colors hover:text-foreground md:text-xs [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span className="shrink-0 text-accent transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="px-4 pb-4 font-mono text-[10px] leading-relaxed text-foreground/55 md:text-xs">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
