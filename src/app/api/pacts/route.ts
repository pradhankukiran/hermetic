import "server-only";

import type { NextRequest } from "next/server";

import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireSessionUser } from "@/lib/auth/session";
import { hashEmail } from "@/lib/crypto";
import { getDb, schema } from "@/lib/db/client";
import { sendPactShare } from "@/lib/email/pact";
import { appUrl } from "@/lib/email/resend";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PARTIES = 2;
const MAX_PARTIES = 10;

type CreatePactBody = {
  cid?: string;
  partyCountN?: number;
  parties?: { email?: string; shareBase64Url?: string }[];
};

export async function POST(req: NextRequest) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: CreatePactBody = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const cid = typeof body.cid === "string" ? body.cid.trim() : "";
  const partyCountN = Number(body.partyCountN);
  const parties = Array.isArray(body.parties) ? body.parties : [];

  if (!cid) return Response.json({ error: "cid required" }, { status: 400 });
  if (
    !Number.isInteger(partyCountN) ||
    partyCountN < MIN_PARTIES ||
    partyCountN > MAX_PARTIES
  ) {
    return Response.json(
      {
        error: `partyCountN must be between ${MIN_PARTIES} and ${MAX_PARTIES}`,
      },
      { status: 400 },
    );
  }
  if (parties.length !== partyCountN) {
    return Response.json(
      { error: `expected ${partyCountN} parties, got ${parties.length}` },
      { status: 400 },
    );
  }
  for (const p of parties) {
    if (typeof p.email !== "string" || !EMAIL_RX.test(p.email.trim())) {
      return Response.json(
        { error: "every party needs a valid email" },
        { status: 400 },
      );
    }
    if (typeof p.shareBase64Url !== "string" || p.shareBase64Url.length === 0) {
      return Response.json(
        { error: "every party needs a share" },
        { status: 400 },
      );
    }
  }

  // Server-side dedupe check (UI also enforces this, but we don't trust it).
  const lowered = parties.map((p) => p.email!.trim().toLowerCase());
  if (new Set(lowered).size !== lowered.length) {
    return Response.json(
      { error: "party emails must be unique" },
      { status: 400 },
    );
  }

  const db = getDb();

  const inserted = await db
    .insert(schema.pacts)
    .values({
      ownerId: user.id,
      cid,
      partyCountN,
    })
    .returning({ id: schema.pacts.id });
  const pactId = inserted[0].id;

  await db.insert(schema.pactMembers).values(
    parties.map((p, i) => ({
      pactId,
      email: p.email!.trim().toLowerCase(),
      emailHash: hashEmail(p.email!),
      shareIndex: i,
    })),
  );

  // Email each party their share + the unlock URL. Same trade-off as
  // Switch: the server briefly handles the share to deliver it; it is
  // not persisted.
  const pactUrl = `${appUrl()}/pact/${pactId}`;
  const ownerHint = "Your contact"; // intentionally non-PII
  const sendResults = await Promise.allSettled(
    parties.map((p, i) =>
      sendPactShare({
        to: p.email!,
        ownerHint,
        share: p.shareBase64Url!,
        pactUrl,
        partyIndex: i + 1,
        partyCount: partyCountN,
      }),
    ),
  );

  const failures = sendResults.filter((r) => r.status === "rejected").length;
  if (failures > 0) {
    console.error(`[pacts] ${failures} party email(s) failed`);
  }

  // Do not echo per-party email send status — it would let a caller
  // enumerate which addresses Resend accepts.
  return Response.json({ id: pactId });
}
