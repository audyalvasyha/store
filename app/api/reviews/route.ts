import { NextResponse } from "next/server"
import { getOrder } from "@/lib/orders"
import { saveReview } from "@/lib/reviews"
import { clientIp, rateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

/**
 * Kirim ulasan. Aturan main:
 * - Hanya order berstatus SELESAI yang boleh diulas (bukan order ngasal).
 * - Satu order = satu ulasan (unique index di DB, jadi aman dari spam ganda).
 * - Rating 1–5, komentar opsional maks. 500 karakter.
 * - Nama penulis disamarkan dari userId — email/HP tidak pernah ditampilkan.
 */
export async function POST(request: Request) {
  const limiter = await rateLimit("reviews-post", clientIp(request), 10, 60_000)
  if (!limiter.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${limiter.retryAfter} detik.` },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } }
    )
  }

  try {
    const body = await request.json()
    const code = String(body?.code ?? "").trim().toUpperCase()
    if (!/^GAS-[A-Z0-9]{6}$/.test(code)) {
      return NextResponse.json({ error: "Kode order tidak valid" }, { status: 400 })
    }

    const rating = Number(body?.rating)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Pilih rating 1–5 bintang dulu" }, { status: 400 })
    }

    const comment = String(body?.comment ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500)

    const order = await getOrder(code)
    if (!order) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 })
    }
    // Order DIPROSES / GAGAL / belum bayar nggak boleh ngasih ulasan — biar
    // rating di situs cuma dari transaksi yang benar-benar selesai.
    if (order.status !== "SELESAI") {
      return NextResponse.json(
        { error: "Ulasan bisa dikirim setelah order kamu selesai (status SELESAI)." },
        { status: 403 }
      )
    }

    const authorName =
      order.userId.length > 4 ? `${order.userId.slice(0, 4)}***` : "Pembeli"

    const saved = await saveReview({
      orderCode: order.code,
      gameSlug: order.gameSlug,
      rating,
      comment: comment || undefined,
      authorName,
      createdAt: new Date().toISOString(),
    })
    if (!saved) {
      return NextResponse.json(
        { error: "Order ini sudah pernah diulas. Makasih ya!" },
        { status: 409 }
      )
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Sistem ulasan lagi sibuk, coba lagi sebentar." },
      { status: 503 }
    )
  }
}
