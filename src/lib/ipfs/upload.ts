import { PinataSDK } from "pinata";

/**
 * Browser-side upload helpers.
 *
 * Flow:
 *   1. The browser asks the server for a short-lived signed URL.
 *   2. The browser uploads the (already encrypted) blob *directly* to Pinata
 *      using that URL — server bandwidth is never used for the file body.
 *   3. Pinata returns a CID (content hash). That CID is the address of the
 *      ciphertext on IPFS.
 *
 * No PINATA_JWT is needed in the browser — the signed URL carries the
 * necessary auth. We initialize PinataSDK without `pinataJwt` here.
 */

let cached: PinataSDK | null = null;

function getBrowserPinata(): PinataSDK {
  if (cached) return cached;
  const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY;
  if (!gateway) {
    // We don't actually need the gateway for upload, but the SDK constructor
    // accepts it and we'll need it for retrieval.
    cached = new PinataSDK({ pinataGateway: "" });
  } else {
    cached = new PinataSDK({ pinataGateway: gateway });
  }
  return cached;
}

export type SignedUploadUrl = {
  url: string;
  expiresAt: number;
};

export async function requestUploadUrl(opts: {
  size: number;
}): Promise<SignedUploadUrl> {
  const res = await fetch("/api/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      size: opts.size,
      mimeType: "application/octet-stream",
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `requestUploadUrl: ${res.status} ${err?.error ?? "failed"}`,
    );
  }
  return (await res.json()) as SignedUploadUrl;
}

export type UploadResult = {
  cid: string;
  size: number;
};

/**
 * Upload an opaque ciphertext blob to Pinata using a signed URL.
 * The bytes are application/octet-stream — there's nothing useful to inspect.
 */
export async function uploadEncryptedBlob(
  ciphertext: Uint8Array,
  signedUrl: string,
  filename = "blob.bin",
): Promise<UploadResult> {
  const pinata = getBrowserPinata();
  const file = new File([ciphertext], filename, {
    type: "application/octet-stream",
  });
  const result = await pinata.upload.public.file(file).url(signedUrl);
  if (!result?.cid) {
    throw new Error("uploadEncryptedBlob: no CID returned from Pinata");
  }
  return {
    cid: result.cid,
    size: file.size,
  };
}
