import "server-only";

import { eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db/client";

type Context = { params: Promise<{ id: string }> };

/**
 * Public-ish: anyone with the switch ID can ask whether it has triggered.
 * The CID is only revealed once status === "triggered". Until then, no one —
 * even colluding trustees — can fetch the ciphertext from this endpoint.
 */
export async function GET(_req: Request, ctx: Context) {
  const { id } = await ctx.params;
  const db = getDb();

  const rows = await db
    .select({
      id: schema.switches.id,
      status: schema.switches.status,
      thresholdK: schema.switches.thresholdK,
      shareCountN: schema.switches.shareCountN,
      cid: schema.switches.cid,
      lastCheckinAt: schema.switches.lastCheckinAt,
      inactivitySeconds: schema.switches.inactivitySeconds,
      triggeredAt: schema.switches.triggeredAt,
    })
    .from(schema.switches)
    .where(eq(schema.switches.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return Response.json({ error: "not found" }, { status: 404 });

  return Response.json({
    id: row.id,
    status: row.status,
    thresholdK: row.thresholdK,
    shareCountN: row.shareCountN,
    cid: row.status === "triggered" ? row.cid : null,
    triggeredAt: row.triggeredAt?.toISOString() ?? null,
    deadline:
      row.status === "active"
        ? new Date(
            row.lastCheckinAt.getTime() + row.inactivitySeconds * 1000,
          ).toISOString()
        : null,
  });
}
