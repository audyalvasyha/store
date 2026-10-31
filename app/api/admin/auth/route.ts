import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  COOKIE_MAX_AGE,
  SESSION_COOKIE,
  countAdmins,
  createAdmin,
  login,
  logout,
  validateCredentials,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? "").trim();
    const password = String(body?.password ?? "");
    const action = body?.action === "register" ? "register" : "login";

    if (action === "register") {
      // Bootstrap: bikin akun admin pertama cuma boleh pas belum ada admin.
      if ((await countAdmins()) > 0) {
        return NextResponse.json(
          { error: "Admin sudah ada, buat akun dari dashboard." },
          { status: 403 }
        );
      }
    }

    const invalid = validateCredentials(email, password);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    if (action === "register") {
      await createAdmin(email, password);
    }

    const token = await login(email, password);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal login";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function DELETE() {
  const jar = await cookies();
  const token = jar.get("gas_admin")?.value;
  if (token) await logout(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
