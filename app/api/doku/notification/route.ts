import { NextResponse } from "next/server"
import { verifyDokuNotification } from "@/lib/doku"
import { getOrder, updateOrder } from "@/lib/orders"
import { createApigamesTransaction, apigamesConfigured } from "@/lib/apigames"
import { getDenomination } from "@/lib/catalog"
import { getDynamicGame } from "@/lib/content"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const rawBody = await request.text()
  const targetPath = process.env.DOKU_NOTIFICATION_PATH ?? "/api/doku/notification"

  if (!verifyDokuNotification({ headers: request.headers, rawBody, targetPath })) {
    return NextResponse.json({ error: "Signature tidak valid" }, { status: 401 })
  }

  let payload: {
    order?: { invoice_number?: string; amount?: number }
    transaction?: { status?: string; date?: string }
  }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 })
  }

  const invoiceNumber = payload.order?.invoice_number
  if (!invoiceNumber) {
    return NextResponse.json({ error: "invoice_number kosong" }, { status: 400 })
  }

  const order = await getOrder(invoiceNumber)
  if (!order) {
    return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 })
  }

  const paid = payload.transaction?.status?.toUpperCase() === "SUCCESS"

  // Idempoten: kalau sudah diproses, jangan kirim top-up dua kali.
  if (!paid || order.status === "DIPROSES" || order.status === "SELESAI") {
    return NextResponse.json({ ok: true, ignored: true })
  }

  await updateOrder(order.code, {
    status: "DIPROSES",
    paidAt: payload.transaction?.date ?? new Date().toISOString(),
  })

  // Katalog dinamis dari DB (biar providerCode yang di-edit admin kebaca),
  // fallback otomatis ke katalog statis kalau game nggak ada di DB.
  const game = await getDynamicGame(order.gameSlug)
  const denom = game ? getDenomination(game, order.denomId) : undefined
  const productCode = denom?.providerCode

  if (!productCode || !apigamesConfigured()) {
    await updateOrder(order.code, {
      topupStatus: "MANUAL",
      topupMessage: productCode
        ? "APIGames belum dikonfigurasi — item dikirim manual"
        : "Kode produk APIGames belum diisi di katalog — item dikirim manual",
    })
    return NextResponse.json({ ok: true, fulfillment: "manual" })
  }

  const result = await createApigamesTransaction({
    refId: order.code,
    productCode,
    tujuan: order.userId,
    serverId: order.server,
  })

  if (!result.ok) {
    await updateOrder(order.code, { topupStatus: "GAGAL", topupMessage: result.error })
    return NextResponse.json({ ok: true, fulfillment: "failed" })
  }

  const done = result.status.toLowerCase() === "sukses"
  await updateOrder(order.code, {
    status: done ? "SELESAI" : "DIPROSES",
    topupStatus: done ? "SUKSES" : "DIKIRIM",
    topupRef: result.trxId,
    topupMessage: result.message,
  })

  return NextResponse.json({ ok: true, fulfillment: done ? "success" : "pending" })
}
