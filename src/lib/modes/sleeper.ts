import {
  bytesToBase64Url,
  base64UrlToBytes,
  decryptBytes,
  encryptBytes,
  generateSymmetricKey,
  getSodium,
  utf8Encode,
} from "@/lib/crypto";
import { gatewayUrl } from "@/lib/ipfs/gateway";
import { requestUploadUrl, uploadEncryptedBlob } from "@/lib/ipfs/upload";

/**
 * Sleeper mode — encrypt-then-upload, like Drop, but the CID is gated by an
 * owner-controlled status flag on the server. The decryption key `K` rides
 * in the URL fragment of the share URL exactly as in Drop, so the server
 * never sees it.
 *
 * Threat model:
 *  - Server stores: ownerId, CID, status (asleep | released | revoked).
 *  - Server reveals the CID publicly only while status = "released". Until
 *    then, anyone with the URL fragment K still cannot reach the ciphertext
 *    because the public status endpoint hides the CID.
 *  - After release, the page becomes a public Drop-style URL: anyone with
 *    `/sleeper/[id]#[K]` can decrypt.
 *  - The owner can re-seal (revoke). This flips the public CID back to null.
 *    Note: anyone who already saw the CID can still pull from IPFS — the
 *    server-side gate is best-effort, not a cryptographic guarantee.
 *
 * The envelope is identical in shape to Drop: it wraps content + metadata
 * (filename, mime type, original size) so the recipient's browser can
 * present it correctly after decryption.
 */

const ENVELOPE_VERSION = 1;

export type SleeperEnvelope = {
  v: number;
  filename: string;
  mimeType: string;
  size: number;
  data: string; // base64url of plaintext bytes
};

export type CreatedSleeper = {
  id: string;
  cid: string;
  key: string; // base64url
  size: number; // ciphertext size
};

export type OpenedSleeper =
  | { kind: "asleep" }
  | { kind: "revoked" }
  | {
      kind: "released";
      filename: string;
      mimeType: string;
      bytes: Uint8Array;
      releasedAt: string | null;
    };

function envelopeToBytes(env: SleeperEnvelope): Uint8Array {
  return utf8Encode(JSON.stringify(env));
}

function bytesToEnvelope(bytes: Uint8Array): SleeperEnvelope {
  const json = new TextDecoder().decode(bytes);
  const parsed = JSON.parse(json) as SleeperEnvelope;
  if (parsed.v !== ENVELOPE_VERSION) {
    throw new Error(`unsupported sleeper envelope version: ${parsed.v}`);
  }
  return parsed;
}

/**
 * AAD bound to every Sleeper ciphertext. Authenticates the envelope version
 * so a forged envelope claiming a different mode (or a downgrade attack)
 * fails to decrypt rather than silently producing garbage.
 */
export function sleeperAad(): Uint8Array {
  return utf8Encode(`hermetic:sleeper:v=${ENVELOPE_VERSION}`);
}

/**
 * Encrypt-then-upload the envelope and register the sleeper on the server.
 * Returns the new sleeper id, the IPFS CID, and the URL-safe key for the
 * fragment of the share URL.
 */
export async function createSleeper(file: File): Promise<CreatedSleeper> {
  const plaintext = new Uint8Array(await file.arrayBuffer());
  const envelope: SleeperEnvelope = {
    v: ENVELOPE_VERSION,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    size: plaintext.length,
    data: bytesToBase64Url(plaintext),
  };

  const key = await generateSymmetricKey();
  const aad = sleeperAad();
  const ciphertext = await encryptBytes(key, envelopeToBytes(envelope), aad);

  // Snapshot the key into base64url so we can wipe the raw bytes from
  // memory before going to the network. The base64url string is what
  // gets returned for the URL fragment.
  const keyBase64Url = bytesToBase64Url(key);
  const sodium = await getSodium();
  sodium.memzero(key);

  const { url } = await requestUploadUrl({ size: ciphertext.length });
  const { cid, size } = await uploadEncryptedBlob(
    ciphertext,
    url,
    "sleeper.bin",
  );

  const res = await fetch("/api/sleepers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cid }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err?.error === "string" ? err.error : `HTTP ${res.status}`,
    );
  }
  const { id } = (await res.json()) as { id: string };

  return { id, cid, key: keyBase64Url, size };
}

/**
 * Encrypt-then-upload a text-only sleeper.
 */
export async function createTextSleeper(text: string): Promise<CreatedSleeper> {
  const blob = new Blob([text], { type: "text/plain" });
  const file = new File([blob], "message.txt", { type: "text/plain" });
  return createSleeper(file);
}

/**
 * Fetch the sleeper's public status. If released, fetch the ciphertext from
 * IPFS and decrypt with the URL-fragment key. Otherwise return a sleeping or
 * revoked marker — the server will not reveal the CID in those states.
 */
export async function openSleeper(opts: {
  id: string;
  keyB64Url: string;
}): Promise<OpenedSleeper> {
  const statusRes = await fetch(`/api/sleepers/${opts.id}/status`, {
    method: "GET",
    cache: "no-store",
  });
  if (!statusRes.ok) {
    throw new Error(`openSleeper: status returned ${statusRes.status}`);
  }
  const body = (await statusRes.json()) as {
    status: "asleep" | "released" | "revoked";
    cid: string | null;
    releasedAt: string | null;
  };

  if (body.status !== "released") {
    return { kind: body.status };
  }
  if (!body.cid) {
    throw new Error("openSleeper: released sleeper has no CID");
  }

  const key = base64UrlToBytes(opts.keyB64Url);
  const res = await fetch(gatewayUrl(body.cid));
  if (!res.ok) {
    throw new Error(`openSleeper: gateway returned ${res.status}`);
  }
  const ciphertext = new Uint8Array(await res.arrayBuffer());
  const aad = sleeperAad();
  const plaintext = await decryptBytes(key, ciphertext, aad);
  const envelope = bytesToEnvelope(plaintext);

  // Wipe the key bytes once we've decrypted. The plaintext is left to the
  // caller (it's their decoded payload).
  const sodium = await getSodium();
  sodium.memzero(key);

  return {
    kind: "released",
    filename: envelope.filename,
    mimeType: envelope.mimeType,
    bytes: base64UrlToBytes(envelope.data),
    releasedAt: body.releasedAt,
  };
}
