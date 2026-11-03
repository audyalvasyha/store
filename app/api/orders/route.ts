import { NextResponse } from "next/server"
import { getDenomination, PAYMENT_METHODS, STONE_METHOD_IDS } from "@/lib/catalog"
import { getDynamicGame } from "@/lib/content"
import { generateOrderCode, getOrder, saveOrder, updateOrder, type Order } from "@/lib/orders"
import { createDokuCheckout, dokuConfigured } from "@/lib/doku"
import { getStoneGame, activeStoneVariants, createStoneOrder, getStoneOrder, gamestoneConfigured, stoneFetchLastError, type StoneOrder, type StonePaymentMethod } from "@/lib/gamestone"
import { apigamesConfigured } from "@/lib/apigames"
import { clientIp, rateLimit } from "@/lib/rate-limit"
import { sendOrderStatusNotifications } from "@/lib/notify"

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
    patch.stonePaymentCode = so.payment_code ?? order.stonePaymentCode
    await updateOrder(order.code, patch)
    if (patch.status) {
      sendOrderStatusNotifications({ ...order, ...patch, status: patch.status })
    }
  }
}

function appBaseUrl(request: Request): string {
  const configured = process.env.APP_BASE_URL
  if (configured) return configured.replace(/\/$/, "")
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}

export async function POST(request: Request) {
  // Bikin order = bikin session pembayaran di provider (courtesy limit ke
  // provider): tiap IP dibatas 15 order/menit.
  const fingerprint = clientIp(request)
  const postLimit = rateLimit("orders-post", fingerprint, 15, 60_000)
  if (!postLimit.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak order. Coba lagi dalam ${postLimit.retryAfter} detik.` },
      { status: 429, headers: { "Retry-After": String(postLimit.retryAfter) } }
    )
  }

  try {
    const body = await request.json()
    const { gameSlug, denomId, quantity, userId, server, phone, email, method } = body ?? {}

    const game = await getDynamicGame(String(gameSlug ?? ""))
    if (!game) {
      return NextResponse.json({ error: "Game tidak ditemukan" }, { status: 400 })
    }

    // Ambil variant Gamestone sekali di awal. Dipakai dua kali di bawah:
    // buat resolve denomId (client kirim variant id, bukan id katalog lokal)
    // dan buat bikin order di provider.
    const stoneMode = Boolean(game.stoneSlug && gamestoneConfigured())
    const stoneGame = stoneMode && game.stoneSlug ? await getStoneGame(game.stoneSlug) : null
    const stoneVariants = stoneGame ? activeStoneVariants(stoneGame) : []
    let stoneVariant =
      stoneVariants.find((v) => String(v.id) === String(denomId ?? "")) ?? null

    // Di mode Gamestone, form menampilkan variant provider sehingga denomId-nya
    // numeric id variant. Katalog lokal (id "ml-86" dsb.) tetap dipakai untuk
    // game non-Gamestone / waktu provider nggak bisa diakses pas render.
    const localDenom = getDenomination(game, String(denomId ?? ""))

    // Fallback resolver: kalau variant id yang dipilih user sudah nggak ada di
    // provider (render memakai cache 60s lalu list berubah), cari variant
    // berdasarkan harga terdekat (toleransi 30%), lalu variant aktif pertama.
    // Hanya untuk denomId numeric (id variant provider) supaya id katalog
    // lokal nggak ikut ke-sapu fallback ini.
    if (!stoneVariant && stoneMode && localDenom && /^\d+$/.test(String(denomId ?? "").trim())) {
      let bestDiff = Number.POSITIVE_INFINITY
      let best: (typeof stoneVariants)[0] | undefined = undefined
      for (const v of stoneVariants) {
        const diff = Math.abs(v.price - localDenom.price)
        if (diff <= localDenom.price * 0.3 && diff < bestDiff) {
          best = v
          bestDiff = diff
        }
      }
      stoneVariant = best ?? stoneVariants[0] ?? null
    }
    const denom = stoneVariant
      ? { id: String(stoneVariant.id), label: stoneVariant.name, price: stoneVariant.price }
      : localDenom
    if (!denom) {
      return NextResponse.json(
        {
          error: stoneMode
            ? "Nominal nggak ketemu di provider. Refresh halaman lalu coba lagi."
            : "Nominal tidak valid",
        },
        { status: 400 }
      )
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

    // Client pakai metode Gamestone waktu variant provider tampil, tapi pakai
    // metode lokal (qris/ewallet/bank) kalau variant nggak bisa diambil. Dua-duanya
    // valid di mode Gamestone; yang pakai metode lokal jatuh ke fallback DOKU.
    const methodValid = stoneMode
      ? STONE_METHOD_IDS.includes(String(method)) ||
        PAYMENT_METHODS.some((m) => m.id === method)
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
    // dibikin langsung di Gamestone (payment bawaan). Kalau Gamestone gagal
    // (down / Internal server error), otomatis fallback ke APIGames:
    // bayar via DOKU hosted checkout, item dikirim oleh APIGames.
    if (stoneMode) {
      // Detail kenapa GET provider gagal disimpan oleh stoneFetch —
      // diompo ke pesan error biar user/admin tahu sebabnya pas lihat 502.
      const fetchProblem = stoneGame ? null : stoneFetchLastError()
      let stoneError: string | null = stoneVariant
        ? null
        : stoneGame
          ? "Nominal nggak tersedia di provider Gamestone"
          : fetchProblem
            ? `Provider Gamestone tidak bisa diakses (${fetchProblem})`
            : "Provider Gamestone tidak bisa diakses"
      const stoneMethod = STONE_METHOD_IDS.includes(String(method))
        ? (String(method) as StonePaymentMethod)
        : null
      if (!stoneMethod) {
        stoneError = `Metode ${method} nggak didukung provider Gamestone`
      }

      let stoneOrder: StoneOrder | null = null
      if (stoneVariant && stoneMethod) {
        try {
          stoneOrder = await createStoneOrder({
            variant_id: stoneVariant.id,
            payment_method_code: stoneMethod,
            phone_number: phoneRaw,
            data: {
              user_id: uid,
              zone_id: game.needsServer ? serverId : undefined,
            },
          })
        } catch (err) {
          stoneOrder = null
          stoneError = err instanceof Error ? err.message : "Gagal membuat order di Gamestone"
        }
      }

      // ── Sukses: order Gamestone terbentuk → simpan & balikin ke user.
      if (stoneOrder) {
        const orderWithStone: Order = {
          ...order,
          quantity: 1,
          amount: stoneOrder.total_price ?? order.amount,
          provider: "gamestone",
          stoneOrderId: stoneOrder.id,
          stoneTotal: stoneOrder.total_price,
          stonePaymentCode: stoneOrder.payment_code ?? undefined,
          stoneExpiredAt: stoneOrder.expired_at ?? undefined,
        }
        await saveOrder(orderWithStone)
        // Notif awal ke user (email + WA): order dibuat, menunggu pembayaran.
        sendOrderStatusNotifications({
          ...(await getOrder(order.code)) ?? orderWithStone,
          status: "MENUNGGU_PEMBAYARAN",
        })
        return NextResponse.json({ order: await getOrder(order.code) }, { status: 201 })
      }

      // ── Fallback ke APIGames (via DOKU): Gamestone gagal/down →
      // order disimpan dengan harga lokal, user bayar via DOKU hosted checkout,
      // item dikirim APIGames pas webhook DOKU masuk (lihat /api/doku/notification).
      if (apigamesConfigured() && dokuConfigured()) {
        await saveOrder(order)
        const fallbackError = stoneError ?? "Provider Gamestone gagal"
        let updated = await updateOrder(order.code, {
          provider: "apigames",
          fallbackReason: `Gamestone gagal (${fallbackError}) — dilanjutkan via APIGames + DOKU`,
        })
        const checkout = await createDokuCheckout({
          invoiceNumber: order.code,
          amount: order.amount,
          callbackUrl: `${appBaseUrl(request)}/orders/${order.code}`,
        })
        updated = checkout.ok
          ? await updateOrder(order.code, { paymentUrl: checkout.paymentUrl })
          : await updateOrder(order.code, { paymentError: checkout.error })
        sendOrderStatusNotifications({ ...updated ?? order, status: "MENUNGGU_PEMBAYARAN" })
        return NextResponse.json({ order: updated ?? order }, { status: 201 })
      }

      // Gamestone gagal & fallback nggak bisa: kasih error yang jelas ke user.
      return NextResponse.json(
        { error: `${stoneError ?? "Gamestone bermasalah"}. Coba lagi / ganti metode bayar.` },
        { status: 502 }
      )
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
      sendOrderStatusNotifications({ ...(updated ?? order), status: "MENUNGGU_PEMBAYARAN" })
      return NextResponse.json({ order: updated ?? order }, { status: 201 })
    }

    sendOrderStatusNotifications({ ...order, status: "MENUNGGU_PEMBAYARAN" })
    return NextResponse.json({ order }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Gagal membuat order" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  // Info order isinya PII (email/no. WA) — code cuma 32^6, jadi nge-GET
  // dibatis biar bruteforce enumerasi code jadi nggak praktis.
  const readLimit = rateLimit("orders-get", clientIp(request), 30, 60_000)
  if (!readLimit.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi sebentar." },
      { status: 429, headers: { "Retry-After": String(readLimit.retryAfter) } }
    )
  }

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
