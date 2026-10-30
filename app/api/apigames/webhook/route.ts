import { NextResponse } from "next/server"
import { verifyApigamesWebhook } from "@/lib/apigames"
import { getOrder, updateOrder } from "@/lib/orders"

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
    await updateOrder(order.code, {
      status: success ? "SELESAI" : "GAGAL",
      topupStatus: success ? "SUKSES" : "GAGAL",
      topupRef: payload.trx_id ?? order.topupRef,
      topupMessage: payload.message ?? order.topupMessage,
    })
  }

  return NextResponse.json({ ok: true })
}
