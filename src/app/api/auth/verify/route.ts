import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { and, eq, gt, isNull, sql } from "drizzle-orm";

import { sha256 } from "@/lib/crypto";
import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS, signSession } from "@/lib/auth/jwt";
import { getDb, schema } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    redirect("/auth/error?reason=missing-token");
  }

  const db = getDb();
  const tokenHash = sha256(token);

  // Atomic single-use guard: claim the row in one statement so two
  // concurrent verifications can't both succeed. If the row is missing,
  // expired, or already used, the UPDATE matches zero rows and we treat
  // it as invalid.
  const claimed = await db
    .update(schema.authTokens)
    .set({ usedAt: sql`now()` })
    .where(
      and(
        eq(schema.authTokens.tokenHash, tokenHash),
        gt(schema.authTokens.expiresAt, new Date()),
        isNull(schema.authTokens.usedAt),
      ),
    )
    .returning({
      id: schema.authTokens.id,
      userId: schema.authTokens.userId,
    });

  const row = claimed[0];
  if (!row) {
    redirect("/auth/error?reason=invalid-or-expired");
  }

  await db
    .update(schema.users)
    .set({ lastSeenAt: new Date() })
    .where(eq(schema.users.id, row.userId));

  const sessionToken = await signSession(row.userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  redirect("/dashboard");
}
