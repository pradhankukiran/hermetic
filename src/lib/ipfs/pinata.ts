import "server-only";

import { PinataSDK } from "pinata";

/**
 * Server-side Pinata client.
 *
 * IMPORTANT: this module must NEVER be imported from a Client Component.
 * The `import "server-only"` at the top will surface that as a build error.
 *
 * The browser uploads ciphertext directly to Pinata via short-lived signed
 * URLs minted here; the JWT never leaves the server.
 */

let cached: PinataSDK | null = null;

export function getPinata(): PinataSDK {
  if (cached) return cached;

  const jwt = process.env.PINATA_JWT;
  const gateway = process.env.PINATA_GATEWAY;
  if (!jwt) {
    throw new Error("PINATA_JWT is not set");
  }
  if (!gateway) {
    throw new Error("PINATA_GATEWAY is not set");
  }

  cached = new PinataSDK({
    pinataJwt: jwt,
    pinataGateway: gateway,
  });
  return cached;
}

/**
 * Public IPFS gateway URL for a given CID. We use the configured Pinata
 * gateway because (a) it's reliable and (b) public IPFS gateways often
 * rate-limit or strip CORS.
 *
 * The retrieved bytes are still ciphertext — the gateway sees only encrypted
 * data — so a public-gateway URL is fine for sharing.
 */
export function publicGatewayUrl(cid: string): string {
  const gateway = process.env.PINATA_GATEWAY;
  if (!gateway) {
    throw new Error("PINATA_GATEWAY is not set");
  }
  const host = gateway.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${host}/ipfs/${cid}`;
}
