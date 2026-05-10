import { afterEach, describe, expect, it, vi } from "vitest";

// Mock the chain client BEFORE importing the module under test so the cached
// public client is never reached.
vi.mock("@/lib/chain/viem", () => {
  return {
    getMainnetClient: () => ({
      getBlockNumber: async () => 19_000_000n,
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
    expect(height).toBe(19_000_000n);
  });
});
