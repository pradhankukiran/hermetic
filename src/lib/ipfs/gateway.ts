/**
 * Public IPFS gateway helpers usable from the browser.
 *
 * We use the Pinata gateway configured for this project as the primary
 * gateway. Public IPFS gateways like ipfs.io are kept as fallbacks because
 * Pinata has higher reliability and CORS is consistently enabled there.
 */

const FALLBACK_GATEWAYS = [
  "https://ipfs.io/ipfs",
  "https://cloudflare-ipfs.com/ipfs",
  "https://dweb.link/ipfs",
];

export function gatewayUrl(cid: string): string {
  const configured = process.env.NEXT_PUBLIC_PINATA_GATEWAY;
  if (configured) {
    const host = configured.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}/ipfs/${cid}`;
  }
  return `${FALLBACK_GATEWAYS[0]}/${cid}`;
}

export function fallbackGatewayUrls(cid: string): string[] {
  return FALLBACK_GATEWAYS.map((g) => `${g}/${cid}`);
}
