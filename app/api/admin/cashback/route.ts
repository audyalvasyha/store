import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { getAdminEmail, SESSION_COOKIE } from "@/lib/admin-auth"
import { setCashbackPaid } from "@/lib/orders"

export const dynamic = "force-dynamic"

async function requireAdmin(): Promise<string | null> {
  const jar = await cookies()
  return getAdminEmail(jar.get(SESSION_COOKIE)?.value)
}

/**
 * Tandai cashback kupon sudah ditransfer (atau batalkan kalau salah klik).
 * Eligibility dicek ulang di query: cuma order Gamestone yang SELESAI dan
 * punya kupon yang boleh diubah.
 */
export async function POST(request: Request) {
  const email = await requireAdmin()
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = (await request.json()) as Record<string, unknown> | null
    const code = String(body?.code ?? "").trim().toUpperCase()
    if (!/^GAS-[A-Z0-9]{6}$/.test(code)) {
      return NextResponse.json({ error: "Kode order tidak valid" }, { status: 400 })
    }
    if (typeof body?.paid !== "boolean") {
      return NextResponse.json({ error: "Status cashback tidak valid" }, { status: 400 })
    }

    const ref = typeof body.ref === "string" ? body.ref.slice(0, 160) : undefined
    const order = await setCashbackPaid({ code, paid: body.paid, by: email, ref })
    if (!order) {
      return NextResponse.json(
        {
          error:
            "Order bukan kandidat cashback. Harus order Gamestone, status SELESAI, dan memakai kupon.",
        },
        { status: 404 }
      )
    }

    return NextResponse.json({ ok: true, order })
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan status cashback" }, { status: 500 })
  }
}
