import {
  base64UrlToBytes,
  bytesToBase64Url,
  decryptBytes,
  deriveKey,
  encryptBytes,
  generateSalt,
  generateSymmetricKey,
  getSodium,
  utf8Decode,
  utf8Encode,
} from "@/lib/crypto";
import { getMainnetClient } from "@/lib/chain/viem";
import { gatewayUrl } from "@/lib/ipfs/gateway";
import { requestUploadUrl, uploadEncryptedBlob } from "@/lib/ipfs/upload";

/**
 * Beacon mode — encrypt now, unlock when an on-chain block height is mined.
 *
 *   payload --[XChaCha20-Poly1305 K]----------> ciphertext
 *           K --[XChaCha20-Poly1305 KEK]------> wrappedKey
 *           passphrase + salt --[Argon2id]----> KEK
 *
 * v1 honesty disclosure
 * ---------------------
 * The on-chain block height in this mode is a **UI-level gate, not a
 * cryptographic seal.** A truly chain-derived key (e.g. one that doesn't
 * exist until block N is mined) would require either:
 *
 *   1. an oracle pushing block hashes back into a tlock-style scheme, or
 *   2. encrypting under a future block hash that nobody can predict.
 *
 * Both are research-grade open problems on EVM today and out of scope for
 * Beacon v1. So Beacon's "when" is enforced by the chain (the open page
 * refuses to even attempt decryption until `currentBlock >= targetHeight`),
 * and Beacon's "who" is enforced by the owner-held passphrase. A
 * determined attacker could of course bypass the UI gate, but they still
 * need the passphrase — which Hermetic never sees, never stores, and
 * never transmits.
 *
 * In other words: this is Capsule, but anchored to a chain rather than to
 * drand, with a passphrase taking the place of tlock as the cryptographic
 * sealant. We encode this honestly in the AAD so any attempt to swap chain
 * id, target height, envelope version, or passphrase salt fails the AEAD
 * tag check at decrypt time.
 */

const ENVELOPE_VERSION = 1;
export const BEACON_DEFAULT_CHAIN_ID = 1; // Ethereum mainnet
const KDF_STRENGTH = "balanced" as const;

/** Persisted on IPFS as JSON-encoded UTF-8 bytes. */
export type BeaconEnvelope = {
  v: number;
  chainId: number;
  targetHeight: string; // bigint serialized as decimal string for JSON safety
  /** Argon2id salt for the passphrase KDF, base64url. */
  kdfSalt: string;
  /** Symmetric key K wrapped under the passphrase-derived KEK, base64url. */
  wrappedKey: string;
  /** Bulk content sealed under K, base64url. */
  ciphertext: string;
  filename: string;
  mimeType: string;
  size: number;
};

export type CreatedBeacon = {
  cid: string;
  targetHeight: bigint;
  chainId: number;
  size: number;
};

export type OpenedBeacon = {
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
};

export type BeaconHeader = {
  filename: string;
  mimeType: string;
  size: number;
  targetHeight: bigint;
  chainId: number;
};

function envelopeToBytes(env: BeaconEnvelope): Uint8Array {
  return utf8Encode(JSON.stringify(env));
}

function parseEnvelope(bytes: Uint8Array): BeaconEnvelope {
  const env = JSON.parse(utf8Decode(bytes)) as BeaconEnvelope;
  if (env.v !== ENVELOPE_VERSION) {
    throw new Error(`unsupported beacon envelope version: ${env.v}`);
  }
  return env;
}

/**
 * AAD bound to every Beacon ciphertext. Authenticates envelope version,
 * chain id, and target height — so a forged envelope claiming a different
 * height (e.g. one already mined) cannot be silently substituted; the AEAD
 * tag check fails on decrypt.
 *
 * The chain anchor is currently UI-only (see module-level JSDoc), but binding
 * these fields here is cheap and prevents a class of envelope-mutation
 * attacks regardless.
 */
function beaconAad(chainId: number, targetHeight: bigint): Uint8Array {
  return utf8Encode(
    `hermetic:beacon:v=${ENVELOPE_VERSION}:chain=${chainId}:height=${targetHeight.toString()}`,
  );
}

/**
 * Encrypt a file for unlock at a future Ethereum mainnet block height.
 *
 * The passphrase is the cryptographic sealant: the owner holds it, and
 * delivers it to recipients out-of-band when the block height has been
 * reached. The chain check is enforced UI-side on the open page.
 *
 * Returns the IPFS CID + chain metadata so the server can index the
 * envelope (the DB stores no key material — never the passphrase, salt,
 * KEK, K, or wrapped K).
 */
export async function createBeacon(
  file: File,
  targetHeight: bigint,
  passphrase: string,
  opts: { chainId?: number } = {},
): Promise<CreatedBeacon> {
  if (targetHeight <= BigInt(0)) {
    throw new Error("targetHeight must be positive");
  }
  if (passphrase.length < 8) {
    throw new Error("passphrase must be at least 8 characters");
  }
  const chainId = opts.chainId ?? BEACON_DEFAULT_CHAIN_ID;

  const plaintext = new Uint8Array(await file.arrayBuffer());
  const aad = beaconAad(chainId, targetHeight);

  // 1. Generate a random content key K and seal the bulk content with it.
  const key = await generateSymmetricKey();
  const ciphertext = await encryptBytes(key, plaintext, aad);

  // 2. Derive the KEK from the passphrase + a fresh salt, then wrap K.
  //    The salt is non-secret and stored alongside the ciphertext; the
  //    passphrase must never touch the wire / DB / IPFS.
  const salt = await generateSalt();
  const kek = await deriveKey(passphrase, salt, KDF_STRENGTH);
  const wrappedKey = await encryptBytes(kek, key, aad);

  // 3. Wipe both raw keys from memory before any further await/network I/O.
  const sodium = await getSodium();
  sodium.memzero(key);
  sodium.memzero(kek);

  const envelope: BeaconEnvelope = {
    v: ENVELOPE_VERSION,
    chainId,
    targetHeight: targetHeight.toString(),
    kdfSalt: bytesToBase64Url(salt),
    wrappedKey: bytesToBase64Url(wrappedKey),
    ciphertext: bytesToBase64Url(ciphertext),
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    size: plaintext.length,
  };

  const envelopeBlob = envelopeToBytes(envelope);
  const { url } = await requestUploadUrl({ size: envelopeBlob.length });
  const { cid } = await uploadEncryptedBlob(envelopeBlob, url, "beacon.bin");

  return {
    cid,
    targetHeight,
    chainId,
    size: envelopeBlob.length,
  };
}

/**
 * Convenience wrapper for "paste a message" beacon flows.
 */
export async function createTextBeacon(
  text: string,
  targetHeight: bigint,
  passphrase: string,
  opts: { chainId?: number } = {},
): Promise<CreatedBeacon> {
  const blob = new Blob([text], { type: "text/plain" });
  const file = new File([blob], "message.txt", { type: "text/plain" });
  return createBeacon(file, targetHeight, passphrase, opts);
}

/**
 * Read the envelope header (without decrypting) so the open page can
 * display the unlock target + filename + size before the chain reaches it.
 */
export async function fetchBeaconHeader(cid: string): Promise<BeaconHeader> {
  const res = await fetch(gatewayUrl(cid));
  if (!res.ok) throw new Error(`gateway returned ${res.status}`);
  const envelope = parseEnvelope(new Uint8Array(await res.arrayBuffer()));
  return {
    filename: envelope.filename,
    mimeType: envelope.mimeType,
    size: envelope.size,
    targetHeight: BigInt(envelope.targetHeight),
    chainId: envelope.chainId,
  };
}

/**
 * Current Ethereum mainnet block height (latest mined). Returned as a bigint
 * so we can compare against `BeaconEnvelope.targetHeight` without overflow.
 */
export async function getCurrentBlockHeight(): Promise<bigint> {
  const client = getMainnetClient();
  return client.getBlockNumber();
}

/**
 * Open a beacon: fetch envelope, verify the chain has reached the target
 * height, then derive the KEK from the supplied passphrase and unwrap K.
 *
 * Throws if:
 *  - the gateway returns non-200,
 *  - the envelope chain id mismatches our expected chain,
 *  - the chain has not yet reached the target height,
 *  - or the passphrase is wrong (AEAD tag check fails).
 */
export async function openBeacon(
  cid: string,
  passphrase: string,
): Promise<OpenedBeacon> {
  const res = await fetch(gatewayUrl(cid));
  if (!res.ok) throw new Error(`gateway returned ${res.status}`);
  const envelope = parseEnvelope(new Uint8Array(await res.arrayBuffer()));

  const chainId = envelope.chainId;
  const targetHeight = BigInt(envelope.targetHeight);

  // Reject envelopes for a chain we don't support before any work.
  if (chainId !== BEACON_DEFAULT_CHAIN_ID) {
    throw new Error(
      `beacon chain mismatch: expected ${BEACON_DEFAULT_CHAIN_ID}, got ${chainId}`,
    );
  }

  // UI-level chain gate: refuse to attempt decrypt before the height is mined.
  // (See module JSDoc for why this is "honest UI gating" rather than a
  // cryptographic seal.)
  const currentHeight = await getCurrentBlockHeight();
  if (currentHeight < targetHeight) {
    throw new Error(
      `beacon not yet open: current height ${currentHeight}, target ${targetHeight}`,
    );
  }

  const aad = beaconAad(chainId, targetHeight);
  const salt = base64UrlToBytes(envelope.kdfSalt);
  const wrappedKey = base64UrlToBytes(envelope.wrappedKey);
  const ciphertext = base64UrlToBytes(envelope.ciphertext);

  // Derive KEK from passphrase + salt and unwrap K. A wrong passphrase
  // produces a wrong KEK, which fails the AEAD tag check on `wrappedKey`.
  const kek = await deriveKey(passphrase, salt, KDF_STRENGTH);
  let key: Uint8Array;
  try {
    key = await decryptBytes(kek, wrappedKey, aad);
  } catch {
    const sodium = await getSodium();
    sodium.memzero(kek);
    throw new Error("incorrect passphrase");
  }
  const sodium = await getSodium();
  sodium.memzero(kek);

  const plaintext = await decryptBytes(key, ciphertext, aad);
  sodium.memzero(key);

  return {
    filename: envelope.filename,
    mimeType: envelope.mimeType,
    bytes: plaintext,
  };
}
