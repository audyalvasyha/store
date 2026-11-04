import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import {
  changePassword,
  getAdminEmail,
  SESSION_COOKIE,
  validateCredentials,
} from "@/lib/admin-auth"
import { clientIp, rateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

/**
 * POST /api/admin/password
 * Body: { currentPassword, newPassword }
 * Wajib login. Password lama diverifikasi; password baru harus lulus
 * aturan yang sama dengan register (minimal karakter). Rate limit ketat
 * per IP + per email biar gak bisa dipakai bruteforce password lama.
 */
export async function POST(request: Request) {
  const jar = await cookies()
  const email = await getAdminEmail(jar.get(SESSION_COOKIE)?.value)
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Brute-force password lama: 5 percobaan per menit cukup buat manusia.
  const ip = clientIp(request)
  if (!rateLimit("admin-pw", ip, 5, 60_000).ok) {
    return NextResponse.json({ error: "Terlalu sering. Coba lagi nanti." }, { status: 429 })
  }

  try {
    const body = await request.json()
    const currentPassword = String(body?.currentPassword ?? "")
    const newPassword = String(body?.newPassword ?? "")
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Password lama dan baru wajib diisi." },
        { status: 400 }
      )
    }
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "Password baru harus beda dari yang lama." },
        { status: 400 }
      )
    }
    // validateCredentials ngecek format email juga — email di sini udah
    // bersumber dari session, jadi error-nya pasti cuma karena password baru.
    const invalid = validateCredentials(email, newPassword)
    if (invalid && !invalid.startsWith("Email")) {
      return NextResponse.json({ error: invalid }, { status: 400 })
    }
    await changePassword(email, currentPassword, newPassword)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengganti password." },
      // 400 untuk "password lama salah", 500 untuk error lain (DB, dsb)
      { status: err instanceof Error && err.message === "Password lama salah" ? 400 : 500 }
    )
  }
}
