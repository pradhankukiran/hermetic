import { afterEach, describe, expect, it, vi } from "vitest";

import { utf8Decode } from "@/lib/crypto";

// Mock the IPFS upload pipeline: capture the encrypted envelope bytes that
// the upload helper would send to Pinata, and stash them under a fake CID
// that the gateway-fetch mock can later return.
const stored = new Map<string, Uint8Array>();
let nextCid = 0;

vi.mock("@/lib/ipfs/upload", () => ({
  requestUploadUrl: vi.fn(async () => ({
    url: "https://example.invalid/upload",
    expiresAt: Date.now() + 60_000,
  })),
  uploadEncryptedBlob: vi.fn(async (bytes: Uint8Array) => {
    const cid = `bafy-test-${nextCid++}`;
    stored.set(cid, new Uint8Array(bytes));
    return { cid, size: bytes.byteLength };
  }),
}));

vi.mock("@/lib/ipfs/gateway", () => ({
  gatewayUrl: (cid: string) => `https://gateway.test/ipfs/${cid}`,
}));

afterEach(() => {
  stored.clear();
  nextCid = 0;
  vi.restoreAllMocks();
});

// Import AFTER the mocks are registered so the module under test resolves
// to the mocked IPFS helpers.
const { buildPact, unlockPactClientSide } = await import("./pact");

function makeFile(text: string, name = "msg.txt", type = "text/plain"): File {
  return new File([new Blob([text], { type })], name, { type });
}

function fetchFromStored(): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const cid = url.split("/").pop() ?? "";
    const bytes = stored.get(cid);
    if (!bytes) {
      return new Response("not found", { status: 404 });
    }
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    return new Response(buffer, { status: 200 });
  }) as typeof fetch;
}

describe("pact mode (round-trip)", () => {
  it("buildPact + unlockPactClientSide round-trips a 3-party text pact", async () => {
    const parties = [
      { email: "a@example.com" },
      { email: "b@example.com" },
      { email: "c@example.com" },
    ];
    const plan = await buildPact({
      file: makeFile("treaty signed by all"),
      parties,
    });
    expect(plan.partyCountN).toBe(parties.length);
    expect(plan.parties).toHaveLength(parties.length);
    expect(plan.cid).toMatch(/^bafy-test-/);

    vi.stubGlobal("fetch", fetchFromStored());

    const decoded = await unlockPactClientSide({
      cid: plan.cid,
      shareStrings: plan.parties.map((p) => p.shareBase64Url),
    });
    expect(decoded.filename).toBe("msg.txt");
    expect(decoded.mimeType).toBe("text/plain");
    expect(utf8Decode(decoded.bytes)).toBe("treaty signed by all");
  });
});
