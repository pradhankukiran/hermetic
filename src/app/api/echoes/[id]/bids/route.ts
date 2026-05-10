import "server-only";

import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { assertSameOrigin } from "@/lib/auth/csrf";
import { getDb, schema } from "@/lib/db/client";

type Context = { params: Promise<{ id: string }> };

const UUID_RX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NAME_MIN = 1;
const NAME_MAX = 80;
const CID_MIN = 8;
const CID_MAX = 200;

type CreateBidBody = {
  cid?: unknown;
  bidderName?: unknown;
};

/**
 * POST /api/echoes/[id]/bids
 *
 * Register a bid CID against an auction. The CID points to a tlock-sealed
 * envelope on IPFS — the server never sees the bid content or key.
 *
 * The server enforces close-time: bids submitted after `closesAt` are
 * rejected with 410 Gone. (The drand round protects against early
 * decryption; this check protects against late submissions, which would
 * otherwise let a bidder peek at the round signature and craft a
 * "winning" bid after the fact.)
 */
export async function POST(req: NextRequest, ctx: Context) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  const { id } = await ctx.params;
  if (!UUID_RX.test(id)) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }

  let body: CreateBidBody = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const cid = typeof body.cid === "string" ? body.cid.trim() : "";
  const bidderName =
    typeof body.bidderName === "string" ? body.bidderName.trim() : "";

  if (cid.length < CID_MIN || cid.length > CID_MAX) {
    return Response.json({ error: "cid invalid" }, { status: 400 });
  }
  if (bidderName.length < NAME_MIN || bidderName.length > NAME_MAX) {
    return Response.json(
      { error: `bidderName must be ${NAME_MIN}–${NAME_MAX} chars` },
      { status: 400 },
    );
  }

  const db = getDb();

  const echoes = await db
    .select({
      id: schema.echoes.id,
      closesAt: schema.echoes.closesAt,
    })
    .from(schema.echoes)
    .where(eq(schema.echoes.id, id))
    .limit(1);

  const echo = echoes[0];
  if (!echo) return Response.json({ error: "not found" }, { status: 404 });

  if (echo.closesAt.getTime() <= Date.now()) {
    return Response.json(
      { error: "auction is closed" },
      { status: 410 },
    );
  }

  const inserted = await db
    .insert(schema.echoBids)
    .values({
      echoId: id,
      cid,
      bidderName,
    })
    .returning({
      id: schema.echoBids.id,
      cid: schema.echoBids.cid,
      bidderName: schema.echoBids.bidderName,
      submittedAt: schema.echoBids.createdAt,
    });

  const row = inserted[0];
  return Response.json({
    id: row.id,
    cid: row.cid,
    bidderName: row.bidderName,
    submittedAt: row.submittedAt.toISOString(),
  });
}
