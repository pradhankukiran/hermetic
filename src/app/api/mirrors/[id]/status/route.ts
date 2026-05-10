import "server-only";

import { eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db/client";

type Context = { params: Promise<{ id: string }> };

/**
 * GET /api/mirrors/[id]/status
 *
 * Public endpoint: anyone with the Mirror ID can fetch its status and CID.
 *
 * Mirror has no time-locked secret like Switch — both halves are issued
 * at creation time, and the seal is openable from the moment both holders
 * agree to combine their halves. So unlike Switch (which only reveals the
 * CID after `triggered`), Mirror reveals the CID whenever the seal is
 * `active`. The CID alone is useless without the two halves.
 *
 * Status flips to "revoked" only via explicit owner-broker action (not
 * implemented in this endpoint).
 */
export async function GET(_req: Request, ctx: Context) {
  const { id } = await ctx.params;
  const db = getDb();

  const rows = await db
    .select({
      id: schema.mirrors.id,
      status: schema.mirrors.status,
      cid: schema.mirrors.cid,
    })
    .from(schema.mirrors)
    .where(eq(schema.mirrors.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return Response.json({ error: "not found" }, { status: 404 });

  return Response.json({
    id: row.id,
    status: row.status,
    cid: row.status === "active" ? row.cid : null,
  });
}
