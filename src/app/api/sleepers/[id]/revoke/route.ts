import "server-only";

import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireSessionUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db/client";

type Context = { params: Promise<{ id: string }> };

/**
 * Owner-only: flip a sleeper to "revoked". This stops the public status
 * endpoint from returning the CID, so previously published `/sleeper/[id]#K`
 * URLs no longer resolve — for new viewers.
 *
 * Caveat: anyone who already knows the CID can still pull the ciphertext
 * directly from IPFS. The revoke is a server-side gate, not a cryptographic
 * one. We surface this in the UI explanatory copy.
 */
export async function POST(req: NextRequest, ctx: Context) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const db = getDb();

  // Atomic ownership check: only the owner can revoke. We allow revoke
  // from any status (asleep | released | revoked) — revoking a sleeping
  // seal hides it sooner; revoking a released one re-seals it.
  const updated = await db
    .update(schema.sleepers)
    .set({ status: "revoked", releasedAt: null })
    .where(
      and(eq(schema.sleepers.id, id), eq(schema.sleepers.ownerId, user.id)),
    )
    .returning({ status: schema.sleepers.status });

  const row = updated[0];
  if (!row) return Response.json({ error: "not found" }, { status: 404 });

  return Response.json({ ok: true, status: row.status });
}
