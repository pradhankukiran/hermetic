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
 * Pact mode — Switch with K = N and no dead-man's timer.
 *
 * Encrypt content with a random symmetric key, split that key into N Shamir
 * shares (threshold = N), and email one share to each party. To unlock,
 * every party must gather on a public unlock page and paste their share at
 * the same time; the browser combines the shares and decrypts.
 *
 * Threat model parity with Switch:
 *  - Server only sees the CID, the party count, and (plaintext) emails for
 *    delivery. It never sees the key, any share, or the plaintext content.
 *  - Pinata only sees the encrypted envelope.
 *
 * Departures from Switch:
 *  - K === N: no quorum slack, every party must consent to unlock.
 *  - No timer: the seal is openable from creation. Status flips to "revoked"
 *    only by explicit owner action.
 */

const ENVELOPE_VERSION = 1;

type PactEnvelope = {
  v: number;
  ciphertext: string; // base64url
  filename: string;
  mimeType: string;
  size: number;
};

/**
 * AAD bound to every Pact ciphertext. Authenticates the envelope version
 * (and the mode label) so a forged envelope claiming a different version
 * or mode fails to decrypt.
 */
function pactAad(): Uint8Array {
  return utf8Encode(`hermetic:pact:v=${ENVELOPE_VERSION}`);
}

export type CreatePactInput = {
  file: File;
  parties: { email: string }[];
};

export type CreatePactPlan = {
  cid: string;
  partyCountN: number;
  parties: { email: string; shareBase64Url: string }[];
};

export async function buildPact(
  input: CreatePactInput,
): Promise<CreatePactPlan> {
  const partyCountN = input.parties.length;
  if (partyCountN < 2) {
    throw new Error("buildPact: need at least 2 parties");
  }

  const plaintext = new Uint8Array(await input.file.arrayBuffer());
  const key = await generateSymmetricKey();
  const aad = pactAad();
  const ciphertext = await encryptBytes(key, plaintext, aad);

  const envelope: PactEnvelope = {
    v: ENVELOPE_VERSION,
    ciphertext: bytesToBase64Url(ciphertext),
    filename: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
    size: plaintext.length,
  };
  const envelopeBytes = utf8Encode(JSON.stringify(envelope));
  const { url } = await requestUploadUrl({ size: envelopeBytes.length });
  const { cid } = await uploadEncryptedBlob(envelopeBytes, url, "pact.bin");

  // K = N — every party's share is required.
  const shares = await splitSecret(key, {
    shares: partyCountN,
    threshold: partyCountN,
  });

  const parties = input.parties.map((p, i) => ({
    email: p.email,
    shareBase64Url: bytesToBase64Url(shares[i]),
  }));

  // Wipe the master key and the raw share bytes once they have been
  // base64url-encoded for transport.
  const sodium = await getSodium();
  sodium.memzero(key);
  for (const share of shares) sodium.memzero(share);

  return {
    cid,
    partyCountN,
    parties,
  };
}

export async function buildTextPact(
  text: string,
  parties: { email: string }[],
): Promise<CreatePactPlan> {
  const blob = new Blob([text], { type: "text/plain" });
  const file = new File([blob], "message.txt", { type: "text/plain" });
  return buildPact({ file, parties });
}

/**
 * Combine N base64url-encoded Shamir shares (threshold = N) into the
 * symmetric key, then fetch and decrypt the pact envelope from IPFS.
 *
 * The caller must supply every share — there is no quorum to fall back on.
 */
export async function unlockPactClientSide(opts: {
  cid: string;
  shareStrings: string[];
}): Promise<{ filename: string; mimeType: string; bytes: Uint8Array }> {
  const shares = opts.shareStrings.map((s) => base64UrlToBytes(s.trim()));
  const key = await combineShares(shares);

  const res = await fetch(gatewayUrl(opts.cid));
  if (!res.ok) throw new Error(`gateway returned ${res.status}`);
  const envelopeBytes = new Uint8Array(await res.arrayBuffer());
  const envelope = JSON.parse(utf8Decode(envelopeBytes)) as PactEnvelope;
  if (envelope.v !== ENVELOPE_VERSION) {
    throw new Error(`unsupported envelope version ${envelope.v}`);
  }
  const ciphertext = base64UrlToBytes(envelope.ciphertext);
  const aad = pactAad();
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
