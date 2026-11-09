import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getAdminEmail, SESSION_COOKIE } from "@/lib/admin-auth";
import {
  clearTopUpJuga,
  getTopUpJugaConfig,
  getDynamicGames,
  saveTopUpJuga,
} from "@/lib/content";

export const dynamic = "force-dynamic";

/** Maks game per blok — jangan biarkan konten internal membludak. */
const MAX_LIST = 20 as const;

/**
 * Rapikan daftar slug: buang yang bukan game katalog, duplikat, dan batasi
 * jumlahnya. Tanpa sanitasi ini, slug asal (atau string panjang dari input
 * error) bisa nyeluput ke dokumen config dan dikonsumsi halaman publik.
 */
function cleanList(raw: unknown, validSlugs: ReadonlySet<string>): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    const slug = String(item ?? "").trim().toLowerCase();
    if (slug && validSlugs.has(slug) && !out.includes(slug)) out.push(slug);
    if (out.length >= MAX_LIST) break;
  }
  return out;
}

export async function GET() {
  // Konfigurasi admin: wajib login — jangan bocor ke publik.
  const jar = await cookies();
  const email = await getAdminEmail(jar.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ config: await getTopUpJugaConfig() });
}

export async function POST(request: Request) {
  const jar = await cookies();
  const email = await getAdminEmail(jar.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();

    // Reset: balik ke urutan otomatis (kategori + featured).
    if (body?.clear === true) {
      await clearTopUpJuga();
      // Semua halaman game menampilkan blok ini.
      revalidatePath("/top-up/[slug]", "page");
      return NextResponse.json({ ok: true, cleared: true });
    }

    const validSlugs = new Set((await getDynamicGames()).map((g) => g.slug));
    const global = cleanList(body?.global, validSlugs);

    const perGameRaw = body?.perGame;
    const perGame: Record<string, string[]> = {};
    if (perGameRaw && typeof perGameRaw === "object" && !Array.isArray(perGameRaw)) {
      for (const [slug, list] of Object.entries(perGameRaw as Record<string, unknown>)) {
        const cleaned = cleanList(list, validSlugs);
        // List kosong = "inherit global" — lebih baik skip daripada nyimpen kosong.
        if (cleaned.length > 0 && validSlugs.has(slug)) perGame[slug] = cleaned;
      }
    }

    await saveTopUpJuga({ global, perGame });
    revalidatePath("/top-up/[slug]", "page");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan konfigurasi Top Up Juga" }, { status: 500 });
  }
}
