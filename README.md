<div align="center">

<img src=".github/banner.svg" alt="Hermetic — sealed envelopes for the internet" width="100%" />

<br /><br />

**End-to-end encrypted. Zero-knowledge. Decentralized.**
A single app with **ten** ways to seal something — by link, by time, by trust, by consensus, by hardware, by event, by reveal, by command, by mutual disclosure, by proof — built so even Hermetic itself cannot read what you seal.

<br />

[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19-000000?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-000000?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4-000000?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-base--nova-000000?style=for-the-badge&logo=shadcnui&logoColor=white)](https://ui.shadcn.com)

[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-000000?style=for-the-badge&logo=drizzle&logoColor=white)](https://orm.drizzle.team)
[![Neon Postgres](https://img.shields.io/badge/Neon-Postgres-000000?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![Vitest](https://img.shields.io/badge/Vitest-80%2F80-000000?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev)

[![libsodium](https://img.shields.io/badge/libsodium-XChaCha20--Poly1305-000000?style=for-the-badge&logoColor=white)](https://libsodium.gitbook.io)
[![Argon2id](https://img.shields.io/badge/Argon2id-RFC%209106-000000?style=for-the-badge&logoColor=white)](https://datatracker.ietf.org/doc/html/rfc9106)
[![Shamir SSS](https://img.shields.io/badge/Shamir-GF(256)-000000?style=for-the-badge&logoColor=white)](https://en.wikipedia.org/wiki/Shamir%27s_secret_sharing)
[![Schnorr](https://img.shields.io/badge/Schnorr-secp256k1-000000?style=for-the-badge&logoColor=white)](https://en.wikipedia.org/wiki/Schnorr_signature)
[![drand](https://img.shields.io/badge/drand-quicknet-000000?style=for-the-badge&logoColor=white)](https://drand.love)
[![WebAuthn PRF](https://img.shields.io/badge/WebAuthn-PRF-000000?style=for-the-badge&logoColor=white)](https://w3c.github.io/webauthn/#prf-extension)
[![viem](https://img.shields.io/badge/viem-EVM%20RPC-000000?style=for-the-badge&logoColor=white)](https://viem.sh)
[![IPFS](https://img.shields.io/badge/IPFS-via%20Pinata-000000?style=for-the-badge&logo=ipfs&logoColor=white)](https://www.pinata.cloud)
[![License MIT](https://img.shields.io/badge/License-MIT-000000?style=for-the-badge&logoColor=white)](./LICENSE)

</div>

<br />

## Ten modes. Same encryption.

Same crypto skeleton everywhere — random symmetric key encrypts the content with AAD-bound XChaCha20-Poly1305. The **policy** decides how that key gets re-derived. Every mode just plugs in a different `wrapKey` / `unwrapKey` strategy.

| Mode | Tagline | Unlock condition |
|------|---------|------------------|
| **Drop** | _Sealed by link_ | The decryption key lives in the URL fragment. Anyone with the link decrypts; the server never sees the key. |
| **Capsule** | _Sealed by time_ | Decrypts only after the chosen drand quicknet round arrives. Nobody — not us, not the recipient, not any drand operator alone — can open it early. |
| **Switch** | _Sealed by trust_ | Dead-man's switch. Key is Shamir-split among `N` trustees; if the owner goes silent past the deadline, any `K` trustees can combine and unlock. |
| **Pact** | _Sealed by consensus_ | `N`-of-`N` agreement. Every party must combine their share — no quorum slack, no fallback. |
| **Halo** | _Sealed by hardware_ | Wrapped under a WebAuthn PRF-derived KEK. Only the device with the registered passkey can unlock. |
| **Beacon** | _Sealed by event_ | UI gated on an EVM block height (chain decides _when_) plus an owner passphrase (decides _who_). |
| **Echo** | _Sealed by reveal_ | Sealed-bid auction. Bidders submit content tlock-encrypted to a shared close round; every bid opens at the same instant. |
| **Sleeper** | _Sealed by command_ | Sits encrypted indefinitely. Unlocks the moment the owner clicks release; can be re-sealed at any time. |
| **Mirror** | _Sealed by mutual disclosure_ | 2-of-2 Shamir. Two halves, two holders. Neither opens alone — both must combine. |
| **Sigil** | _Sealed by proof_ | Argon2id-wrapped key derivable only from the right witness. Stub Schnorr proof primitives ship for the v2 server-blind upgrade. |

The whole product lives in the moment between "I sealed this" and "now it's unlockable." Hermetic gives you ten different rules for what makes that moment arrive.

<br />

## How it works

- **End-to-end encrypted** — every byte of content is encrypted in the browser before it touches the network. The server never sees plaintext.
- **Zero-knowledge** — the server holds ciphertext, CIDs, hashed identifiers, and operational timestamps. Never keys. Never content.
- **Decentralized storage** — encrypted blobs live on **IPFS** (pinned via Pinata). Vercel hosts the orchestration; Vercel cannot decrypt anything.
- **No homemade crypto** — every primitive is a thin wrapper over an audited library. AAD-bound envelopes prevent cross-mode and version-downgrade attacks across all ten modes.

A long-form architecture and threat-model writeup is at [`/how-it-works`](./src/app/how-it-works/page.tsx) when running locally, or in:

- [`docs/threat-model.md`](./docs/threat-model.md) — adversaries A–G, what we protect, what we don't, residual risks.
- [`docs/crypto.md`](./docs/crypto.md) — every algorithm, why it was chosen, where it lives.

<br />

## Stack

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 16 (App Router) · React 19 · shadcn/ui · Tailwind v4 · Lucide icons |
| **Crypto** | libsodium (XChaCha20-Poly1305) · `@noble/hashes` (Argon2id, SHA-256) · `@noble/curves` (Schnorr secp256k1) · `tlock-js` (drand quicknet) · `shamir-secret-sharing` · `@simplewebauthn/server` + `@simplewebauthn/browser` (Halo PRF) |
| **Chain** | `viem` (EVM JSON-RPC reads — Beacon's block-height gate) |
| **Storage** | IPFS via **Pinata** · Postgres via **Neon** |
| **Auth** | Magic-link via **Resend** · HS256 JWT in HttpOnly cookie · CSRF same-origin checks |
| **Hosting** | Vercel + Vercel Cron for Switch heartbeat checks |
| **Tooling** | Drizzle ORM · Vitest (80 tests) · ESLint 9 · TypeScript strict |

<br />

## Local development

```bash
git clone https://github.com/pradhankukiran/hermetic
cd hermetic
cp .env.example .env.local
# Fill in DATABASE_URL, PINATA_JWT, PINATA_GATEWAY,
# NEXT_PUBLIC_PINATA_GATEWAY, RESEND_API_KEY, RESEND_FROM_EMAIL,
# AUTH_SECRET (openssl rand -base64 32), CRON_SECRET, NEXT_PUBLIC_APP_URL.
# Optional: BEACON_RPC_URL for Beacon (defaults to a public mainnet RPC).
npm install
npm run db:migrate     # applies the consolidated schema (5 base tables + 8 mode tables)
npm run dev
```

Open `http://localhost:3000`.

### Tests

```bash
npm test               # 80 tests across all crypto primitives + envelope AAD binding
```

Coverage: XChaCha20-Poly1305 round-trip, AAD-binding rejection (cross-mode + version-downgrade), Argon2id determinism + uniqueness, SHA-256 known-vectors, Shamir K-of-N reconstruction, encoding round-trips, Schnorr proof-of-knowledge round-trips + tamper detection, every mode's seal/open envelope round-trip. Network-touching code (Pinata uploads, drand decryption, viem chain reads, WebAuthn PRF) is tested manually — those need real authenticators / oracles.

<br />

## Deploy on Vercel

1. Push the repo to GitHub.
2. Import into Vercel — it auto-detects Next.js 16.
3. Provision a **Neon Postgres** database via Vercel Marketplace; copy `DATABASE_URL`.
4. Sign up at **Pinata**, generate a JWT with `files:read,write` scope, set `PINATA_JWT` + `PINATA_GATEWAY` + `NEXT_PUBLIC_PINATA_GATEWAY`.
5. Sign up at **Resend**, verify a sending domain (or use `onboarding@resend.dev` for sandbox testing — only delivers to the email you signed up with). Set `RESEND_API_KEY` + `RESEND_FROM_EMAIL`.
6. Generate `AUTH_SECRET` and `CRON_SECRET`: `openssl rand -base64 32` (twice).
7. (Optional) Set `BEACON_RPC_URL` if you don't want to rely on the public default.
8. `npm run db:migrate` against the production `DATABASE_URL`.
9. Deploy. **Vercel Cron** is configured in `vercel.json` to call `/api/cron/heartbeat` daily.

<br />

## Project layout

```
src/
├── app/
│   ├── api/                    auth · upload-url · cron · per-mode endpoints
│   ├── auth/                   magic-link sign-in
│   ├── beacon/, capsule/,
│   │   drop/, echo/, halo/,    each mode's create page (top-level)
│   │   mirror/, pact/, sigil/,   + [cid|id]/ subroute for the open / unlock page
│   │   sleeper/, switch/
│   ├── dashboard/              owned switches / pacts / sleepers
│   ├── how-it-works/           threat-model + crypto choices page
│   └── icon.svg                theme-aware favicon (Hexagon)
├── components/
│   ├── auth/                   sign-in / sign-out
│   ├── layout/                 ModeHero · PageHeader · Watermark · ComingSoon
│   ├── modes/                  per-mode UIs (one directory per mode)
│   └── ui/                     shadcn primitives (base-ui underneath)
└── lib/
    ├── auth/                   JWT signing · session lookup · CSRF helper
    ├── chain/                  viem client (Beacon)
    ├── crypto/                 sodium · symmetric · KDF · Shamir · timelock ·
    │                            hash · random · encoding · halo-prf · schnorr
    ├── db/                     Drizzle schema + Neon HTTP client
    ├── email/                  Resend wrappers (per-mode senders)
    ├── ipfs/                   Pinata server client · browser uploader · gateways
    ├── modes/                  per-mode encrypt/wrap/open orchestration
    └── utils/                  copy-to-clipboard · format · cn
```

<br />

## Security posture

| Threat | Protection |
|--------|------------|
| Curious / malicious server operator | Sees ciphertext + minimal metadata. No keys. No content. |
| Network observer (TLS metadata only) | Already encrypted before TLS; payloads are opaque bytes. |
| Subpoena / court order | We have nothing useful to hand over — and we know that. |
| Single rogue trustee / single half / single party | Holds one Shamir share. Information-theoretically zero leakage. |
| Drand operator compromise | drand quicknet is a t-of-n threshold network; one operator cannot release rounds early. |
| Wrong-device / wrong-passkey on Halo | AEAD tag check on unwrap fails; KEK was hardware-bound to the original credential. |
| Cross-mode envelope substitution | Every mode binds a distinct AAD (`hermetic:<mode>:v=1[…]`); ciphertext from one mode cannot be decrypted as another. |
| Version downgrade | The envelope `v` field is bound into AAD; replaying a v2 ciphertext under v1 fails. |
| Lost recipient / lost share / lost passphrase | No back doors. Lost key = lost data. By design. |

**What we don't protect against** is documented honestly in [`docs/threat-model.md`](./docs/threat-model.md): a compromised browser, metadata (timestamps, sizes, hashed emails, plaintext trustee emails for re-notification, public auction titles), pre-trigger trustee collusion, Beacon's chain-anchor being a UI gate rather than an oracle, Sigil's v1 being server-side ZK only, and quantum adversaries against drand BLS pairings.

<br />

## License

MIT.

<br />

<div align="center">
<sub>Built with care for people who actually need their data sealed.</sub>
</div>
