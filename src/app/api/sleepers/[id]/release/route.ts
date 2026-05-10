import "server-only";

import type { NextRequest } from "next/server";
import { and, eq, sql } from "drizzle-orm";

import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireSessionUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db/client";

type Context = { params: Promise<{ id: string }> };

/**
 * Owner-only: flip a sleeper from "asleep" or "revoked" to "released".
 *
 * The atomic UPDATE folds ownership + a status whitelist into the WHERE
 * clause so a concurrent revoke / non-owner / wrong-id all collapse to the
 * same 404. We deliberately allow re-release after revoke — the seal can
 * be re-opened.
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

  const updated = await db
    .update(schema.sleepers)
    .set({ status: "released", releasedAt: sql`now()` })
    .where(
      and(
        eq(schema.sleepers.id, id),
        eq(schema.sleepers.ownerId, user.id),
        // Idempotent: re-releasing an already-released seal is a no-op
        // status-wise but refreshes releasedAt. We accept asleep|revoked
        // → released; from "released" the row is unchanged.
        sql`${schema.sleepers.status} in ('asleep','revoked','released')`,
      ),
    )
    .returning({
      status: schema.sleepers.status,
      releasedAt: schema.sleepers.releasedAt,
    });

  const row = updated[0];
  if (!row) return Response.json({ error: "not found" }, { status: 404 });

  return Response.json({
    ok: true,
    status: row.status,
    releasedAt: row.releasedAt?.toISOString() ?? null,
  });
}
