import "server-only";

import { asc, eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db/client";

type Context = { params: Promise<{ id: string }> };

const UUID_RX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/echoes/[id]
 *
 * Public: anyone with the auction id can fetch the header + the list of
 * registered bid CIDs. The CIDs alone don't let the caller decrypt — bids
 * are tlock-sealed to the close round. The bidder name is plaintext (it
 * was chosen by the bidder for display purposes).
 */
export async function GET(_req: Request, ctx: Context) {
  const { id } = await ctx.params;
  if (!UUID_RX.test(id)) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }

  const db = getDb();

  const echoes = await db
    .select({
      id: schema.echoes.id,
      title: schema.echoes.title,
      description: schema.echoes.description,
      closesAt: schema.echoes.closesAt,
      drandRound: schema.echoes.drandRound,
      drandChainHash: schema.echoes.drandChainHash,
      createdAt: schema.echoes.createdAt,
    })
    .from(schema.echoes)
    .where(eq(schema.echoes.id, id))
    .limit(1);

  const echo = echoes[0];
  if (!echo) return Response.json({ error: "not found" }, { status: 404 });

  const bids = await db
    .select({
      cid: schema.echoBids.cid,
      bidderName: schema.echoBids.bidderName,
      submittedAt: schema.echoBids.createdAt,
    })
    .from(schema.echoBids)
    .where(eq(schema.echoBids.echoId, id))
    .orderBy(asc(schema.echoBids.createdAt));

  return Response.json({
    id: echo.id,
    title: echo.title,
    description: echo.description,
    closesAt: echo.closesAt.toISOString(),
    drandRound: echo.drandRound,
    drandChainHash: echo.drandChainHash,
    createdAt: echo.createdAt.toISOString(),
    bids: bids.map((b) => ({
      cid: b.cid,
      bidderName: b.bidderName,
      submittedAt: b.submittedAt.toISOString(),
    })),
  });
}
