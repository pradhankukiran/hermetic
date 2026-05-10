import "server-only";

import { eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db/client";

type Context = { params: Promise<{ id: string }> };

/**
 * Public: anyone with the pact ID can ask for its status. Pacts have no
 * timer — they are unlockable from creation — so we always reveal the CID
 * unless the pact has been revoked. Without all N shares the CID is
 * useless (the envelope is encrypted), and the CID is also derivable by
 * anyone who has even one share's pact URL, so there is no benefit to
 * concealing it.
 */
export async function GET(_req: Request, ctx: Context) {
  const { id } = await ctx.params;
  const db = getDb();

  const rows = await db
    .select({
      id: schema.pacts.id,
      status: schema.pacts.status,
      partyCountN: schema.pacts.partyCountN,
      cid: schema.pacts.cid,
    })
    .from(schema.pacts)
    .where(eq(schema.pacts.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return Response.json({ error: "not found" }, { status: 404 });

  return Response.json({
    id: row.id,
    status: row.status,
    partyCountN: row.partyCountN,
    cid: row.status === "revoked" ? null : row.cid,
  });
}
