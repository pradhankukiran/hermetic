import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db/client";
import { requireSessionUser } from "@/lib/auth/session";

type Context = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Context) {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const db = getDb();

  const rows = await db
    .select({
      id: schema.switches.id,
      status: schema.switches.status,
      inactivitySeconds: schema.switches.inactivitySeconds,
    })
    .from(schema.switches)
    .where(
      and(eq(schema.switches.id, id), eq(schema.switches.ownerId, user.id)),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return Response.json({ error: "not found" }, { status: 404 });
  if (row.status !== "active") {
    return Response.json(
      { error: `switch is ${row.status}` },
      { status: 409 },
    );
  }

  const now = new Date();
  await db
    .update(schema.switches)
    .set({ lastCheckinAt: now, warningSent: false })
    .where(eq(schema.switches.id, id));

  const deadline = new Date(now.getTime() + row.inactivitySeconds * 1000);
  return Response.json({ ok: true, deadline: deadline.toISOString() });
}
