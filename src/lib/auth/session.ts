import "server-only";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db/client";

import { SESSION_COOKIE_NAME, verifySession } from "./jwt";

export type SessionUser = {
  id: string;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = await verifySession(token);
    const db = getDb();
    const rows = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.id, payload.sub))
      .limit(1);
    const user = rows[0];
    if (!user) return null;
    return { id: user.id };
  } catch {
    return null;
  }
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("unauthorized");
  return user;
}
