# Hermetic

Sealed envelopes for the internet.

End-to-end encrypted, zero-knowledge, decentralized-storage app for sealing things until conditions are met.

## Three unlock modes

- **Drop** — encrypt now, share via link. The recipient (and only the recipient) can open it. Optional burn-after-reading.
- **Capsule** — encrypt now, decrypt at a future date. Uses [drand](https://drand.love) timelock encryption. Nobody on Earth can open it early.
- **Switch** — encrypt now, decrypt only if you go silent and `K of N` trustees combine their shares. Built on Shamir's Secret Sharing.

## How it works

- **End-to-end encrypted** — content is encrypted in your browser before it ever leaves your device.
- **Zero-knowledge** — the server stores ciphertext and minimal metadata. It never sees your content, your keys, or your password.
- **Decentralized storage** — encrypted blobs live on IPFS via Pinata. Vercel hosts the orchestration; nothing on Vercel can decrypt anything.

## Stack

- Next.js 16 (App Router) + React 19
- shadcn/ui + Tailwind CSS v4
- Drizzle ORM + Vercel Postgres (Neon)
- libsodium-wrappers for primitives
- tlock-js for drand timelock
- shamir-secret-sharing for key splitting
- Pinata for IPFS pinning
- Resend for transactional email
- Vercel Cron for heartbeat checks

## Local development

```bash
cp .env.example .env.local
# Fill in DATABASE_URL, PINATA_JWT, RESEND_API_KEY, AUTH_SECRET, etc.
npm install
npm run dev
```

## Threat model

See [`docs/threat-model.md`](./docs/threat-model.md) — what Hermetic protects against, and what it doesn't.

## License

MIT
