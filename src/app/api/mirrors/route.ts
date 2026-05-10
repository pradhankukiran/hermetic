import "server-only";

import type { NextRequest } from "next/server";

import { assertSameOrigin } from "@/lib/auth/csrf";
import { hashEmail } from "@/lib/crypto";
import { getDb, schema } from "@/lib/db/client";
import { sendMirrorHalf } from "@/lib/email/mirror";
import { appUrl } from "@/lib/email/resend";

/**
 * POST /api/mirrors
 *
 * Create a new Mirror seal:
 *   1. Persist the CID + the two holders' email hashes (no plaintext).
 *   2. Email each holder their half via Resend. The server briefly handles
 *      the halves to deliver them; nothing is persisted that lets the
 *      server reconstruct the key.
 *   3. Return the Mirror id for navigation.
 *
 * Body shape (browser already encrypted + uploaded the envelope):
 *   {
 *     cid: string;
 *     holderA: { email: string; half: string };  // half is base64url
 *     holderB: { email: string; half: string };
 *   }
 *
 * No authentication: the creator is an unauthenticated broker. We still
 * gate state-changing requests with same-origin to prevent CSRF abuse.
 */

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Holder = { email?: unknown; half?: unknown };

type CreateMirrorBody = {
  cid?: unknown;
  holderA?: Holder;
  holderB?: Holder;
};

function validateHolder(h: Holder | undefined): {
  email: string;
  half: string;
} | null {
  if (!h || typeof h !== "object") return null;
  if (typeof h.email !== "string" || !EMAIL_RX.test(h.email.trim())) return null;
  if (typeof h.half !== "string" || h.half.length === 0) return null;
  return { email: h.email.trim(), half: h.half };
}

export async function POST(req: NextRequest) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  let body: CreateMirrorBody = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const cid = typeof body.cid === "string" ? body.cid.trim() : "";
  if (!cid) return Response.json({ error: "cid required" }, { status: 400 });

  const a = validateHolder(body.holderA);
  const b = validateHolder(body.holderB);
  if (!a || !b) {
    return Response.json(
      { error: "both holders need a valid email and half" },
      { status: 400 },
    );
  }

  if (a.email.toLowerCase() === b.email.toLowerCase()) {
    return Response.json(
      { error: "holders must have distinct emails" },
      { status: 400 },
    );
  }

  const db = getDb();

  const inserted = await db
    .insert(schema.mirrors)
    .values({
      cid,
      holderAEmailHash: hashEmail(a.email),
      holderBEmailHash: hashEmail(b.email),
    })
    .returning({ id: schema.mirrors.id });
  const mirrorId = inserted[0].id;

  // Email each holder their half + the unlock URL.
  // The server briefly handles the half to deliver it; it is not persisted.
  // We use Promise.allSettled and surface only an aggregate count to avoid
  // letting callers enumerate which addresses Resend accepts.
  const mirrorUrl = `${appUrl()}/mirror/${mirrorId}`;
  await Promise.allSettled([
    sendMirrorHalf({
      to: a.email,
      partnerHint: "another holder",
      half: a.half,
      mirrorUrl,
      halfLabel: "A",
    }),
    sendMirrorHalf({
      to: b.email,
      partnerHint: "another holder",
      half: b.half,
      mirrorUrl,
      halfLabel: "B",
    }),
  ]).then((results) => {
    const failures = results.filter((r) => r.status === "rejected").length;
    if (failures > 0) {
      console.error(`[mirrors] ${failures} half email(s) failed`);
    }
  });

  return Response.json({ id: mirrorId });
}
