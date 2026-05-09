# Hermetic

> **Sealed envelopes for the internet.**
>
> End-to-end encrypted. Zero-knowledge. Decentralized storage.

Hermetic is a single app with three ways to seal something — by link, by
time, by trust — built so that even Hermetic itself cannot read what you
seal.

## Three unlock modes

- **Drop** — encrypt now, share via a link. The decryption key lives in
  the URL fragment; it is never sent to a server. The recipient pulls
  the ciphertext from IPFS and decrypts in their browser.
- **Capsule** — encrypt now, decrypt at a future date. Uses
  [drand](https://drand.love) timelock encryption. Nobody on Earth —
  not us, not the network, not the recipient — can open it early.
- **Switch** — encrypt now, decrypt only if you go silent. The key is
  split across N trustees with Shamir's Secret Sharing; if the dead-
  man's switch fires, K of them combine their shares and unlock.

The whole point of the app is the moment between "I want to seal this"
and "now it's unlockable." Hermetic gives you three different rules for
what makes that moment arrive.

## How it works

- **End-to-end encrypted** — every byte of content is encrypted in your
  browser before it touches the network. We never see plaintext.
- **Zero-knowledge** — the server holds ciphertext, CIDs, hashed
  identifiers, and operational timestamps. Never keys. Never content.
  Read [`docs/threat-model.md`](./docs/threat-model.md) for the exact
  metadata footprint.
- **Decentralized storage** — encrypted blobs live on IPFS (pinned via
  Pinata). Vercel hosts the orchestration layer; Vercel cannot decrypt
  anything.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 (App Router) · React 19 · shadcn/ui · Tailwind v4 |
| Crypto | libsodium · @noble/hashes (Argon2id, SHA-256) · tlock-js (drand) · shamir-secret-sharing |
| Storage | IPFS via Pinata · Postgres via Neon |
| Auth | Magic link (Resend) · HS256 JWT in HttpOnly cookie |
| Hosting | Vercel · Vercel Cron for heartbeat checks |

## Local development

```bash
git clone https://github.com/...
cd hermetic
cp .env.example .env.local
# Fill in DATABASE_URL, PINATA_JWT, PINATA_GATEWAY,
# NEXT_PUBLIC_PINATA_GATEWAY, RESEND_API_KEY, RESEND_FROM_EMAIL,
# AUTH_SECRET (openssl rand -base64 32), CRON_SECRET, NEXT_PUBLIC_APP_URL.
npm install
npm run db:push     # apply schema to your Postgres
npm run dev
```

Visit `http://localhost:3000`.

### Tests

```bash
npm test
```

The crypto primitives are covered by unit tests (XChaCha20-Poly1305,
Argon2id, SHA-256, Shamir SSS, encoding helpers). Network-touching
modules (Pinata uploads, drand decryption) are tested manually.

## Deploying to Vercel

1. Push the repo to GitHub.
2. Import into Vercel (it auto-detects Next.js).
3. Provision a Neon Postgres database (Vercel Marketplace) and copy
   `DATABASE_URL` into project env vars.
4. Sign up for Pinata, generate a JWT with the *Files* scope, and set
   `PINATA_JWT`, `PINATA_GATEWAY`, `NEXT_PUBLIC_PINATA_GATEWAY`.
5. Sign up for Resend, verify a sending domain, and set
   `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.
6. Generate `AUTH_SECRET` and `CRON_SECRET` with
   `openssl rand -base64 32`.
7. Apply the schema: `npm run db:migrate` against your production
   `DATABASE_URL` (or use `db:push` for the first deploy).
8. Deploy. Vercel Cron is configured in `vercel.json` to call
   `/api/cron/heartbeat` hourly.

## Project layout

```
src/
├── app/                 # Next.js App Router pages + route handlers
│   ├── api/             # Auth, switches, upload-url, cron endpoints
│   ├── auth/            # Sign-in flow
│   ├── capsule/[cid]/   # Time-locked open page
│   ├── drop/[cid]/      # Link-based open page
│   ├── switch/[id]/     # Owner check-in / trustee unlock
│   └── dashboard/       # Logged-in user's switches
├── components/
│   ├── modes/{drop,capsule,switch}/  # Per-mode UI
│   ├── auth/            # Sign-in / sign-out
│   └── ui/              # shadcn primitives
└── lib/
    ├── crypto/          # libsodium, KDF, Shamir, tlock — all client-safe
    ├── ipfs/            # Pinata + gateway helpers
    ├── modes/           # Mode-specific encrypt/decrypt orchestration
    ├── db/              # Drizzle schema + Neon HTTP client
    ├── email/           # Resend wrappers
    └── auth/            # JWT signing + session lookup
```

## Documentation

- [Threat model](./docs/threat-model.md) — what we protect against,
  what we don't, and why.
- [Cryptographic choices](./docs/crypto.md) — every algorithm we use,
  why we picked it, and where it lives in the codebase.

## License

MIT.
