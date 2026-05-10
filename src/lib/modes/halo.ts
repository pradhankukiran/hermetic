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
import {
  assertHaloPrf,
  registerHaloCredential,
} from "@/lib/crypto/halo-prf";
import { gatewayUrl } from "@/lib/ipfs/gateway";
import { requestUploadUrl, uploadEncryptedBlob } from "@/lib/ipfs/upload";

/**
 * Halo mode — envelope encryption keyed to a WebAuthn PRF output.
 *
 *   payload --[XChaCha20-Poly1305 contentKey]--> ciphertext
 *           contentKey --[XChaCha20-Poly1305 KEK]--> wrappedContentKey
 *           KEK = WebAuthn-PRF(credential, prfSalt)         (32 bytes)
 *
 * The KEK is derivable only by the device that holds the registered passkey,
 * given the per-halo PRF salt. Hermetic, Pinata, and any network observer
 * see only the envelope — no path to the content key without the
 * authenticator's user-gesture-authorized PRF evaluation.
 *
 * Why envelope?
 *  - The PRF output materializes only inside the open tab, only after a user
 *    gesture. Wrapping the content key under it (rather than encrypting bulk
 *    content directly with it) means we generate + immediately discard the
 *    content key during create, so even the create-tab can't replay decrypt
 *    without re-asserting the passkey.
 *  - Same flat-file pattern as Drop: a single ciphertext blob on IPFS,
 *    addressable by CID. No DB rows, no API routes — pure Pinata + WebAuthn.
 *
 * Storage layout: a JSON envelope on IPFS containing
 *   { v, credentialId, prfSalt, wrappedContentKey, ciphertext, ... }
 *
 * Unlock-side identification: `credentialId` lives in the envelope (it is
 * non-secret). The browser uses it as `allowCredentials` in the assertion
 * call so only the authenticator that registered it can satisfy the PRF.
 */

const ENVELOPE_VERSION = 1;

export type HaloEnvelope = {
  v: number;
  /** Base64url-encoded WebAuthn credential id. */
  credentialId: string;
  /** Base64url 32-byte PRF salt. */
  prfSalt: string;
  /** Base64url XChaCha20-Poly1305(contentKey) wrapped under the PRF KEK. */
  wrappedContentKey: string;
  /** Base64url XChaCha20-Poly1305(payload) under the contentKey. */
  ciphertext: string;
  filename: string;
  mimeType: string;
  size: number;
};

export type CreatedHalo = {
  cid: string;
  size: number;
  credentialId: string;
};

export type OpenedHalo = {
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
};

function envelopeBytes(env: HaloEnvelope): Uint8Array {
  return utf8Encode(JSON.stringify(env));
}

function parseEnvelope(bytes: Uint8Array): HaloEnvelope {
  const env = JSON.parse(utf8Decode(bytes)) as HaloEnvelope;
  if (env.v !== ENVELOPE_VERSION) {
    throw new Error(`unsupported halo envelope version: ${env.v}`);
  }
  if (
    typeof env.credentialId !== "string" ||
    typeof env.prfSalt !== "string" ||
    typeof env.wrappedContentKey !== "string" ||
    typeof env.ciphertext !== "string"
  ) {
    throw new Error("halo: malformed envelope");
  }
  return env;
}

/**
 * AAD bound to every Halo ciphertext + wrapped key. Authenticates envelope
 * version so a downgrade to a future / older format fails the AEAD tag
 * rather than silently producing garbage. The credentialId and prfSalt are
 * implicitly authenticated through the PRF derivation itself: a different
 * (credential, salt) pair yields a different KEK, which fails to unwrap
 * the content key.
 */
function haloAad(): Uint8Array {
  return utf8Encode(`hermetic:halo:v=${ENVELOPE_VERSION}`);
}

/**
 * Encrypt a file under a freshly-minted content key and a passkey-bound
 * KEK, then upload the envelope to IPFS.
 *
 * Triggers two passkey ceremonies on devices that don't yield PRF output
 * during registration: one `create` + one `get` (handled inside
 * `registerHaloCredential`). After this call, both the content key and
 * the KEK have been wiped from memory; the only path back is a fresh
 * passkey assertion.
 */
export async function createHalo(file: File): Promise<CreatedHalo> {
  const sodium = await getSodium();

  // Read plaintext first so the passkey UI doesn't sit blocking on disk I/O.
  const plaintext = new Uint8Array(await file.arrayBuffer());

  // 32-byte content key for the bulk payload.
  const contentKey = await generateSymmetricKey();
  const aad = haloAad();
  const ciphertext = await encryptBytes(contentKey, plaintext, aad);

  // Register passkey + harvest PRF KEK. This blocks on the user's biometric
  // / PIN prompt. Failure surfaces as a friendly error from halo-prf.
  const halo = await registerHaloCredential();

  // Wrap the content key under the KEK. Both keys are 32 bytes, so the
  // wrapped output is 24 (nonce) + 32 (key) + 16 (Poly1305 tag) = 72 bytes.
  const wrappedContentKey = await encryptBytes(halo.kek, contentKey, aad);

  // Both keys are no longer needed in this tab — the KEK can be regenerated
  // from the passkey + salt, and the content key can be unwrapped from the
  // envelope. Wipe both before going to the network.
  sodium.memzero(contentKey);
  sodium.memzero(halo.kek);

  const envelope: HaloEnvelope = {
    v: ENVELOPE_VERSION,
    credentialId: halo.credentialId,
    prfSalt: halo.prfSalt,
    wrappedContentKey: bytesToBase64Url(wrappedContentKey),
    ciphertext: bytesToBase64Url(ciphertext),
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    size: plaintext.length,
  };

  const blob = envelopeBytes(envelope);
  const { url } = await requestUploadUrl({ size: blob.length });
  const { cid, size } = await uploadEncryptedBlob(blob, url, "halo.bin");

  return {
    cid,
    size,
    credentialId: halo.credentialId,
  };
}

/**
 * Encrypt + upload arbitrary text under a Halo seal.
 */
export async function createTextHalo(text: string): Promise<CreatedHalo> {
  const blob = new Blob([text], { type: "text/plain" });
  const file = new File([blob], "message.txt", { type: "text/plain" });
  return createHalo(file);
}

/**
 * Fetch a halo envelope, prompt the user for the registered passkey,
 * unwrap the content key, and decrypt the payload.
 *
 * Throws (with friendly errors) if:
 *  - The browser doesn't support WebAuthn / PRF (`assertHaloPrf`).
 *  - The user cancels the passkey prompt.
 *  - The device doesn't have the registered credential ("wrong device").
 *  - The unwrap fails (`decryptBytes` throws on tag mismatch — also wrong
 *    device, since a different PRF output is the same as a wrong key).
 */
export async function openHalo(cid: string): Promise<OpenedHalo> {
  const res = await fetch(gatewayUrl(cid));
  if (!res.ok) {
    throw new Error(`openHalo: gateway returned ${res.status}`);
  }
  const envelope = parseEnvelope(new Uint8Array(await res.arrayBuffer()));

  // Prompt for the passkey + harvest the same PRF output that wrapped the
  // content key at create time. This blocks on the user's biometric / PIN.
  const kek = await assertHaloPrf({
    credentialId: envelope.credentialId,
    salt: envelope.prfSalt,
  });

  const aad = haloAad();
  const wrapped = base64UrlToBytes(envelope.wrappedContentKey);

  let contentKey: Uint8Array;
  try {
    contentKey = await decryptBytes(kek, wrapped, aad);
  } catch {
    // Wipe the (wrong) KEK before bubbling up.
    const sodium = await getSodium();
    sodium.memzero(kek);
    throw new Error(
      "This passkey doesn't match the one used to seal this halo. Try a different passkey or device.",
    );
  }

  // KEK no longer needed; wipe before continuing.
  const sodium = await getSodium();
  sodium.memzero(kek);

  const ciphertext = base64UrlToBytes(envelope.ciphertext);
  const plaintext = await decryptBytes(contentKey, ciphertext, aad);

  // Wipe the content key now that the payload is back in plaintext.
  sodium.memzero(contentKey);

  return {
    filename: envelope.filename,
    mimeType: envelope.mimeType,
    bytes: plaintext,
  };
}

/**
 * Read the envelope header (without prompting for a passkey) so the open
 * page can show the filename / size / credential id before the user clicks
 * Unlock.
 */
export async function fetchHaloHeader(cid: string): Promise<{
  credentialId: string;
  filename: string;
  mimeType: string;
  size: number;
}> {
  const res = await fetch(gatewayUrl(cid));
  if (!res.ok) {
    throw new Error(`fetchHaloHeader: gateway returned ${res.status}`);
  }
  const env = parseEnvelope(new Uint8Array(await res.arrayBuffer()));
  return {
    credentialId: env.credentialId,
    filename: env.filename,
    mimeType: env.mimeType,
    size: env.size,
  };
}
