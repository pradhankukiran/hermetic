import { createPublicClient, http, type PublicClient } from "viem";
import { mainnet } from "viem/chains";

/**
 * Thin wrapper around viem's PublicClient for read-only EVM chain access.
 *
 * Usage in Beacon mode is intentionally narrow: we only ever call
 * `getBlockNumber()` and `getBlock({ blockNumber })`. The client is reused
 * across calls so we don't pay the construction cost on every poll.
 *
 * The default RPC is whatever viem's `mainnet` definition ships with
 * (`https://eth.merkle.io` at the time of writing). To swap in a private RPC
 * (Alchemy, Infura, your own node), set `BEACON_RPC_URL` in the environment.
 * The `NEXT_PUBLIC_BEACON_RPC_URL` variant is honored when running in the
 * browser so client-side polling can hit the same endpoint as the server.
 *
 * Why a single mainnet helper rather than a multi-chain factory? Beacon v1
 * supports exactly one chain — Ethereum mainnet (chainId=1). Adding more
 * chains is a future scope expansion, not a v1 concern.
 */

let cached: PublicClient | null = null;

function rpcUrl(): string | undefined {
  // Prefer the public-prefixed variant in the browser; fall back to the
  // server-only variant when running in Node (e.g. in API routes / tests).
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_BEACON_RPC_URL;
  }
  return process.env.BEACON_RPC_URL ?? process.env.NEXT_PUBLIC_BEACON_RPC_URL;
}

export function getMainnetClient(): PublicClient {
  if (cached) return cached;
  const url = rpcUrl();
  cached = createPublicClient({
    chain: mainnet,
    // `undefined` lets viem fall back to the chain's default RPC list.
    transport: url ? http(url) : http(),
  });
  return cached;
}

/**
 * Visible for testing — drop the cached client so a test can install a fresh
 * one (or so a different env var value gets picked up between tests).
 */
export function _resetMainnetClientForTesting(): void {
  cached = null;
}
