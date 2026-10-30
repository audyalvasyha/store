import { NextResponse } from "next/server"
import { getGame, getDenomination, PAYMENT_METHODS } from "@/lib/catalog"
import { generateOrderCode, getOrder, saveOrder, updateOrder, type Order } from "@/lib/orders"
import { createDokuCheckout, dokuConfigured } from "@/lib/doku"

export const dynamic = "force-dynamic"

function appBaseUrl(request: Request): string {
  const configured = process.env.APP_BASE_URL
  if (configured) return configured.replace(/\/$/, "")
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { gameSlug, denomId, quantity, userId, server, email, method } = body ?? {}

    const game = getGame(String(gameSlug ?? ""))
    if (!game) {
      return NextResponse.json({ error: "Game tidak ditemukan" }, { status: 400 })
    }

    const denom = getDenomination(game, String(denomId ?? ""))
    if (!denom) {
      return NextResponse.json({ error: "Nominal tidak valid" }, { status: 400 })
    }

    const qtyRaw = Number(quantity)
    if (!Number.isInteger(qtyRaw) || qtyRaw < 1 || qtyRaw > 5) {
      return NextResponse.json({ error: "Jumlah tidak valid (1-5)" }, { status: 400 })
    }

    const uid = String(userId ?? "").trim()
    if (!/^[A-Za-z0-9._:\-]{4,24}$/.test(uid)) {
      return NextResponse.json({ error: "User ID tidak valid" }, { status: 400 })
    }

    const serverId = String(server ?? "").trim()
    if (game.needsServer && !/^[A-Za-z0-9]{1,16}$/.test(serverId)) {
      return NextResponse.json({ error: "Server tidak valid" }, { status: 400 })
    }

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email ?? ""))
    if (!emailValid) {
      return NextResponse.json({ error: "Email tidak valid" }, { status: 400 })
    }

    const methodValid = PAYMENT_METHODS.some((m) => m.id === method)
    if (!methodValid) {
      return NextResponse.json({ error: "Metode pembayaran tidak valid" }, { status: 400 })
    }

    const order: Order = {
      code: generateOrderCode(),
      status: "MENUNGGU_PEMBAYARAN",
      createdAt: new Date().toISOString(),
      gameSlug: game.slug,
      gameName: game.name,
      currency: game.currency,
      denomId: denom.id,
      denomLabel: denom.label,
      quantity: qtyRaw,
      amount: denom.price * qtyRaw,
      method: String(method),
      userId: uid,
      server: game.needsServer ? serverId : undefined,
      email: String(email).trim(),
      topupStatus: "BELUM",
    }

    await saveOrder(order)

    // Kalau kredensial DOKU tersedia, buat sesi pembayaran hosted checkout.
    if (dokuConfigured()) {
      const checkout = await createDokuCheckout({
        invoiceNumber: order.code,
        amount: order.amount,
        callbackUrl: `${appBaseUrl(request)}/orders/${order.code}`,
      })
      const updated = checkout.ok
        ? await updateOrder(order.code, { paymentUrl: checkout.paymentUrl })
        : await updateOrder(order.code, { paymentError: checkout.error })
      return NextResponse.json({ order: updated ?? order }, { status: 201 })
    }

    return NextResponse.json({ order }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Gagal membuat order" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = String(searchParams.get("code") ?? "")
  const order = await getOrder(code)
  if (!order) {
    return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 })
  }
  return NextResponse.json({ order })
}
