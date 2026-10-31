import { NextResponse } from "next/server"
import { getDenomination, PAYMENT_METHODS, STONE_METHOD_IDS } from "@/lib/catalog"
import { getDynamicGame } from "@/lib/content"
import { generateOrderCode, getOrder, saveOrder, updateOrder, type Order } from "@/lib/orders"
import { createDokuCheckout, dokuConfigured } from "@/lib/doku"
import { getStoneGame, activeStoneVariants, createStoneOrder, getStoneOrder, gamestoneConfigured, type StoneOrder, type StonePaymentMethod } from "@/lib/gamestone"

export const dynamic = "force-dynamic"

/**
 * Sync status order lokal dari status order Gamestone (tanpa webhook,
 * jadi di-poll tiap kali client nge-cek status).
 */
async function syncStoneStatus(order: Order): Promise<void> {
  if (!order.stoneOrderId || order.stoneSynced) return
  const so = await getStoneOrder(order.stoneOrderId)
  if (!so) return

  let patch: Partial<Order> | null = null
  if (so.is_paid && so.status === "delivered") {
    patch = { status: "SELESAI", topupStatus: "SUKSES", paidAt: so.created_at ?? order.createdAt, stoneSynced: true }
  } else if (so.is_paid) {
    patch = { status: "DIPROSES", topupStatus: so.status === "processing" ? "DIKIRIM" : "MANUAL", paidAt: so.created_at ?? order.createdAt, stoneSynced: so.status === "processing" ? true : undefined }
  } else if (so.status === "cancelled" || so.status === "expired" || so.status === "refunded") {
    patch = { status: "GAGAL", topupStatus: "GAGAL", topupMessage: `Order Gamestone ${so.status}`, stoneSynced: true }
  }

  if (patch) {
    patch.stoneSnapshot = { price: so.price, fee: so.fee, paymentFee: so.payment_fee, total: so.total_price }
    await updateOrder(order.code, patch)
  }
}

function appBaseUrl(request: Request): string {
  const configured = process.env.APP_BASE_URL
  if (configured) return configured.replace(/\/$/, "")
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { gameSlug, denomId, quantity, userId, server, phone, email, method } = body ?? {}

    const game = await getDynamicGame(String(gameSlug ?? ""))
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

    const phoneRaw = String(phone ?? "").replace(/[ -]/g, "")
    const phoneValid = /^(62|0)\d{8,13}$/.test(phoneRaw)
    if (!phoneValid) {
      return NextResponse.json({ error: "Nomor WhatsApp tidak valid" }, { status: 400 })
    }

    const stoneMode = Boolean(game.stoneSlug && gamestoneConfigured())
    const methodValid = stoneMode
      ? STONE_METHOD_IDS.includes(String(method))
      : PAYMENT_METHODS.some((m) => m.id === method)
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
      phone: phoneRaw,
      email: String(email).trim(),
      topupStatus: "BELUM",
    }

    // Flow Gamestone: nominal harus variant aktif di Gamestone, lalu order
    // dibikin langsung di Gamestone (payment bawaan).
    if (stoneMode) {
      let variantId: number | null = null
      try {
        const stoneGame = await getStoneGame(game.stoneSlug as string)
        const variant = stoneGame
          ? activeStoneVariants(stoneGame).find((v) => String(v.id) === denom.id)
          : null
        if (variant) variantId = variant.id
      } catch {
        return NextResponse.json({ error: "Provider top-up sedang bermasalah, coba lagi." }, { status: 502 })
      }

      if (!variantId) {
        return NextResponse.json({ error: "Nominal tidak tersedia di provider saat ini" }, { status: 400 })
      }

      let stoneOrder: StoneOrder
      try {
        stoneOrder = await createStoneOrder({
          variant_id: variantId,
          payment_method_code: String(method) as unknown as StonePaymentMethod,
          phone_number: phoneRaw,
          data: {
            user_id: uid,
            zone_id: game.needsServer ? serverId : undefined,
          },
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Gagal membuat order di Gamestone"
        return NextResponse.json({ error: `${msg}. Coba lagi / ganti metode bayar.` }, { status: 502 })
      }

      const orderWithStone: Order = {
        ...order,
        quantity: 1,
        amount: stoneOrder.total_price ?? order.amount,
        stoneOrderId: stoneOrder.id,
        stoneTotal: stoneOrder.total_price,
      }
      await saveOrder(orderWithStone)
      return NextResponse.json({ order: await getOrder(order.code) }, { status: 201 })
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

  await syncStoneStatus(order)
  const fresh = await getOrder(code)
  return NextResponse.json({ order: fresh ?? order })
}
