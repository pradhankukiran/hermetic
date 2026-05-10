import { afterEach, describe, expect, it, vi } from "vitest";

const MOCK_HEIGHT = BigInt(19_000_000);

// Mock the chain client BEFORE importing the module under test so the cached
// public client is never reached.
vi.mock("@/lib/chain/viem", () => {
  return {
    getMainnetClient: () => ({
      getBlockNumber: async () => MOCK_HEIGHT,
    }),
    _resetMainnetClientForTesting: () => {},
  };
});

import { getCurrentBlockHeight } from "./beacon";

describe("beacon.getCurrentBlockHeight", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a bigint matching the mocked client", async () => {
    const height = await getCurrentBlockHeight();
    expect(typeof height).toBe("bigint");
    expect(height).toBe(MOCK_HEIGHT);
  });
});
