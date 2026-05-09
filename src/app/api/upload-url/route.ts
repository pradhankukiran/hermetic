import type { NextRequest } from "next/server";

import { getPinata } from "@/lib/ipfs/pinata";

/**
 * POST /api/upload-url
 *
 * Mints a short-lived Pinata signed upload URL. The browser uploads
 * encrypted blobs *directly* to Pinata using this URL — server-side
 * Pinata JWT never leaves the server.
 *
 * Body:
 *   { size?: number; mimeType?: string }
 *
 * Response:
 *   { url: string; expiresAt: number }
 *
 * Limits enforced server-side: 100 MiB max, application/octet-stream only.
 * The signed URL itself expires in 60 seconds.
 */

const MAX_BYTES = 100 * 1024 * 1024;
const ALLOWED_MIME = "application/octet-stream";
const EXPIRES_SECONDS = 60;

export async function POST(req: NextRequest) {
  let body: { size?: unknown; mimeType?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // Empty/invalid body is fine — defaults apply.
  }

  const requestedSize = typeof body.size === "number" ? body.size : MAX_BYTES;
  if (!Number.isFinite(requestedSize) || requestedSize <= 0) {
    return Response.json({ error: "invalid size" }, { status: 400 });
  }
  if (requestedSize > MAX_BYTES) {
    return Response.json(
      { error: `file exceeds max size of ${MAX_BYTES} bytes` },
      { status: 413 },
    );
  }

  const requestedMime =
    typeof body.mimeType === "string" ? body.mimeType : ALLOWED_MIME;
  if (requestedMime !== ALLOWED_MIME) {
    return Response.json(
      { error: `mimeType must be ${ALLOWED_MIME}` },
      { status: 400 },
    );
  }

  try {
    const pinata = getPinata();
    const url = await pinata.upload.public.createSignedURL({
      expires: EXPIRES_SECONDS,
      maxFileSize: requestedSize,
      mimeTypes: [ALLOWED_MIME],
    });
    return Response.json({
      url,
      expiresAt: Date.now() + EXPIRES_SECONDS * 1000,
    });
  } catch (error) {
    console.error("[upload-url]", error);
    return Response.json(
      { error: "failed to mint upload URL" },
      { status: 500 },
    );
  }
}
