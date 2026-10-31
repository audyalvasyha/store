import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminEmail, SESSION_COOKIE } from "@/lib/admin-auth";
import { getDynamicGames, upsertGame, deleteGame } from "@/lib/content";
import type { GameItem } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const SLUG_EXP = /^[a-z0-9-]{2,48}$/;

/** Validasi & normalisasi payload game dari form admin (JSON). */
function sanitizeGame(input: unknown): GameItem | null {
  if (typeof input !== "object" || input === null) return null;
  const raw = input as Record<string, unknown>;

  const slug = String(raw.slug ?? "").toLowerCase().trim();
  if (!SLUG_EXP.test(slug)) return null;

  const str = (v: unknown, fallback = "") => String(v ?? fallback).trim();
  const game: GameItem = {
    slug,
    short: str(raw.short, slug.toUpperCase()).slice(0, 16),
    name: str(raw.name),
    publisher: str(raw.publisher, "-"),
    category: str(raw.category, "-"),
    currency: str(raw.currency, "-"),
    glyph: str(raw.glyph, "?").slice(0, 4),
    hue: str(raw.hue, "0 100% 45%"),
    needsServer: Boolean(raw.needsServer),
    featured: Boolean(raw.featured),
    denominations: sanitizeDenominations(raw.denominations),
  };

  if (!game.name) return null;
  if (game.denominations.length === 0) return null;

  const image = str(raw.image);
  if (image.startsWith("https://")) game.image = image;

  const stoneSlug = str(raw.stoneSlug);
  if (SLUG_EXP.test(stoneSlug)) game.stoneSlug = stoneSlug;

  return game;
}

function sanitizeDenominations(input: unknown): GameItem["denominations"] {
  if (!Array.isArray(input)) return [];
  const denoms: GameItem["denominations"] = [];
  for (const item of input) {
    if (typeof item !== "object" || item === null) continue;
    const raw = item as Record<string, unknown>;
    const id = String(raw.id ?? "").trim();
    const label = String(raw.label ?? "").trim();
    const price = Math.round(Number(raw.price));
    if (!id || !label || !Number.isFinite(price) || price <= 0) continue;
    const denom: GameItem["denominations"][number] = { id, label, price };
    const detail = String(raw.detail ?? "").trim();
    if (detail) denom.detail = detail;
    denoms.push(denom);
  }
  return denoms;
}

export async function GET() {
  // Katalog admin = data internal: wajib login admin, jangan bocor ke publik.
  const jar = await cookies();
  const email = await getAdminEmail(jar.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ games: await getDynamicGames() });
}

export async function POST(request: Request) {
  const jar = await cookies();
  const email = await getAdminEmail(jar.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const game = sanitizeGame(body?.game);
    if (!game) {
      return NextResponse.json(
        {
          error:
            "Data game nggak valid: butuh slug (a-z/0-9/-), name, dan minimal 1 denominasi (id, label, price > 0).",
        },
        { status: 400 }
      );
    }
    await upsertGame(game);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan game" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const jar = await cookies();
  const email = await getAdminEmail(jar.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  if (!SLUG_EXP.test(slug)) {
    return NextResponse.json({ error: "Slug tidak valid" }, { status: 400 });
  }
  await deleteGame(slug);
  return NextResponse.json({ ok: true });
}
