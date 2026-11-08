"use client"

import { useState } from "react"

/** Form ulasan bintang 1–5 yang muncul di halaman order berstatus SELESAI. */
export function ReviewForm({ code }: { code: string }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function submit() {
    if (rating === 0 || busy) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, rating, comment }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setDone(true)
      } else {
        setMsg(data.error ?? "Gagal mengirim ulasan")
      }
    } catch {
      setMsg("Koneksi bermasalah, coba lagi.")
    }
    setBusy(false)
  }

  if (done) {
    return (
      <p className="font-mono text-[10px] md:text-xs text-foreground/70 leading-relaxed">
        Ulasan kamu <span className="text-accent">sudah terkirim</span>. Makasih ya — ulasan ini
        tampil di halaman game dan bantu pembeli lain. GG!
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-[10px] md:text-xs text-muted-foreground leading-relaxed">
        Order kamu sudah selesai. Kasih rating buat pengalaman top up ini — jujur aja, bintang
        bisa diubah sebelum kirim.
      </p>

      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            onClick={() => setRating(n)}
            aria-label={`Beri ${n} bintang`}
            className={`min-h-[44px] min-w-[44px] text-3xl md:text-4xl leading-none transition-colors ${
              (hover || rating) >= n
                ? "text-accent"
                : "text-foreground/20 hover:text-foreground/40"
            }`}
          >
            ★
          </button>
        ))}
        {rating > 0 && (
          <span className="font-mono text-[10px] text-foreground/50 ml-2">{rating}/5</span>
        )}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 500))}
        rows={3}
        maxLength={500}
        placeholder="Cerita singkat pengalaman top up kamu (opsional)…"
        className="bg-background border border-border p-3 font-mono text-[11px] md:text-xs text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-accent resize-y"
      />

      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[9px] text-foreground/35">{comment.length}/500</span>
        <button
          type="button"
          onClick={submit}
          disabled={rating === 0 || busy}
          className={`font-mono text-[10px] tracking-[0.2em] uppercase px-5 py-3 min-h-[44px] ${
            rating === 0 || busy
              ? "bg-foreground/10 text-foreground/30 cursor-not-allowed"
              : "bg-accent text-accent-foreground hover-glitch"
          }`}
        >
          {busy ? "Mengirim..." : "Kirim Ulasan"}
        </button>
      </div>

      {msg && <p className="font-mono text-[10px] text-destructive">{msg}</p>}
    </div>
  )
}
