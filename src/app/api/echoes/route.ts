import "server-only";

import type { NextRequest } from "next/server";

import { assertSameOrigin } from "@/lib/auth/csrf";
import { DRAND_CHAIN_HASH, roundForDate } from "@/lib/crypto/timelock";
import { getDb, schema } from "@/lib/db/client";

const TITLE_MIN = 1;
const TITLE_MAX = 200;
const DESC_MIN = 1;
const DESC_MAX = 4000;
const MIN_LEAD_MS = 60_000; // close must be at least 60s in the future
const MAX_LEAD_MS = 1000 * 60 * 60 * 24 * 365 * 5; // 5 years

type CreateEchoBody = {
  title?: unknown;
  description?: unknown;
  closesAt?: unknown;
};

/**
 * POST /api/echoes
 *
 * Create a new sealed-bid auction. No auth required — auctions are
 * public; anyone with the URL can view, bid, or reveal after close.
 *
 * The drand round is derived server-side from `closesAt` so the client
 * cannot lie about which round the auction is sealed against.
 */
export async function POST(req: NextRequest) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  let body: CreateEchoBody = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const closesAtRaw =
    typeof body.closesAt === "string" ? body.closesAt : null;

  if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    return Response.json(
      { error: `title must be ${TITLE_MIN}–${TITLE_MAX} chars` },
      { status: 400 },
    );
  }
  if (description.length < DESC_MIN || description.length > DESC_MAX) {
    return Response.json(
      { error: `description must be ${DESC_MIN}–${DESC_MAX} chars` },
      { status: 400 },
    );
  }
  if (!closesAtRaw) {
    return Response.json({ error: "closesAt required" }, { status: 400 });
  }
  const closesAt = new Date(closesAtRaw);
  if (Number.isNaN(closesAt.getTime())) {
    return Response.json({ error: "closesAt invalid" }, { status: 400 });
  }
  const lead = closesAt.getTime() - Date.now();
  if (lead < MIN_LEAD_MS) {
    return Response.json(
      { error: "closesAt must be at least 60 seconds in the future" },
      { status: 400 },
    );
  }
  if (lead > MAX_LEAD_MS) {
    return Response.json(
      { error: "closesAt is too far in the future" },
      { status: 400 },
    );
  }

  const drandRound = roundForDate(closesAt);

  const db = getDb();
  const inserted = await db
    .insert(schema.echoes)
    .values({
      title,
      description,
      drandRound,
      drandChainHash: DRAND_CHAIN_HASH,
      closesAt,
    })
    .returning({
      id: schema.echoes.id,
      closesAt: schema.echoes.closesAt,
      drandRound: schema.echoes.drandRound,
      drandChainHash: schema.echoes.drandChainHash,
    });

  const row = inserted[0];
  return Response.json({
    id: row.id,
    closesAt: row.closesAt.toISOString(),
    drandRound: row.drandRound,
    drandChainHash: row.drandChainHash,
  });
}
