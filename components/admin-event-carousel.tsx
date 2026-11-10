"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  DEFAULT_EVENT_SUBTITLE,
  MAX_EVENT_IMAGE_BYTES,
  MAX_EVENT_SLIDES,
  makeSlideId,
  type EventSlide,
} from "@/lib/event-carousel"

const MAX_IMAGE_MB = Math.round(MAX_EVENT_IMAGE_BYTES / 1_000_000)

/** Kompres di browser dulu supaya upload tetap di bawah batas body Vercel. */
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const maxWidth = 1600
    const scale = Math.min(1, maxWidth / bitmap.width)
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Canvas nggak tersedia di browser ini")
    context.drawImage(bitmap, 0, 0, width, height)

    const webp = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.85)
    )
    if (webp) return webp
    const jpeg = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85)
    )
    if (jpeg) return jpeg
    throw new Error("Gagal mengompres gambar")
  } finally {
    bitmap.close()
  }
}

export function AdminEventCarousel({ initialSlides }: { initialSlides: EventSlide[] }) {
  const router = useRouter()
  const [slides, setSlides] = useState<EventSlide[]>(initialSlides)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})

  function patch(id: string, changes: Partial<EventSlide>) {
    setSlides((list) => list.map((slide) => (slide.id === id ? { ...slide, ...changes } : slide)))
  }

  function addSlide() {
    if (slides.length >= MAX_EVENT_SLIDES) return
    setSlides((list) => [
      ...list,
      {
        id: makeSlideId(),
        imageUrl: "",
        title: "EVENT BARU",
        subtitle: DEFAULT_EVENT_SUBTITLE,
        href: "",
        active: true,
      },
    ])
  }

  function removeSlide(id: string) {
    setSlides((list) => list.filter((slide) => slide.id !== id))
  }

  function moveSlide(id: string, direction: -1 | 1) {
    setSlides((list) => {
      const from = list.findIndex((slide) => slide.id === id)
      const to = from + direction
      if (from < 0 || to < 0 || to >= list.length) return list
      const next = [...list]
      ;[next[from], next[to]] = [next[to]!, next[from]!]
      return next
    })
  }

  async function uploadImage(id: string, file: File) {
    setUploadingId(id)
    setMessage(null)
    try {
      let blob: Blob
      try {
        blob = await compressImage(file)
      } catch {
        // Browser nggak bisa decode (mis. AVIF lama) — kirim asli kalau muat.
        if (file.size > MAX_EVENT_IMAGE_BYTES) throw new Error("Gambar kebesaran dan gagal dikompres")
        blob = file
      }
      if (blob.size > MAX_EVENT_IMAGE_BYTES) {
        throw new Error(`Gambar masih di atas ${MAX_IMAGE_MB} MB setelah dikompres`)
      }

      const body = new FormData()
      body.append("file", new File([blob], "event.webp", { type: blob.type }))
      const response = await fetch("/api/admin/events/upload", { method: "POST", body })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "Gagal upload gambar")

      patch(id, { imageUrl: data.url })
      setMessage("Gambar ter-upload. Klik Simpan Carousel untuk menampilkan di landing.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal upload gambar")
    } finally {
      setUploadingId(null)
      const input = fileInputs.current[id]
      if (input) input.value = ""
    }
  }

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides }),
      })
      const data = await response.json()
      if (!response.ok) {
        setMessage(data.error ?? "Gagal menyimpan carousel")
        return
      }
      setSlides(data.slides ?? slides)
      setMessage("Carousel event tersimpan dan landing sudah di-refresh.")
      router.refresh()
    } catch {
      setMessage("Koneksi bermasalah")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="border border-border bg-card p-4 md:p-6 flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] uppercase block">
              [Event Carousel] — panel kanan section &quot;Pilih Game&quot;
            </span>
            <p className="mt-2 max-w-2xl font-mono text-[10px] leading-relaxed text-foreground/50">
              Upload gambar (dikompres otomatis ke WebP) atau tempel URL https, lalu isi judul,
              badge, dan link. Maksimal {MAX_EVENT_SLIDES} slide. Kalau belum ada slide aktif,
              panel &quot;Gas.&quot; bawaan tetap tampil.
            </p>
          </div>
          <button
            type="button"
            onClick={addSlide}
            disabled={slides.length >= MAX_EVENT_SLIDES}
            className={`min-h-[44px] shrink-0 border px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.15em] ${
              slides.length >= MAX_EVENT_SLIDES
                ? "border-border text-foreground/25 cursor-not-allowed"
                : "border-accent text-accent hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            + Tambah Slide ({slides.length}/{MAX_EVENT_SLIDES})
          </button>
        </div>

        {slides.length === 0 && (
          <p className="border border-dashed border-border p-4 font-mono text-[10px] text-foreground/40">
            Belum ada slide. Landing masih memakai panel &quot;Gas. / Semua Server Aktif&quot;.
          </p>
        )}

        <div className="flex flex-col gap-4">
          {slides.map((slide, index) => (
            <div key={slide.id} className="border border-border bg-background p-3 md:p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
                  Slide {String(index + 1).padStart(2, "0")}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveSlide(slide.id, -1)}
                    disabled={index === 0}
                    aria-label={`Geser slide ${index + 1} ke atas`}
                    className="inline-flex h-10 w-10 items-center justify-center border border-border font-mono text-xs text-foreground/50 hover:border-accent hover:text-accent disabled:opacity-25"
                  >
                    &uarr;
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSlide(slide.id, 1)}
                    disabled={index === slides.length - 1}
                    aria-label={`Geser slide ${index + 1} ke bawah`}
                    className="inline-flex h-10 w-10 items-center justify-center border border-border font-mono text-xs text-foreground/50 hover:border-accent hover:text-accent disabled:opacity-25"
                  >
                    &darr;
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSlide(slide.id)}
                    className="inline-flex min-h-[40px] items-center border border-border px-3 font-mono text-[9px] uppercase tracking-[0.12em] text-foreground/50 hover:border-destructive hover:text-destructive"
                  >
                    Hapus
                  </button>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,320px)_1fr]">
                <div className="flex flex-col gap-2">
                  <div className="relative aspect-[16/9] overflow-hidden border border-border bg-foreground/5">
                    {slide.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={slide.imageUrl}
                        alt={`Preview slide ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/30">
                        Belum ada gambar
                      </span>
                    )}
                  </div>

                  <input
                    ref={(element) => {
                      fileInputs.current[slide.id] = element
                    }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) void uploadImage(slide.id, file)
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputs.current[slide.id]?.click()}
                    disabled={uploadingId === slide.id}
                    className="min-h-[42px] border border-border px-3 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/70 hover:border-accent hover:text-accent disabled:opacity-40"
                  >
                    {uploadingId === slide.id
                      ? "Mengompres & upload..."
                      : slide.imageUrl
                        ? "Ganti gambar"
                        : "Upload gambar"}
                  </button>
                  <input
                    value={slide.imageUrl}
                    onChange={(event) => patch(slide.id, { imageUrl: event.target.value })}
                    placeholder="atau tempel URL https://..."
                    className="min-h-[42px] w-full border border-border bg-background px-3 font-mono text-[10px] text-foreground placeholder:text-foreground/25 focus:border-accent focus:outline-none"
                  />
                </div>

                <div className="grid content-start gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/40">
                      Judul (maks 48)
                    </span>
                    <input
                      value={slide.title}
                      maxLength={48}
                      onChange={(event) => patch(slide.id, { title: event.target.value })}
                      placeholder="cth: GAS"
                      className="min-h-[42px] w-full border border-border bg-background px-3 font-mono text-xs text-foreground placeholder:text-foreground/25 focus:border-accent focus:outline-none"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/40">
                      Badge / subjudul (maks 60)
                    </span>
                    <input
                      value={slide.subtitle}
                      maxLength={60}
                      onChange={(event) => patch(slide.id, { subtitle: event.target.value })}
                      placeholder={DEFAULT_EVENT_SUBTITLE}
                      className="min-h-[42px] w-full border border-border bg-background px-3 font-mono text-xs text-foreground placeholder:text-foreground/25 focus:border-accent focus:outline-none"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/40">
                      Link tombol (opsional)
                    </span>
                    <input
                      value={slide.href ?? ""}
                      onChange={(event) => patch(slide.id, { href: event.target.value })}
                      placeholder="/top-up/mobile-legends atau https://..."
                      className="min-h-[42px] w-full border border-border bg-background px-3 font-mono text-xs text-foreground placeholder:text-foreground/25 focus:border-accent focus:outline-none"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => patch(slide.id, { active: !slide.active })}
                    aria-pressed={slide.active}
                    className={`mt-1 inline-flex min-h-[40px] w-fit items-center gap-2 border px-3 font-mono text-[9px] uppercase tracking-[0.15em] ${
                      slide.active
                        ? "border-accent text-accent"
                        : "border-border text-foreground/40 hover:text-foreground"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${slide.active ? "bg-accent" : "bg-foreground/30"}`} />
                    {slide.active ? "Aktif tampil" : "Nonaktif"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {message && <span className="font-mono text-[10px] text-accent">{message}</span>}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className={`min-h-[44px] w-full px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] sm:w-auto ${
              saving
                ? "bg-foreground/10 text-foreground/30 cursor-not-allowed"
                : "bg-accent text-accent-foreground hover-glitch"
            }`}
          >
            {saving ? "Menyimpan..." : "Simpan Carousel"}
          </button>
          <span className="font-mono text-[9px] text-foreground/35">
            Slide tanpa judul atau gambar otomatis dilewati.
          </span>
        </div>
      </div>
    </div>
  )
}
