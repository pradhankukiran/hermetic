import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the IPFS upload module so the test never touches the network.
// `requestUploadUrl` would normally hit /api/upload-url, and
// `uploadEncryptedBlob` would normally talk to Pinata via a signed URL.
vi.mock("@/lib/ipfs/upload", () => ({
  requestUploadUrl: vi.fn(async () => ({
    url: "https://uploads.example/test-signed-url",
    expiresAt: Date.now() + 60_000,
  })),
  uploadEncryptedBlob: vi.fn(async (bytes: Uint8Array) => ({
    cid: "bafkreigtest" + bytes.length.toString(16),
    size: bytes.length,
  })),
}));

// Mock the timelock wrapper. `timelockEncryptBytes` would otherwise hit
// the public drand HTTP API to fetch chain info, which (a) fails inside
// happy-dom's verification environment and (b) makes the test depend on
// live network. The real envelope shape is tested elsewhere; here we
// only care that submitBid produces the correct envelope/CID.
vi.mock("@/lib/crypto/timelock", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/crypto/timelock")>(
      "@/lib/crypto/timelock",
    );
  return {
    ...actual,
    timelockEncryptBytes: vi.fn(async () => "AGE-ENCRYPTED-FAKE-TLOCK-KEY"),
  };
});

import { submitBid } from "./echo";

describe("submitBid", () => {
  let originalFetch: typeof globalThis.fetch;
  let bidRegisterCalls: { url: string; body: unknown }[];

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    bidRegisterCalls = [];

    // Stub global fetch — submitBid only uses it for the bid-registration
    // POST (the upload module is mocked above).
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const body = init?.body ? JSON.parse(init.body as string) : null;
      bidRegisterCalls.push({ url, body });
      return new Response(
        JSON.stringify({
          id: "00000000-0000-0000-0000-000000000001",
          cid: body?.cid,
          bidderName: body?.bidderName,
          submittedAt: new Date().toISOString(),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("produces a CID and registers it with the auction", async () => {
    const result = await submitBid({
      auctionId: "11111111-1111-4111-8111-111111111111",
      drandRound: 1_000_000,
      bidderName: "Bidder #1",
      bidText: "10 ETH",
    });

    expect(result.cid).toMatch(/^bafkreig/);
    expect(result.bidderName).toBe("Bidder #1");
    expect(result.drandRound).toBe(1_000_000);

    // Confirm the registration POST went to the auction's bid endpoint
    // with the CID returned by the upload mock.
    expect(bidRegisterCalls).toHaveLength(1);
    expect(bidRegisterCalls[0].url).toBe(
      "/api/echoes/11111111-1111-4111-8111-111111111111/bids",
    );
    expect(bidRegisterCalls[0].body).toMatchObject({
      cid: result.cid,
      bidderName: "Bidder #1",
    });
  });

  it("rejects empty bidder name", async () => {
    await expect(
      submitBid({
        auctionId: "11111111-1111-4111-8111-111111111111",
        drandRound: 1_000_000,
        bidderName: "  ",
        bidText: "10 ETH",
      }),
    ).rejects.toThrow(/bidder name/i);
  });

  it("rejects empty bid text", async () => {
    await expect(
      submitBid({
        auctionId: "11111111-1111-4111-8111-111111111111",
        drandRound: 1_000_000,
        bidderName: "alice",
        bidText: "  ",
      }),
    ).rejects.toThrow(/bid text/i);
  });
});
