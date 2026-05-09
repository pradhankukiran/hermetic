import {
  base64UrlToBytes,
  bytesToBase64Url,
  decryptBytes,
  encryptBytes,
  generateSymmetricKey,
  utf8Decode,
  utf8Encode,
} from "@/lib/crypto";
import {
  DRAND_CHAIN_HASH,
  dateForRound,
  roundForDate,
  timelockDecryptString,
  timelockEncryptBytes,
} from "@/lib/crypto/timelock";
import { gatewayUrl } from "@/lib/ipfs/gateway";
import { requestUploadUrl, uploadEncryptedBlob } from "@/lib/ipfs/upload";

/**
 * Capsule mode — envelope encryption with drand timelock.
 *
 *   payload --[XChaCha20-Poly1305 K]--> ciphertext
 *           K --[tlock(round)]--> tlockedKey
 *
 * Why envelope? tlock encrypts small payloads efficiently but is slow for
 * large blobs. We tlock only the 32-byte content key; the bulk content is
 * symmetrically encrypted. The recipient can't get K until the drand network
 * has signed the target round — at which point K is recoverable and the
 * symmetric ciphertext can be opened.
 *
 * The tlock-encrypted key includes the round number in its header, so the
 * recipient doesn't need to be told which round to wait for — the library
 * just tries and either succeeds or fails with "round not yet emitted."
 */

const ENVELOPE_VERSION = 1;

export type CapsuleEnvelope = {
  v: number;
  tlockedKey: string;
  ciphertext: string; // base64url
  filename: string;
  mimeType: string;
  size: number;
  drandRound: number;
  drandChainHash: string;
};

export type CreatedCapsule = {
  cid: string;
  drandRound: number;
  drandChainHash: string;
  unlockAt: Date;
  size: number;
};

export type OpenedCapsule = {
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
};

function envelopeBytes(env: CapsuleEnvelope): Uint8Array {
  return utf8Encode(JSON.stringify(env));
}

function parseEnvelope(bytes: Uint8Array): CapsuleEnvelope {
  const env = JSON.parse(utf8Decode(bytes)) as CapsuleEnvelope;
  if (env.v !== ENVELOPE_VERSION) {
    throw new Error(`unsupported capsule envelope version: ${env.v}`);
  }
  return env;
}

/**
 * Encrypt a file for a future date and upload to IPFS. Resolves with
 * the CID + drand round metadata, which should be persisted server-side
 * for indexing (the DB stores no key material).
 */
export async function createCapsule(
  file: File,
  unlockAt: Date,
): Promise<CreatedCapsule> {
  if (unlockAt.getTime() <= Date.now()) {
    throw new Error("unlockAt must be in the future");
  }

  const round = roundForDate(unlockAt);

  const plaintext = new Uint8Array(await file.arrayBuffer());
  const key = await generateSymmetricKey();
  const ciphertext = await encryptBytes(key, plaintext);
  const tlockedKey = await timelockEncryptBytes(key, round);

  const envelope: CapsuleEnvelope = {
    v: ENVELOPE_VERSION,
    tlockedKey,
    ciphertext: bytesToBase64Url(ciphertext),
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    size: plaintext.length,
    drandRound: round,
    drandChainHash: DRAND_CHAIN_HASH,
  };

  const envelopeBlob = envelopeBytes(envelope);
  const { url } = await requestUploadUrl({ size: envelopeBlob.length });
  const { cid } = await uploadEncryptedBlob(envelopeBlob, url, "capsule.bin");

  return {
    cid,
    drandRound: round,
    drandChainHash: DRAND_CHAIN_HASH,
    unlockAt: dateForRound(round),
    size: envelopeBlob.length,
  };
}

export async function createTextCapsule(
  text: string,
  unlockAt: Date,
): Promise<CreatedCapsule> {
  const blob = new Blob([text], { type: "text/plain" });
  const file = new File([blob], "message.txt", { type: "text/plain" });
  return createCapsule(file, unlockAt);
}

/**
 * Fetch + decrypt a capsule. Throws if the drand round has not yet been
 * emitted (the user has to wait until `unlockAt`).
 */
export async function openCapsule(cid: string): Promise<OpenedCapsule> {
  const res = await fetch(gatewayUrl(cid));
  if (!res.ok) throw new Error(`gateway returned ${res.status}`);
  const envelopeData = new Uint8Array(await res.arrayBuffer());
  const envelope = parseEnvelope(envelopeData);

  const key = await timelockDecryptString(envelope.tlockedKey);
  const ciphertext = base64UrlToBytes(envelope.ciphertext);
  const plaintext = await decryptBytes(key, ciphertext);

  return {
    filename: envelope.filename,
    mimeType: envelope.mimeType,
    bytes: plaintext,
  };
}

/**
 * Read the envelope header (without decrypting) to display unlock time
 * + filename + size on the open page even before the round arrives.
 */
export async function fetchCapsuleHeader(cid: string): Promise<{
  filename: string;
  mimeType: string;
  size: number;
  drandRound: number;
  unlockAt: Date;
}> {
  const res = await fetch(gatewayUrl(cid));
  if (!res.ok) throw new Error(`gateway returned ${res.status}`);
  const envelope = parseEnvelope(new Uint8Array(await res.arrayBuffer()));
  return {
    filename: envelope.filename,
    mimeType: envelope.mimeType,
    size: envelope.size,
    drandRound: envelope.drandRound,
    unlockAt: dateForRound(envelope.drandRound),
  };
}
