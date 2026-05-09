import "server-only";

import type { NextRequest } from "next/server";
import { and, eq, sql } from "drizzle-orm";

import { assertSameOrigin } from "@/lib/auth/csrf";
import { getDb, schema } from "@/lib/db/client";
import { requireSessionUser } from "@/lib/auth/session";

type Context = { params: Promise<{ id: string }> };

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

  // Atomic: fold the ownership + status='active' predicate into the UPDATE
  // so we cannot race a concurrent trigger / revoke. Empty result means
  // the switch is missing, not owned by us, or no longer active — we
  // return 404 in all cases without distinguishing.
  const updated = await db
    .update(schema.switches)
    .set({ lastCheckinAt: sql`now()`, warningSent: false })
    .where(
      and(
        eq(schema.switches.id, id),
        eq(schema.switches.ownerId, user.id),
        eq(schema.switches.status, "active"),
      ),
    )
    .returning({
      lastCheckinAt: schema.switches.lastCheckinAt,
      inactivitySeconds: schema.switches.inactivitySeconds,
    });

  const row = updated[0];
  if (!row) return Response.json({ error: "not found" }, { status: 404 });

  const deadline = new Date(
    row.lastCheckinAt.getTime() + row.inactivitySeconds * 1000,
  );
  return Response.json({ ok: true, deadline: deadline.toISOString() });
}
