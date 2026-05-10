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
 * Mirror mode — 2-of-2 mutual reveal.
 *
 * Two named holders each receive ONE half of the decryption key by email.
 * Neither half alone reveals anything; both halves combined in the same
 * browser session reconstruct the symmetric key and decrypt the envelope
 * fetched from IPFS.
 *
 * Use case: symmetric "I'll show you mine if you show me yours" exchanges.
 * Once both halves are issued, neither party can defect by withholding —
 * doing so just locks the secret forever for both of them.
 *
 * Unlike Switch, there is no asymmetric "owner": the creator is just a
 * third-party broker who composes the seal and emails halves. The creator
 * does not need an account and is not retained server-side.
 */

const ENVELOPE_VERSION = 1;

type MirrorEnvelope = {
  v: number;
  ciphertext: string; // base64url
  filename: string;
  mimeType: string;
  size: number;
};

/**
 * AAD bound to every Mirror ciphertext. Authenticates the envelope version
 * (and binds it to the Mirror mode) so a forged envelope claiming a
 * different mode or version fails to decrypt.
 */
function mirrorAad(): Uint8Array {
  return utf8Encode(`hermetic:mirror:v=${ENVELOPE_VERSION}`);
}

export type CreateMirrorInput = {
  file: File;
  holderA: { email: string };
  holderB: { email: string };
};

export type CreateMirrorPlan = {
  cid: string;
  halfA: string; // base64url Shamir share
  halfB: string; // base64url Shamir share
};

/**
 * Build a Mirror seal: encrypt the file with a fresh symmetric key, split
 * the key into two Shamir shares (2-of-2), and upload the envelope to IPFS.
 *
 * Returns the CID and the two halves; the caller is responsible for
 * delivering each half to the corresponding holder. The halves are wiped
 * from this function's locals after encoding.
 */
export async function buildMirror(
  input: CreateMirrorInput,
): Promise<CreateMirrorPlan> {
  const plaintext = new Uint8Array(await input.file.arrayBuffer());
  const key = await generateSymmetricKey();
  const aad = mirrorAad();
  const ciphertext = await encryptBytes(key, plaintext, aad);

  const envelope: MirrorEnvelope = {
    v: ENVELOPE_VERSION,
    ciphertext: bytesToBase64Url(ciphertext),
    filename: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
    size: plaintext.length,
  };
  const envelopeBytes = utf8Encode(JSON.stringify(envelope));
  const { url } = await requestUploadUrl({ size: envelopeBytes.length });
  const { cid } = await uploadEncryptedBlob(envelopeBytes, url, "mirror.bin");

  // 2-of-2 Shamir split. Either share alone reveals nothing.
  const shares = await splitSecret(key, { shares: 2, threshold: 2 });
  const halfA = bytesToBase64Url(shares[0]);
  const halfB = bytesToBase64Url(shares[1]);

  // Wipe master key + raw share bytes once they have been encoded for
  // transport. The ciphertext is recoverable from IPFS, but the plaintext
  // key material no longer lingers in browser memory after this returns.
  const sodium = await getSodium();
  sodium.memzero(key);
  for (const share of shares) sodium.memzero(share);

  return { cid, halfA, halfB };
}

/**
 * Convenience helper for sealing a plain text payload (e.g. a confession,
 * a key handover note). Wraps the text in a Blob/File and delegates to
 * buildMirror so callers don't have to construct File objects themselves.
 */
export async function buildTextMirror(
  text: string,
  holderA: { email: string },
  holderB: { email: string },
): Promise<CreateMirrorPlan> {
  const blob = new Blob([text], { type: "text/plain" });
  const file = new File([blob], "message.txt", { type: "text/plain" });
  return buildMirror({ file, holderA, holderB });
}

/**
 * Combine the two base64url-encoded halves into the symmetric key, then
 * fetch and decrypt the Mirror envelope from IPFS.
 *
 * Returns the decrypted filename, mimeType, and bytes. The reconstructed
 * key and the input share bytes are wiped before returning.
 */
export async function unlockMirrorClientSide(opts: {
  cid: string;
  halfA: string;
  halfB: string;
}): Promise<{ filename: string; mimeType: string; bytes: Uint8Array }> {
  const shares = [
    base64UrlToBytes(opts.halfA.trim()),
    base64UrlToBytes(opts.halfB.trim()),
  ];
  const key = await combineShares(shares);

  const res = await fetch(gatewayUrl(opts.cid));
  if (!res.ok) throw new Error(`gateway returned ${res.status}`);
  const envelopeBytes = new Uint8Array(await res.arrayBuffer());
  const envelope = JSON.parse(utf8Decode(envelopeBytes)) as MirrorEnvelope;
  if (envelope.v !== ENVELOPE_VERSION) {
    throw new Error(`unsupported envelope version ${envelope.v}`);
  }
  const ciphertext = base64UrlToBytes(envelope.ciphertext);
  const aad = mirrorAad();
  const plaintext = await decryptBytes(key, ciphertext, aad);

  // Wipe reconstructed key + input share bytes now that we have plaintext.
  const sodium = await getSodium();
  sodium.memzero(key);
  for (const share of shares) sodium.memzero(share);

  return {
    filename: envelope.filename,
    mimeType: envelope.mimeType,
    bytes: plaintext,
  };
}
