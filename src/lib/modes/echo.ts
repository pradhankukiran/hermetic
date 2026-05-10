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
  DRAND_CHAIN_HASH,
  dateForRound,
  roundForDate,
  timelockDecryptString,
  timelockEncryptBytes,
} from "@/lib/crypto/timelock";
import { gatewayUrl } from "@/lib/ipfs/gateway";
import { requestUploadUrl, uploadEncryptedBlob } from "@/lib/ipfs/upload";

/**
 * Echo mode — sealed-bid auction.
 *
 *   Auction metadata (title, description, closesAt → drand round) lives
 *   server-side in the `echoes` table. There is NO content envelope for
 *   the auction itself.
 *
 *   Each bid is its own envelope:
 *
 *     bidContent --[XChaCha20-Poly1305 Kbid]--> ciphertext
 *                Kbid --[tlock(round)]--> tlockedKey
 *
 *   Every bid in the same auction is encrypted to the SAME drand round.
 *   When the round arrives, anyone can fetch the auction page and decrypt
 *   every bid simultaneously — that's the "echo": all sealed payloads
 *   resonate at once. No party (not the auctioneer, not Hermetic, not
 *   the bidders themselves) can peek at any bid before close.
 *
 * The AAD binds the auction id into each bid ciphertext so a bid envelope
 * cannot be lifted from one auction and replayed under another auction
 * that shares the same drand round.
 */

const ENVELOPE_VERSION = 1;

export type EchoBidEnvelope = {
  v: number;
  auctionId: string;
  tlockedKey: string;
  ciphertext: string; // base64url
  bidderName: string;
  submittedAt: string; // ISO timestamp (client clock, advisory only)
  drandRound: number;
  drandChainHash: string;
};

export type CreatedAuction = {
  id: string;
  closesAt: Date;
  drandRound: number;
  drandChainHash: string;
};

export type SubmittedBid = {
  cid: string;
  bidderName: string;
  drandRound: number;
};

export type AuctionHeader = {
  id: string;
  title: string;
  description: string;
  closesAt: Date;
  drandRound: number;
  drandChainHash: string;
  createdAt: Date;
  bids: { cid: string; bidderName: string; submittedAt: Date }[];
};

export type OpenedBid = {
  bidderName: string;
  submittedAt: Date;
  text: string; // every bid is text content for v1
};

function envelopeBytes(env: EchoBidEnvelope): Uint8Array {
  return utf8Encode(JSON.stringify(env));
}

function parseEnvelope(bytes: Uint8Array): EchoBidEnvelope {
  const env = JSON.parse(utf8Decode(bytes)) as EchoBidEnvelope;
  if (env.v !== ENVELOPE_VERSION) {
    throw new Error(`unsupported echo bid envelope version: ${env.v}`);
  }
  return env;
}

/**
 * AAD for every Echo bid ciphertext. Authenticates envelope version,
 * auction id, drand round, and chain hash. A bid lifted from auction A
 * cannot be replayed under auction B (different id) even if both share
 * the same drand round, and a forged envelope claiming a different chain
 * cannot be silently substituted.
 */
function echoBidAad(
  auctionId: string,
  round: number,
  chainHash: string,
): Uint8Array {
  return utf8Encode(
    `hermetic:echo-bid:v=${ENVELOPE_VERSION}:auction=${auctionId}:round=${round}:chain=${chainHash}`,
  );
}

/**
 * Create a new auction on the server. The drand round is computed from
 * the chosen close time client-side (so we can show it back to the user
 * immediately), but the server is the source of truth for the round
 * stored in the DB — `POST /api/echoes` re-derives it from `closesAt`.
 */
export async function createAuction(opts: {
  title: string;
  description: string;
  closesAt: Date;
}): Promise<CreatedAuction> {
  if (opts.closesAt.getTime() <= Date.now()) {
    throw new Error("closesAt must be in the future");
  }
  if (!opts.title.trim()) throw new Error("title required");
  if (!opts.description.trim()) throw new Error("description required");

  const res = await fetch("/api/echoes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: opts.title.trim(),
      description: opts.description.trim(),
      closesAt: opts.closesAt.toISOString(),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `createAuction: ${res.status} ${err?.error ?? "failed"}`,
    );
  }
  const data = (await res.json()) as {
    id: string;
    closesAt: string;
    drandRound: number;
    drandChainHash: string;
  };
  return {
    id: data.id,
    closesAt: new Date(data.closesAt),
    drandRound: data.drandRound,
    drandChainHash: data.drandChainHash,
  };
}

/**
 * Encrypt + upload a single bid for an auction, then register the
 * resulting CID with the server. The auction id, drand round, and chain
 * hash are bound into AAD so the envelope cannot be replayed elsewhere.
 *
 * `bidText` is the bid content (price, terms, anything). For v1 every
 * bid is text — files can be added later without changing the envelope
 * shape.
 */
export async function submitBid(opts: {
  auctionId: string;
  drandRound: number;
  bidderName: string;
  bidText: string;
}): Promise<SubmittedBid> {
  const bidderName = opts.bidderName.trim();
  const bidText = opts.bidText.trim();
  if (!bidderName) throw new Error("bidder name required");
  if (!bidText) throw new Error("bid text required");

  const plaintext = utf8Encode(bidText);
  const key = await generateSymmetricKey();
  const aad = echoBidAad(opts.auctionId, opts.drandRound, DRAND_CHAIN_HASH);
  const ciphertext = await encryptBytes(key, plaintext, aad);
  const tlockedKey = await timelockEncryptBytes(key, opts.drandRound);

  // Wipe the symmetric key from memory before any further awaits.
  const sodium = await getSodium();
  sodium.memzero(key);

  const submittedAt = new Date().toISOString();
  const envelope: EchoBidEnvelope = {
    v: ENVELOPE_VERSION,
    auctionId: opts.auctionId,
    tlockedKey,
    ciphertext: bytesToBase64Url(ciphertext),
    bidderName,
    submittedAt,
    drandRound: opts.drandRound,
    drandChainHash: DRAND_CHAIN_HASH,
  };

  const envelopeBlob = envelopeBytes(envelope);
  const { url } = await requestUploadUrl({ size: envelopeBlob.length });
  const { cid } = await uploadEncryptedBlob(envelopeBlob, url, "echo-bid.bin");

  // Register the CID with the auction. The server enforces that we are
  // still before close before accepting the row.
  const res = await fetch(`/api/echoes/${opts.auctionId}/bids`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cid, bidderName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`submitBid: ${res.status} ${err?.error ?? "failed"}`);
  }

  return { cid, bidderName, drandRound: opts.drandRound };
}

/**
 * Try to open a single bid envelope from IPFS. Returns null if the drand
 * round has not yet been emitted (the caller should treat this as "not
 * ready yet" and try again after the close time). Throws on a malformed
 * envelope, a chain-hash mismatch, or any AEAD failure — those are not
 * recoverable.
 */
export async function openBid(
  bidCid: string,
  expectedAuctionId?: string,
): Promise<OpenedBid | null> {
  const res = await fetch(gatewayUrl(bidCid));
  if (!res.ok) throw new Error(`gateway returned ${res.status}`);
  const envelopeData = new Uint8Array(await res.arrayBuffer());
  const envelope = parseEnvelope(envelopeData);

  if (envelope.drandChainHash !== DRAND_CHAIN_HASH) {
    throw new Error(
      `echo bid chain hash mismatch: expected ${DRAND_CHAIN_HASH}, got ${envelope.drandChainHash}`,
    );
  }
  if (
    expectedAuctionId != null &&
    envelope.auctionId !== expectedAuctionId
  ) {
    throw new Error(
      `echo bid auction mismatch: expected ${expectedAuctionId}, got ${envelope.auctionId}`,
    );
  }

  let key: Uint8Array;
  try {
    key = await timelockDecryptString(envelope.tlockedKey);
  } catch (err) {
    // tlock-js throws when the round hasn't been signed yet. We treat
    // any tlock-decrypt failure pre-close as "not ready" so the UI can
    // wait and retry; post-close it would still fail (and propagate)
    // since the round signature must exist before this point.
    const message = err instanceof Error ? err.message : String(err);
    if (
      /round/i.test(message) ||
      /not yet/i.test(message) ||
      /unavailable/i.test(message)
    ) {
      return null;
    }
    throw err;
  }

  const ciphertext = base64UrlToBytes(envelope.ciphertext);
  const aad = echoBidAad(
    envelope.auctionId,
    envelope.drandRound,
    envelope.drandChainHash,
  );
  const plaintext = await decryptBytes(key, ciphertext, aad);

  return {
    bidderName: envelope.bidderName,
    submittedAt: new Date(envelope.submittedAt),
    text: utf8Decode(plaintext),
  };
}

/**
 * Fetch auction header + registered bid CIDs from the server. The server
 * returns plaintext bid CIDs and bidder names but never anything that
 * lets the caller decrypt before the close round arrives.
 */
export async function fetchAuctionHeader(
  auctionId: string,
): Promise<AuctionHeader> {
  const res = await fetch(`/api/echoes/${auctionId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `fetchAuctionHeader: ${res.status} ${err?.error ?? "failed"}`,
    );
  }
  const data = (await res.json()) as {
    id: string;
    title: string;
    description: string;
    closesAt: string;
    drandRound: number;
    drandChainHash: string;
    createdAt: string;
    bids: { cid: string; bidderName: string; submittedAt: string }[];
  };
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    closesAt: new Date(data.closesAt),
    drandRound: data.drandRound,
    drandChainHash: data.drandChainHash,
    createdAt: new Date(data.createdAt),
    bids: data.bids.map((b) => ({
      cid: b.cid,
      bidderName: b.bidderName,
      submittedAt: new Date(b.submittedAt),
    })),
  };
}

// Exported for tests / advanced callers that want to compute the drand
// round client-side ahead of `createAuction`.
export { roundForDate, dateForRound, DRAND_CHAIN_HASH };
