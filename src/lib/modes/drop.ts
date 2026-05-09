import {
  bytesToBase64Url,
  base64UrlToBytes,
  decryptBytes,
  encryptBytes,
  generateSymmetricKey,
  utf8Encode,
} from "@/lib/crypto";
import { requestUploadUrl, uploadEncryptedBlob } from "@/lib/ipfs/upload";

/**
 * Drop mode — encrypt-then-upload, with the decryption key returned to the
 * caller for inclusion in the share URL fragment.
 *
 * Threat model:
 *  - Server never sees the key (only the CID and the upload size).
 *  - Pinata never sees the plaintext (only the encrypted blob).
 *  - Anyone with the CID + key can decrypt. The key lives in the URL
 *    fragment, which by spec is never sent in HTTP requests.
 *
 * The "envelope" wraps content + metadata (filename, mime type, original
 * size) so the recipient's browser can present it correctly after decryption.
 */

const ENVELOPE_VERSION = 1;

export type DropEnvelope = {
  v: number;
  filename: string;
  mimeType: string;
  size: number;
  data: string; // base64url of plaintext bytes
};

export type CreatedDrop = {
  cid: string;
  key: string; // base64url
  size: number; // ciphertext size
};

export type OpenedDrop = {
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
};

function envelopeToBytes(env: DropEnvelope): Uint8Array {
  return utf8Encode(JSON.stringify(env));
}

function bytesToEnvelope(bytes: Uint8Array): DropEnvelope {
  const json = new TextDecoder().decode(bytes);
  const parsed = JSON.parse(json) as DropEnvelope;
  if (parsed.v !== ENVELOPE_VERSION) {
    throw new Error(`unsupported drop envelope version: ${parsed.v}`);
  }
  return parsed;
}

/**
 * AAD bound to every Drop ciphertext. Authenticates the envelope version so
 * downgrade or cross-mode confusion attacks fail at decrypt time rather than
 * silently producing garbage. AAD is authenticated but not encrypted.
 */
function dropAad(): Uint8Array {
  return utf8Encode(`hermetic:drop:v=${ENVELOPE_VERSION}`);
}

/**
 * Encrypt + upload a file. Returns the CID and the URL-safe key for the
 * share URL fragment.
 */
export async function createDrop(
  file: File,
): Promise<CreatedDrop> {
  const plaintext = new Uint8Array(await file.arrayBuffer());
  const envelope: DropEnvelope = {
    v: ENVELOPE_VERSION,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    size: plaintext.length,
    data: bytesToBase64Url(plaintext),
  };

  const key = await generateSymmetricKey();
  const aad = dropAad();
  const ciphertext = await encryptBytes(key, envelopeToBytes(envelope), aad);

  const { url } = await requestUploadUrl({ size: ciphertext.length });
  const { cid, size } = await uploadEncryptedBlob(ciphertext, url);

  return {
    cid,
    key: bytesToBase64Url(key),
    size,
  };
}

/**
 * Encrypt + upload arbitrary text (used for "paste a message" drops).
 */
export async function createTextDrop(text: string): Promise<CreatedDrop> {
  const blob = new Blob([text], { type: "text/plain" });
  const file = new File([blob], "message.txt", { type: "text/plain" });
  return createDrop(file);
}

/**
 * Fetch a drop's ciphertext from the IPFS gateway and decrypt it with the
 * key that came in via the URL fragment.
 *
 * `gatewayUrl` is the gateway's `/ipfs/[cid]` URL.
 */
export async function openDrop(
  gatewayUrl: string,
  keyBase64Url: string,
): Promise<OpenedDrop> {
  const key = base64UrlToBytes(keyBase64Url);
  const res = await fetch(gatewayUrl);
  if (!res.ok) {
    throw new Error(`openDrop: gateway returned ${res.status}`);
  }
  const ciphertext = new Uint8Array(await res.arrayBuffer());
  const aad = dropAad();
  const plaintext = await decryptBytes(key, ciphertext, aad);
  const envelope = bytesToEnvelope(plaintext);
  return {
    filename: envelope.filename,
    mimeType: envelope.mimeType,
    bytes: base64UrlToBytes(envelope.data),
  };
}
