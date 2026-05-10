import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Round-trip tests for Mirror mode (2-of-2 mutual reveal).
 *
 * The IPFS layer is mocked: instead of actually hitting Pinata/IPFS, we
 * stash the uploaded envelope in an in-memory map keyed by CID, and the
 * unlock path's `fetch` returns it directly. This keeps the test entirely
 * local while exercising the real crypto + Shamir code paths.
 */

const uploaded = new Map<string, Uint8Array>();
let cidCounter = 0;

vi.mock("@/lib/ipfs/upload", () => ({
  requestUploadUrl: async () => ({
    url: "mock://upload",
    expiresAt: Date.now() + 60_000,
  }),
  uploadEncryptedBlob: async (bytes: Uint8Array) => {
    const cid = `bafymock${++cidCounter}`;
    uploaded.set(cid, new Uint8Array(bytes));
    return { cid, size: bytes.byteLength };
  },
}));

vi.mock("@/lib/ipfs/gateway", () => ({
  gatewayUrl: (cid: string) => `mock://${cid}`,
  fallbackGatewayUrls: (cid: string) => [`mock://${cid}`],
}));

const originalFetch = globalThis.fetch;

beforeAll(() => {
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input.toString();
    const cid = url.replace(/^mock:\/\//, "");
    const bytes = uploaded.get(cid);
    if (!bytes) throw new Error(`mock fetch: no upload for ${cid}`);
    // Copy into a fresh ArrayBuffer so .arrayBuffer() returns clean memory.
    const buf = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buf).set(bytes);
    return new Response(buf, { status: 200 });
  }) as typeof fetch;
});

afterEach(() => {
  uploaded.clear();
  cidCounter = 0;
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

const { buildMirror, buildTextMirror, unlockMirrorClientSide } = await import(
  "./mirror"
);

describe("mirror", () => {
  it("round-trips a text payload through both halves", async () => {
    const text =
      "If you are reading this, both of us showed our cards at the same time.";
    const plan = await buildTextMirror(
      text,
      { email: "alice@example.com" },
      { email: "bob@example.com" },
    );

    expect(plan.cid).toMatch(/^bafymock/);
    expect(plan.halfA).toBeTypeOf("string");
    expect(plan.halfB).toBeTypeOf("string");
    expect(plan.halfA.length).toBeGreaterThan(0);
    expect(plan.halfB.length).toBeGreaterThan(0);
    // Two distinct halves — Shamir gives different shares to different parties.
    expect(plan.halfA).not.toEqual(plan.halfB);

    const decoded = await unlockMirrorClientSide({
      cid: plan.cid,
      halfA: plan.halfA,
      halfB: plan.halfB,
    });

    expect(decoded.filename).toBe("message.txt");
    expect(decoded.mimeType).toBe("text/plain");
    expect(new TextDecoder().decode(decoded.bytes)).toBe(text);
  });

  it("round-trips a binary file payload", async () => {
    const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const file = new File([original], "secret.bin", {
      type: "application/octet-stream",
    });
    const plan = await buildMirror({
      file,
      holderA: { email: "a@example.com" },
      holderB: { email: "b@example.com" },
    });
    const decoded = await unlockMirrorClientSide({
      cid: plan.cid,
      halfA: plan.halfA,
      halfB: plan.halfB,
    });
    expect(decoded.filename).toBe("secret.bin");
    expect(decoded.mimeType).toBe("application/octet-stream");
    expect(Array.from(decoded.bytes)).toEqual(Array.from(original));
  });

  it("halves are order-independent (A+B == B+A)", async () => {
    const plan = await buildTextMirror(
      "order does not matter",
      { email: "a@example.com" },
      { email: "b@example.com" },
    );
    const swapped = await unlockMirrorClientSide({
      cid: plan.cid,
      halfA: plan.halfB, // intentionally swapped
      halfB: plan.halfA,
    });
    expect(new TextDecoder().decode(swapped.bytes)).toBe(
      "order does not matter",
    );
  });

  it("a single half on its own carries no useful information", async () => {
    const plan = await buildTextMirror(
      "lonely",
      { email: "a@example.com" },
      { email: "b@example.com" },
    );
    // Passing the same half twice cannot reconstruct the key — combineShares
    // either rejects (deduplication) or yields a different secret. Either
    // way, decryption MUST fail.
    await expect(
      unlockMirrorClientSide({
        cid: plan.cid,
        halfA: plan.halfA,
        halfB: plan.halfA,
      }),
    ).rejects.toThrow();
  });
});
