import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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

    // Clear harus dicek dulu — tanpa ini, tombol clear butuh imageUrl valid
    // juga (bug UX) padahal clear tidak butuh URL sama sekali.
    if (body?.clear === true) {
      await clearHeroEvent();
      revalidatePath("/");
      return NextResponse.json({ ok: true, cleared: true });
    }

    const imageUrl = String(body?.imageUrl ?? "").trim();
    if (!/^https:\/\/\S+$/.test(imageUrl)) {
      return NextResponse.json(
        { error: "URL gambar wajib https://..." },
        { status: 400 }
      );
    }

    // href dirender sebagai <a href> di hero — tanpa validasi ini, admin
    // session yang dicuri (atau salah input) bisa nyelip "javascript:..."
    // = XSS tersimpan. Hanya boleh path internal atau https absolut.
    const href = String(body?.href ?? "").trim().slice(0, 200);
    if (href && !/^(\/|https:\/\/)/.test(href)) {
      return NextResponse.json(
        { error: "Link event harus path internal (/...) atau https://..." },
        { status: 400 }
      );
    }

    await saveHeroEvent({
      imageUrl,
      label: String(body?.label ?? "").slice(0, 120),
      note: String(body?.note ?? "").slice(0, 200),
      href,
    });
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan hero event" }, { status: 500 });
  }
}
