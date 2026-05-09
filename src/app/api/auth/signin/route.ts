import "server-only";

import type { NextRequest } from "next/server";

import { assertSameOrigin } from "@/lib/auth/csrf";
import { hashEmail, randomBase64Url, sha256 } from "@/lib/crypto";
import { getDb, schema } from "@/lib/db/client";
import { appUrl, sendMagicLink } from "@/lib/email/resend";
import { eq } from "drizzle-orm";

const TOKEN_TTL_MS = 15 * 60 * 1000;
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  let body: { email?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!EMAIL_RX.test(email)) {
    return Response.json({ error: "invalid email" }, { status: 400 });
  }

  const db = getDb();
  const emailHashBytes = hashEmail(email);

  // Find or create user.
  const userRow = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.emailHash, emailHashBytes))
    .limit(1);

  let userId: string;
  if (userRow.length === 0) {
    const inserted = await db
      .insert(schema.users)
      .values({ emailHash: emailHashBytes })
      .returning({ id: schema.users.id });
    userId = inserted[0].id;
  } else {
    userId = userRow[0].id;
  }

  // Generate magic-link token. We deliberately send the email *before*
  // persisting the auth_token row: if Resend rejects the address, no
  // row leaks into the database.
  const token = await randomBase64Url(32);
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  const url = `${appUrl()}/auth/verify?token=${encodeURIComponent(token)}`;

  try {
    await sendMagicLink(email, url);
  } catch (err) {
    console.error("[auth/signin] email send failed", err);
    // Same generic ok response — never tell the caller whether a user
    // exists or whether sending failed.
    return Response.json({ ok: true });
  }

  await db.insert(schema.authTokens).values({
    tokenHash,
    userId,
    kind: "magic_link",
    expiresAt,
  });

  // Don't tell the caller whether the email existed before — same response either way.
  return Response.json({ ok: true });
}
