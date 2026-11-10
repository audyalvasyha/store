import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getAdminEmail, SESSION_COOKIE } from "@/lib/admin-auth"
import { saveEventImage } from "@/lib/event-carousel-db"
import {
  MAX_EVENT_IMAGE_BYTES,
  detectEventImageType,
} from "@/lib/event-carousel"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const jar = await cookies()
  const email = await getAdminEmail(jar.get(SESSION_COOKIE)?.value)
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const form = await request.formData().catch(() => null)
    const file = form?.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File gambar nggak ditemukan" }, { status: 400 })
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "File gambar kosong" }, { status: 400 })
    }
    if (file.size > MAX_EVENT_IMAGE_BYTES) {
      return NextResponse.json(
        { error: `Gambar maksimal ${Math.round(MAX_EVENT_IMAGE_BYTES / 1_000_000)} MB setelah dikompres` },
        { status: 400 }
      )
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    // Validasi dari isi file, bukan cuma header Content-Type dari browser.
    const contentType = detectEventImageType(bytes)
    if (!contentType) {
      return NextResponse.json(
        { error: "Format harus JPG, PNG, WebP, atau AVIF" },
        { status: 400 }
      )
    }

    const url = await saveEventImage(Buffer.from(bytes), contentType)
    return NextResponse.json({ ok: true, url })
  } catch {
    return NextResponse.json({ error: "Gagal upload gambar" }, { status: 500 })
  }
}
