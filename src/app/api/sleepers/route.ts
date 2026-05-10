import "server-only";

import type { NextRequest } from "next/server";

import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireSessionUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db/client";

type CreateSleeperBody = {
  cid?: string;
};

/**
 * Register a new sleeper. The browser has already encrypted the envelope and
 * uploaded the ciphertext to IPFS — this route only persists the resulting
 * CID + ownerId so we can gate publication later. The decryption key never
 * touches the server.
 */
export async function POST(req: NextRequest) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: CreateSleeperBody = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const cid = typeof body.cid === "string" ? body.cid.trim() : "";
  if (!cid) {
    return Response.json({ error: "cid required" }, { status: 400 });
  }
  // CIDv0 ("Qm…") and CIDv1 ("baf…") are alphanumeric and bounded in length.
  // Refuse anything that doesn't look like an IPFS CID; we don't try to
  // validate the multihash structure here, just sanity-check the shape.
  if (cid.length < 32 || cid.length > 128 || !/^[a-zA-Z0-9]+$/.test(cid)) {
    return Response.json({ error: "invalid cid" }, { status: 400 });
  }

  const db = getDb();
  const inserted = await db
    .insert(schema.sleepers)
    .values({ ownerId: user.id, cid })
    .returning({ id: schema.sleepers.id });

  return Response.json({ id: inserted[0].id });
}
