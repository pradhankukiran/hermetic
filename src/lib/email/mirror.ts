import "server-only";

import { Resend } from "resend";

/**
 * Mirror-specific email delivery.
 *
 * Each holder receives ONE half of the decryption key plus the unlock URL.
 * The email tells them they need to combine their half with the other
 * holder's, simultaneously, in the same browser session.
 *
 * We deliberately do NOT import the shared Resend wrapper from
 * `@/lib/email/resend` here — the spec asks us to leave that file
 * untouched. We construct our own Resend client locally with the same
 * cached-singleton pattern.
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

/**
 * Send one holder their half of a Mirror seal.
 *
 * @param to            holder's email address
 * @param partnerHint   short non-PII descriptor of the other holder
 *                      (e.g. "the other holder", "your counterpart")
 * @param half          base64url-encoded Shamir share
 * @param mirrorUrl     unlock URL — same URL goes to both holders
 * @param halfLabel     "A" or "B" — used in subject and body so the
 *                      holders know which input slot to paste into
 */
export async function sendMirrorHalf(opts: {
  to: string;
  partnerHint: string;
  half: string;
  mirrorUrl: string;
  halfLabel: "A" | "B";
}) {
  const resend = getResend();
  return resend.emails.send({
    from: fromAddress(),
    to: opts.to,
    subject: `Hermetic — your Mirror half (${opts.halfLabel})`,
    text: [
      `Someone has set up a Hermetic Mirror naming you and ${opts.partnerHint} as the two holders.`,
      "",
      "A Mirror is a 2-of-2 mutual reveal: neither of you can unlock alone.",
      "Both halves must be pasted into the same browser session, at the same",
      "time, to decrypt the contents.",
      "",
      `YOUR HALF (label: ${opts.halfLabel}):`,
      opts.half,
      "",
      "Mirror URL (open this when both of you are ready):",
      opts.mirrorUrl,
      "",
      "Keep this half safe in your password manager. We never stored it; if",
      "you lose it, the Mirror cannot be unlocked.",
    ].join("\n"),
  });
}
