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
import type { KdfStrength } from "@/lib/crypto";
import { gatewayUrl } from "@/lib/ipfs/gateway";
import { requestUploadUrl, uploadEncryptedBlob } from "@/lib/ipfs/upload";

/**
 * Sigil mode — sealed by proof-of-knowledge of a witness.
 *
 *   payload --[XChaCha20-Poly1305 K]--> ciphertext
 *           K --[XChaCha20-Poly1305 KEK = Argon2id(witness, salt)]--> wrappedKey
 *
 * The creator picks a "witness" string (e.g., the answer to a riddle, a
 * shared passphrase, an inside reference). Sigil derives a Key-Encrypting
 * Key (KEK) from the witness via Argon2id, wraps a fresh random content
 * key K under the KEK, and uploads everything (ciphertext, wrapped key,
 * salt, the riddle prompt itself) to IPFS as one envelope. The CID is
 * the public address; the witness is *not* in the URL.
 *
 * Threat model:
 *   - Server side (us): sees nothing useful — only an opaque IPFS upload.
 *     We cannot derive K because we don't know the witness; the salt is
 *     in the envelope but Argon2id is by design slow.
 *   - The recipient: must know the witness. They type it in; their
 *     browser locally derives the KEK, unwraps K, decrypts the content.
 *
 * Honesty note — what this is NOT:
 *   This is "proof of knowledge" only in the *server-side ZK* sense: the
 *   server never sees the witness. The witness IS revealed to the page
 *   the recipient types it into (i.e. their own browser). For a true
 *   interactive ZK protocol — where the recipient proves knowledge to a
 *   verifier *without* revealing the witness even to the verifying party —
 *   see `src/lib/crypto/schnorr.ts`. That stub is the upgrade path; v1
 *   uses the simpler Argon2id-wrap approach because it requires no
 *   server roundtrip and inherits the Drop/Capsule "server stores nothing"
 *   property unchanged.
 *
 *   Brute-force resistance is exactly Argon2id's: the attacker needs the
 *   ciphertext (CID is public) and must spend ~64 MiB and one Argon2id
 *   iteration per witness guess. Pick a witness with enough entropy
 *   (a passphrase, not a 4-digit PIN) for this to be meaningful.
 */

const ENVELOPE_VERSION = 1;

/**
 * AAD bound to every Sigil ciphertext. Authenticates the envelope version
 * and mode label so a forged envelope claiming a different version (or a
 * Drop/Capsule envelope substituted at the same CID) cannot silently
 * decrypt — the AEAD tag check fails first.
 */
function sigilAad(): Uint8Array {
  return utf8Encode(`hermetic:sigil:v=${ENVELOPE_VERSION}`);
}

/**
 * AAD bound to the wrapped content key. Distinct from the content AAD so
 * an attacker can't lift the wrapped-key blob into the content slot or
 * vice-versa.
 */
function sigilWrapAad(): Uint8Array {
  return utf8Encode(`hermetic:sigil:v=${ENVELOPE_VERSION}:wrap`);
}

export type SigilEnvelope = {
  v: number;
  /** XChaCha20-Poly1305 ciphertext of the plaintext payload, base64url. */
  ciphertext: string;
  /** XChaCha20-Poly1305 ciphertext of the 32-byte content key under KEK, base64url. */
  wrappedKey: string;
  /** Argon2id salt for KEK derivation, base64url (16 bytes). */
  salt: string;
  /**
   * Argon2id strength preset used to derive the KEK. The opener must use
   * the same setting, so we record it in the envelope. Lets us upgrade
   * the production default over time without breaking open of older sigils.
   */
  kdf: KdfStrength;
  /** The riddle / prompt shown to the unlocker. Plaintext — not secret. */
  riddleQuestion: string;
  /** Original filename of the sealed payload (preserved for download). */
  filename: string;
  /** Original MIME type of the sealed payload. */
  mimeType: string;
  /** Plaintext byte length, for UI display before unlock. */
  size: number;
};

export type CreatedSigil = {
  cid: string;
  /** Bytes uploaded to IPFS (the JSON-encoded envelope). */
  size: number;
  riddleQuestion: string;
};

export type OpenedSigil = {
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
};

export type SigilHeader = {
  riddleQuestion: string;
  filename: string;
  mimeType: string;
  size: number;
};

function envelopeBytes(env: SigilEnvelope): Uint8Array {
  return utf8Encode(JSON.stringify(env));
}

function parseEnvelope(bytes: Uint8Array): SigilEnvelope {
  const env = JSON.parse(utf8Decode(bytes)) as SigilEnvelope;
  if (env.v !== ENVELOPE_VERSION) {
    throw new Error(`unsupported sigil envelope version: ${env.v}`);
  }
  return env;
}

/**
 * Default KDF strength for production sealing. "balanced" (64 MiB /
 * 3 iterations) is the sane preset for human-typed witnesses. Override
 * via `sealSigilEnvelope({..., kdf: "..."})` only when you have a reason
 * (tests use "light"; high-value secrets on capable devices may use "strong").
 */
const DEFAULT_KDF: KdfStrength = "balanced";

/**
 * Pure (no-network) seal: derive KEK, generate K, encrypt payload + wrap K.
 * Exposed for unit tests; production callers use {@link createSigil}.
 */
export async function sealSigilEnvelope(opts: {
  plaintext: Uint8Array;
  witness: string;
  riddleQuestion: string;
  filename: string;
  mimeType: string;
  kdf?: KdfStrength;
}): Promise<SigilEnvelope> {
  if (!opts.witness) throw new Error("sealSigilEnvelope: witness is empty");
  if (!opts.riddleQuestion.trim()) {
    throw new Error("sealSigilEnvelope: riddleQuestion is empty");
  }

  const kdf = opts.kdf ?? DEFAULT_KDF;
  const salt = await generateSalt();
  const kek = await deriveKey(opts.witness, salt, kdf);
  const contentKey = await generateSymmetricKey();

  const ciphertext = await encryptBytes(
    contentKey,
    opts.plaintext,
    sigilAad(),
  );
  const wrappedKey = await encryptBytes(kek, contentKey, sigilWrapAad());

  // Both keys served their purpose — wipe before any further async work.
  const sodium = await getSodium();
  sodium.memzero(contentKey);
  sodium.memzero(kek);

  return {
    v: ENVELOPE_VERSION,
    ciphertext: bytesToBase64Url(ciphertext),
    wrappedKey: bytesToBase64Url(wrappedKey),
    salt: bytesToBase64Url(salt),
    kdf,
    riddleQuestion: opts.riddleQuestion,
    filename: opts.filename,
    mimeType: opts.mimeType,
    size: opts.plaintext.length,
  };
}

/**
 * Pure (no-network) open: derive KEK from witness, unwrap K, decrypt payload.
 * Exposed for unit tests; production callers use {@link openSigil}.
 *
 * Throws if the witness doesn't match (the AEAD tag check on the wrapped
 * key fails — the inner content decrypt is never attempted with a wrong KEK).
 */
export async function openSigilEnvelope(
  envelope: SigilEnvelope,
  witness: string,
): Promise<OpenedSigil> {
  if (envelope.v !== ENVELOPE_VERSION) {
    throw new Error(`unsupported sigil envelope version: ${envelope.v}`);
  }
  const salt = base64UrlToBytes(envelope.salt);
  const wrappedKey = base64UrlToBytes(envelope.wrappedKey);
  const ciphertext = base64UrlToBytes(envelope.ciphertext);

  // Default to "balanced" for envelopes minted before kdf was recorded
  // (defense-in-depth — current sealSigilEnvelope always sets it).
  const kdf: KdfStrength = envelope.kdf ?? "balanced";
  const kek = await deriveKey(witness, salt, kdf);
  let contentKey: Uint8Array;
  try {
    contentKey = await decryptBytes(kek, wrappedKey, sigilWrapAad());
  } catch {
    // Wrong witness → wrong KEK → AEAD tag mismatch. Translate to a
    // friendlier error so the UI can render "wrong answer" rather than
    // a low-level libsodium message.
    const sodium = await getSodium();
    sodium.memzero(kek);
    throw new Error("Wrong witness — the envelope did not unwrap.");
  }
  const sodium = await getSodium();
  sodium.memzero(kek);

  let plaintext: Uint8Array;
  try {
    plaintext = await decryptBytes(contentKey, ciphertext, sigilAad());
  } finally {
    sodium.memzero(contentKey);
  }

  return {
    filename: envelope.filename,
    mimeType: envelope.mimeType,
    bytes: plaintext,
  };
}

/**
 * Encrypt + upload a file under a witness-derived KEK. Returns the CID;
 * the witness is NOT in the URL — the recipient must know it.
 */
export async function createSigil(opts: {
  file: File;
  witness: string;
  riddleQuestion: string;
}): Promise<CreatedSigil> {
  const plaintext = new Uint8Array(await opts.file.arrayBuffer());
  const envelope = await sealSigilEnvelope({
    plaintext,
    witness: opts.witness,
    riddleQuestion: opts.riddleQuestion,
    filename: opts.file.name,
    mimeType: opts.file.type || "application/octet-stream",
    // Production seals use the default ("balanced"). Tests pass "light".
  });

  const blob = envelopeBytes(envelope);
  const { url } = await requestUploadUrl({ size: blob.length });
  const { cid } = await uploadEncryptedBlob(blob, url, "sigil.bin");

  return {
    cid,
    size: blob.length,
    riddleQuestion: opts.riddleQuestion,
  };
}

/**
 * Convenience for sealing arbitrary text. Mirrors the Drop / Capsule
 * createTextX pattern.
 */
export async function createTextSigil(
  text: string,
  witness: string,
  riddleQuestion: string,
): Promise<CreatedSigil> {
  const blob = new Blob([text], { type: "text/plain" });
  const file = new File([blob], "message.txt", { type: "text/plain" });
  return createSigil({ file, witness, riddleQuestion });
}

/**
 * Read the envelope header (riddle prompt + payload metadata) without
 * decrypting. The recipient page calls this first so it can render the
 * riddle and witness prompt before the user has typed anything.
 */
export async function fetchSigilHeader(cid: string): Promise<SigilHeader> {
  const res = await fetch(gatewayUrl(cid));
  if (!res.ok) throw new Error(`gateway returned ${res.status}`);
  const env = parseEnvelope(new Uint8Array(await res.arrayBuffer()));
  return {
    riddleQuestion: env.riddleQuestion,
    filename: env.filename,
    mimeType: env.mimeType,
    size: env.size,
  };
}

/**
 * Fetch the envelope and try to unlock it with the supplied witness.
 * Throws "Wrong witness — the envelope did not unwrap." when the
 * witness fails to derive the right KEK.
 */
export async function openSigil(opts: {
  cid: string;
  witness: string;
}): Promise<OpenedSigil> {
  const res = await fetch(gatewayUrl(opts.cid));
  if (!res.ok) throw new Error(`gateway returned ${res.status}`);
  const envelope = parseEnvelope(new Uint8Array(await res.arrayBuffer()));
  return openSigilEnvelope(envelope, opts.witness);
}
