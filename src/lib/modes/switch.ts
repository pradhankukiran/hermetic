import {
  base64UrlToBytes,
  bytesToBase64Url,
  decryptBytes,
  encryptBytes,
  generateSymmetricKey,
  getSodium,
  utf8Decode,
  utf8Encode,
} from "@/lib/crypto";
import { combineShares, splitSecret } from "@/lib/crypto/shamir";
import { gatewayUrl } from "@/lib/ipfs/gateway";
import { requestUploadUrl, uploadEncryptedBlob } from "@/lib/ipfs/upload";

/**
 * Switch mode — encrypt with a random key, split the key into Shamir shares,
 * email a share to each trustee. Server never holds the shares; it only
 * tracks check-ins and fires when the user goes silent.
 *
 * On unlock (after the switch is triggered), trustees gather and paste their
 * shares into the unlock page; the browser reconstructs the key and decrypts
 * the ciphertext fetched from IPFS.
 */

const ENVELOPE_VERSION = 1;

type SwitchEnvelope = {
  v: number;
  ciphertext: string; // base64url
  filename: string;
  mimeType: string;
  size: number;
};

/**
 * AAD bound to every Switch ciphertext. Authenticates the envelope version
 * so a forged envelope claiming a different version (or another mode) fails
 * to decrypt.
 */
function switchAad(): Uint8Array {
  return utf8Encode(`hermetic:switch:v=${ENVELOPE_VERSION}`);
}

export type CreateSwitchInput = {
  file: File;
  thresholdK: number;
  shareCountN: number;
  inactivityDays: number;
  trustees: { email: string }[];
};

export type CreateSwitchPlan = {
  cid: string;
  thresholdK: number;
  shareCountN: number;
  inactivitySeconds: number;
  trustees: { email: string; shareBase64Url: string }[];
};

export async function buildSwitch(
  input: CreateSwitchInput,
): Promise<CreateSwitchPlan> {
  if (input.trustees.length !== input.shareCountN) {
    throw new Error("trustee count must equal shareCountN");
  }

  const plaintext = new Uint8Array(await input.file.arrayBuffer());
  const key = await generateSymmetricKey();
  const aad = switchAad();
  const ciphertext = await encryptBytes(key, plaintext, aad);

  const envelope: SwitchEnvelope = {
    v: ENVELOPE_VERSION,
    ciphertext: bytesToBase64Url(ciphertext),
    filename: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
    size: plaintext.length,
  };
  const envelopeBytes = utf8Encode(JSON.stringify(envelope));
  const { url } = await requestUploadUrl({ size: envelopeBytes.length });
  const { cid } = await uploadEncryptedBlob(envelopeBytes, url, "switch.bin");

  const shares = await splitSecret(key, {
    shares: input.shareCountN,
    threshold: input.thresholdK,
  });

  const trustees = input.trustees.map((t, i) => ({
    email: t.email,
    shareBase64Url: bytesToBase64Url(shares[i]),
  }));

  // Wipe the master key and the raw share bytes once they have been
  // base64url-encoded for transport. The ciphertext is still recoverable
  // (it's on IPFS) but the plaintext key material no longer lingers in
  // browser memory after this call returns.
  const sodium = await getSodium();
  sodium.memzero(key);
  for (const share of shares) sodium.memzero(share);

  return {
    cid,
    thresholdK: input.thresholdK,
    shareCountN: input.shareCountN,
    inactivitySeconds: input.inactivityDays * 24 * 60 * 60,
    trustees,
  };
}

export async function buildTextSwitch(
  text: string,
  trustees: { email: string }[],
  thresholdK: number,
  inactivityDays: number,
): Promise<CreateSwitchPlan> {
  const blob = new Blob([text], { type: "text/plain" });
  const file = new File([blob], "message.txt", { type: "text/plain" });
  return buildSwitch({
    file,
    thresholdK,
    shareCountN: trustees.length,
    inactivityDays,
    trustees,
  });
}

/**
 * Combine K base64url-encoded Shamir shares into the symmetric key, then
 * fetch and decrypt the switch envelope from IPFS.
 */
export async function unlockSwitchClientSide(opts: {
  cid: string;
  shareStrings: string[];
}): Promise<{ filename: string; mimeType: string; bytes: Uint8Array }> {
  const shares = opts.shareStrings.map((s) => base64UrlToBytes(s.trim()));
  const key = await combineShares(shares);

  const res = await fetch(gatewayUrl(opts.cid));
  if (!res.ok) throw new Error(`gateway returned ${res.status}`);
  const envelopeBytes = new Uint8Array(await res.arrayBuffer());
  const envelope = JSON.parse(utf8Decode(envelopeBytes)) as SwitchEnvelope;
  if (envelope.v !== ENVELOPE_VERSION) {
    throw new Error(`unsupported envelope version ${envelope.v}`);
  }
  const ciphertext = base64UrlToBytes(envelope.ciphertext);
  const aad = switchAad();
  const plaintext = await decryptBytes(key, ciphertext, aad);

  // Wipe the reconstructed master key and the input share bytes now that
  // we have the plaintext. The plaintext itself is left to the caller.
  const sodium = await getSodium();
  sodium.memzero(key);
  for (const share of shares) sodium.memzero(share);

  return {
    filename: envelope.filename,
    mimeType: envelope.mimeType,
    bytes: plaintext,
  };
}
