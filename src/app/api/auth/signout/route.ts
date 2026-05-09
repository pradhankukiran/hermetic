import "server-only";

import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/lib/auth/jwt";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return Response.json({ ok: true });
}
