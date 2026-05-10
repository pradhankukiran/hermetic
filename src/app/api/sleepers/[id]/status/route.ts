import "server-only";

import { eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db/client";

type Context = { params: Promise<{ id: string }> };

/**
 * Public: anyone can poll a sleeper's status. The CID is only revealed when
 * status === "released". For "asleep" or "revoked", we return null for the
 * CID so the seal stays sealed — even if the URL fragment K is in hand.
 *
 * No auth, no CSRF: this is a read-only endpoint. The id is opaque (uuid)
 * so enumeration is not feasible.
 */
export async function GET(_req: Request, ctx: Context) {
  const { id } = await ctx.params;
  const db = getDb();

  const rows = await db
    .select({
      id: schema.sleepers.id,
      status: schema.sleepers.status,
      cid: schema.sleepers.cid,
      releasedAt: schema.sleepers.releasedAt,
      createdAt: schema.sleepers.createdAt,
    })
    .from(schema.sleepers)
    .where(eq(schema.sleepers.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return Response.json({ error: "not found" }, { status: 404 });

  return Response.json({
    id: row.id,
    status: row.status,
    cid: row.status === "released" ? row.cid : null,
    releasedAt: row.releasedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  });
}
