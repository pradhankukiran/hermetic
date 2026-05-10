import "server-only";

import { Resend } from "resend";

/**
 * Pact-mode email helpers.
 *
 * Kept in a separate module from `resend.ts` so the Pact wiring is a
 * self-contained drop-in. We intentionally do not depend on any internals
 * of `resend.ts` — the lazy-init Resend client and from/app URL helpers
 * are duplicated here at the same trivial cost as the per-mode message
 * templates already are.
 */

let cached: Resend | null = null;

function getResend(): Resend {
  if (cached) return cached;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  cached = new Resend(apiKey);
  return cached;
}

function fromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is not set");
  }
  return from;
}

export async function sendPactShare(opts: {
  to: string;
  ownerHint: string; // a short, non-PII descriptor like "your friend Kiran"
  share: string; // base64url
  pactUrl: string;
  partyIndex: number; // 1-based for human display
  partyCount: number;
}) {
  const resend = getResend();
  return resend.emails.send({
    from: fromAddress(),
    to: opts.to,
    subject: "Hermetic — your Pact share",
    text: [
      `${opts.ownerHint} has set up a Hermetic Pact and named you as one of ${opts.partyCount} parties.`,
      "",
      `You are party #${opts.partyIndex} of ${opts.partyCount}.`,
      "",
      "Below is your share of the decryption key. Keep it safe — store it in your password manager.",
      "A Pact requires ALL parties to combine their shares at the same time. There is no quorum, no timer, no fallback. If any one share is lost, the seal is unrecoverable.",
      "",
      "YOUR SHARE:",
      opts.share,
      "",
      "Pact URL (every party gathers here to combine shares):",
      opts.pactUrl,
      "",
      "We don't store this share. If you lose it, it cannot be recovered from us.",
    ].join("\n"),
  });
}
