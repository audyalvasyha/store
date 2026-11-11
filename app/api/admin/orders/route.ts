import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { getAdminEmail, SESSION_COOKIE } from "@/lib/admin-auth"
import { listAdminOrders, type OrderStatus } from "@/lib/orders"

export const dynamic = "force-dynamic"

const STATUSES: OrderStatus[] = ["MENUNGGU_PEMBAYARAN", "DIPROSES", "SELESAI", "GAGAL"]

function isOrderStatus(value: string): value is OrderStatus {
  return (STATUSES as string[]).includes(value)
}

/**
 * Pencarian order untuk dashboard admin. Endpoint ini cuma baca data;
 * perubahan status tetap lewat flow pembayaran/provider.
 */
export async function GET(request: Request) {
  const jar = await cookies()
  const email = await getAdminEmail(jar.get(SESSION_COOKIE)?.value)
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query = String(searchParams.get("q") ?? "").trim().slice(0, 80)
  const rawStatus = String(searchParams.get("status") ?? "all")
  const status: OrderStatus | "all" | null =
    rawStatus === "all" ? "all" : isOrderStatus(rawStatus) ? rawStatus : null

  if (!status) {
    return NextResponse.json({ error: "Status order tidak valid" }, { status: 400 })
  }

  try {
    const orders = await listAdminOrders({ query, status })
    return NextResponse.json({ orders })
  } catch {
    return NextResponse.json(
      { error: "Order sedang nggak bisa dimuat. Coba lagi sebentar." },
      { status: 503 }
    )
  }
}
