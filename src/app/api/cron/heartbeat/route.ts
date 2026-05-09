import "server-only";

import { timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";
import { and, eq, lt, sql } from "drizzle-orm";

import { getDb, schema } from "@/lib/db/client";
import { appUrl, sendSwitchTriggered } from "@/lib/email/resend";

/**
 * Vercel Cron handler. Runs on a schedule defined in vercel.json.
 *
 * Triggers expired switches: status active → triggered, then emails every
 * trustee with the unlock URL. The CID is now visible from the public
 * status endpoint (it stays hidden until status flips).
 *
 * Auth: Vercel adds an Authorization header with the value of CRON_SECRET
 * to scheduled invocations. Reject anything without it.
 */

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET not set" }, { status: 500 });
  }
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(auth ?? "");
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Find switches whose deadline has passed and which are still active.
  // deadline = last_checkin_at + (inactivity_seconds seconds)
  const expired = await db
    .select({
      id: schema.switches.id,
      ownerId: schema.switches.ownerId,
    })
    .from(schema.switches)
    .where(
      and(
        eq(schema.switches.status, "active"),
        lt(
          sql`${schema.switches.lastCheckinAt} + (${schema.switches.inactivitySeconds} || ' seconds')::interval`,
          sql`now()`,
        ),
      ),
    );

  let triggered = 0;
  let emailsSent = 0;
  let emailsFailed = 0;

  for (const sw of expired) {
    // Atomic flip + record triggered_at; only proceed if we actually flipped.
    const updated = await db
      .update(schema.switches)
      .set({ status: "triggered", triggeredAt: new Date() })
      .where(
        and(
          eq(schema.switches.id, sw.id),
          eq(schema.switches.status, "active"),
        ),
      )
      .returning({ id: schema.switches.id });
    if (updated.length === 0) continue;
    triggered++;

    const trustees = await db
      .select({ email: schema.switchTrustees.email })
      .from(schema.switchTrustees)
      .where(eq(schema.switchTrustees.switchId, sw.id));

    const switchUrl = `${appUrl()}/switch/${sw.id}`;
    const results = await Promise.allSettled(
      trustees.map((t) =>
        sendSwitchTriggered({
          to: t.email,
          ownerHint: "Your contact",
          switchUrl,
        }),
      ),
    );
    for (const r of results) {
      if (r.status === "fulfilled") emailsSent++;
      else emailsFailed++;
    }

    await db
      .update(schema.switches)
      .set({ trusteesNotifiedAt: new Date() })
      .where(eq(schema.switches.id, sw.id));
  }

  return Response.json({ triggered, emailsSent, emailsFailed });
}
