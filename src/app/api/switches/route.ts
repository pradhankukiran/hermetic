import "server-only";

import type { NextRequest } from "next/server";

import { assertSameOrigin } from "@/lib/auth/csrf";
import { hashEmail } from "@/lib/crypto";
import { getDb, schema } from "@/lib/db/client";
import { appUrl, sendSwitchShare } from "@/lib/email/resend";
import { requireSessionUser } from "@/lib/auth/session";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_DAYS = 1;
const MAX_DAYS = 365 * 5;

type CreateSwitchBody = {
  cid?: string;
  thresholdK?: number;
  shareCountN?: number;
  inactivitySeconds?: number;
  trustees?: { email?: string; shareBase64Url?: string }[];
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

  let body: CreateSwitchBody = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const cid = typeof body.cid === "string" ? body.cid.trim() : "";
  const thresholdK = Number(body.thresholdK);
  const shareCountN = Number(body.shareCountN);
  const inactivitySeconds = Number(body.inactivitySeconds);
  const trustees = Array.isArray(body.trustees) ? body.trustees : [];

  if (!cid) return Response.json({ error: "cid required" }, { status: 400 });
  if (!Number.isInteger(thresholdK) || thresholdK < 2) {
    return Response.json({ error: "thresholdK must be >= 2" }, { status: 400 });
  }
  if (!Number.isInteger(shareCountN) || shareCountN < thresholdK) {
    return Response.json(
      { error: "shareCountN must be >= thresholdK" },
      { status: 400 },
    );
  }
  if (
    !Number.isInteger(inactivitySeconds) ||
    inactivitySeconds < MIN_DAYS * 86400 ||
    inactivitySeconds > MAX_DAYS * 86400
  ) {
    return Response.json(
      {
        error: `inactivitySeconds must be between ${MIN_DAYS} and ${MAX_DAYS} days`,
      },
      { status: 400 },
    );
  }
  if (trustees.length !== shareCountN) {
    return Response.json(
      { error: `expected ${shareCountN} trustees, got ${trustees.length}` },
      { status: 400 },
    );
  }
  for (const t of trustees) {
    if (typeof t.email !== "string" || !EMAIL_RX.test(t.email.trim())) {
      return Response.json(
        { error: "every trustee needs a valid email" },
        { status: 400 },
      );
    }
    if (typeof t.shareBase64Url !== "string" || t.shareBase64Url.length === 0) {
      return Response.json(
        { error: "every trustee needs a share" },
        { status: 400 },
      );
    }
  }

  const db = getDb();

  const inserted = await db
    .insert(schema.switches)
    .values({
      ownerId: user.id,
      cid,
      thresholdK,
      shareCountN,
      inactivitySeconds,
    })
    .returning({ id: schema.switches.id });
  const switchId = inserted[0].id;

  await db.insert(schema.switchTrustees).values(
    trustees.map((t, i) => ({
      switchId,
      email: t.email!.trim().toLowerCase(),
      emailHash: hashEmail(t.email!),
      shareIndex: i,
    })),
  );

  // Email each trustee their share + the unlock URL.
  // The server briefly handles the share to deliver it; it is not persisted.
  const switchUrl = `${appUrl()}/switch/${switchId}`;
  const ownerHint = "Your contact"; // intentionally non-PII
  const sendResults = await Promise.allSettled(
    trustees.map((t) =>
      sendSwitchShare({
        to: t.email!,
        ownerHint,
        share: t.shareBase64Url!,
        switchUrl,
      }),
    ),
  );

  const failures = sendResults.filter((r) => r.status === "rejected").length;
  if (failures > 0) {
    console.error(`[switches] ${failures} trustee email(s) failed`);
  }

  return Response.json({
    id: switchId,
    emailsSent: sendResults.length - failures,
    emailsFailed: failures,
  });
}
