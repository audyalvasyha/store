import { NextResponse } from "next/server"
import { verifyApigamesWebhook } from "@/lib/apigames"
import { getOrder, updateOrder } from "@/lib/orders"
import { sendOrderStatusNotifications } from "@/lib/notify"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  let payload: {
    ref_id?: string
    trx_id?: string
    status?: string
    message?: string
  }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 })
  }

  const refId = payload.ref_id
  if (!refId) return NextResponse.json({ error: "ref_id kosong" }, { status: 400 })

  if (!verifyApigamesWebhook(request.headers, refId)) {
    return NextResponse.json({ error: "Signature tidak valid" }, { status: 401 })
  }

  const order = await getOrder(refId)
  if (!order) return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 })

  const status = (payload.status ?? "").toLowerCase()
  const success = status === "sukses"
  const failed = status === "gagal" || status === "error"

  if (success || failed) {
    const status: "SELESAI" | "GAGAL" = success ? "SELESAI" : "GAGAL"
    // Idempoten: webhook bisa dikirim ulang oleh APIGames (retry) — kalau
    // status lokal udah final, jangan update/notif lagi (hemat kuota WA
    // & cegah duplikat pesan ke user).
    if (order.status === "SELESAI" || order.status === "GAGAL") {
      return NextResponse.json({ ok: true, ignored: true })
    }
    await updateOrder(order.code, {
      status,
      topupStatus: success ? "SUKSES" : "GAGAL",
      topupRef: payload.trx_id ?? order.topupRef,
      topupMessage: payload.message ?? order.topupMessage,
    })
    sendOrderStatusNotifications({ ...order, status })
  }

  return NextResponse.json({ ok: true })
}
