import "server-only";

import { Resend } from "resend";

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

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function sendMagicLink(email: string, magicUrl: string) {
  const resend = getResend();
  return resend.emails.send({
    from: fromAddress(),
    to: email,
    subject: "Hermetic — sign in",
    text: [
      "Click this link to sign in to Hermetic. It expires in 15 minutes.",
      "",
      magicUrl,
      "",
      "If you didn't request this, ignore the email — no account is created until you click the link.",
    ].join("\n"),
  });
}

export async function sendSwitchShare(opts: {
  to: string;
  ownerHint: string; // a short, non-PII descriptor like "your friend Kiran"
  share: string; // base64url
  switchUrl: string;
}) {
  const resend = getResend();
  return resend.emails.send({
    from: fromAddress(),
    to: opts.to,
    subject: "Hermetic — your trustee share",
    text: [
      `${opts.ownerHint} has set up a Hermetic Switch and named you as a trustee.`,
      "",
      "Below is your share of the decryption key. Keep it safe — store it in your password manager.",
      "If they go silent, you and the other trustees will be notified, and you'll combine your shares to unlock their message.",
      "",
      "YOUR SHARE:",
      opts.share,
      "",
      "Switch URL (for combining shares later):",
      opts.switchUrl,
      "",
      "We don't store this share. If you lose it, it cannot be recovered from us.",
    ].join("\n"),
  });
}

export async function sendSwitchTriggered(opts: {
  to: string;
  ownerHint: string;
  switchUrl: string;
}) {
  const resend = getResend();
  return resend.emails.send({
    from: fromAddress(),
    to: opts.to,
    subject: `Hermetic — ${opts.ownerHint} has gone silent`,
    text: [
      `${opts.ownerHint} did not check in to their Hermetic Switch in time.`,
      "",
      "The switch is now unlockable. To unlock it, you and the other trustees need to combine your shares at:",
      "",
      opts.switchUrl,
      "",
      "Bring the share you received when the switch was created.",
    ].join("\n"),
  });
}

export { appUrl };
