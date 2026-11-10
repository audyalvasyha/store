import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { getAdminEmail, SESSION_COOKIE } from "@/lib/admin-auth"
import { getEventSlides, saveEventSlides } from "@/lib/event-carousel-db"

export const dynamic = "force-dynamic"

async function isAdmin(): Promise<boolean> {
  const jar = await cookies()
  const email = await getAdminEmail(jar.get(SESSION_COOKIE)?.value)
  return Boolean(email)
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({ slides: await getEventSlides(false) })
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const slides = await saveEventSlides(body?.slides)
    // Landing memakai ISR 30 detik — paksa segment "/" ikut segar sekarang.
    revalidatePath("/")
    return NextResponse.json({ ok: true, slides })
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan carousel event" }, { status: 500 })
  }
}
