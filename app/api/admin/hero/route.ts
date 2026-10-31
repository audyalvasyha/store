import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminEmail, SESSION_COOKIE } from "@/lib/admin-auth";
import { clearHeroEvent, getHeroEvent, saveHeroEvent } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function GET() {
  // Data admin: wajib login — jangan bocor ke publik.
  const jar = await cookies();
  const email = await getAdminEmail(jar.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ hero: await getHeroEvent() });
}

export async function POST(request: Request) {
  void request;
  const jar = await cookies();
  const email = await getAdminEmail(jar.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const imageUrl = String(body?.imageUrl ?? "").trim();
    if (!/^https:\/\/\S+$/.test(imageUrl)) {
      return NextResponse.json(
        { error: "URL gambar wajib https://..." },
        { status: 400 }
      );
    }

    if (body?.clear === true) {
      await clearHeroEvent();
      return NextResponse.json({ ok: true, cleared: true });
    }

    await saveHeroEvent({
      imageUrl,
      label: String(body?.label ?? ""),
      note: String(body?.note ?? ""),
      href: String(body?.href ?? ""),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan hero event" }, { status: 500 });
  }
}
