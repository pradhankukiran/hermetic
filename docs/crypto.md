# Cryptographic Choices

This document records every cryptographic primitive Hermetic uses, why we
chose it, what alternatives we considered, and where in the codebase it
lives. The threat model is in [`threat-model.md`](./threat-model.md).

---

## Symmetric authenticated encryption

**Algorithm:** XChaCha20-Poly1305 (IETF) — `crypto_aead_xchacha20poly1305_ietf`

- 256-bit key
- 192-bit nonce (24 bytes) — random per encryption, prepended to ciphertext
- 128-bit Poly1305 authentication tag — appended

**Why this and not AES-GCM?**

- The 24-byte nonce is large enough that **random nonces are safe**
  indefinitely. The collision bound is ~2^-96 even after 2^48 messages with
  the same key. AES-GCM's 96-bit nonce is birthday-bound and starts
  collisions around 2^32 messages, which is unsafe for a key reused across
  many seal events.
- ChaCha20 is constant-time on every platform we ship to, including
  WebAssembly / pure-JS. AES requires hardware acceleration to be both fast
  and side-channel-safe.
- libsodium-tested, widely audited, used in production by Signal, WireGuard,
  age, and others.

**Source:** `src/lib/crypto/symmetric.ts`. Library: `libsodium-wrappers`.

**Additional Authenticated Data (AAD):** supported by the API. We do not
yet bind capsule IDs / drand rounds via AAD; this is planned.

## Password-based key derivation

**Algorithm:** Argon2id (RFC 9106)

- 256-bit output (32 bytes), suitable as a symmetric key
- 128-bit random salt (16 bytes), stored alongside ciphertext

**Strength presets:**

| Name      | t (iterations) | m (memory) | Use case |
|-----------|----------------|------------|----------|
| `light`   | 2              | 19 MiB     | Already-strong inputs (recovery codes) |
| `balanced`| 3              | 64 MiB     | Default for typical passphrases |
| `strong`  | 4              | 128 MiB    | High-value secrets on capable devices |

These are the OWASP 2024 minimums (`light`) up through aggressive
parameters that push browsers but stay below mobile-OS heap caps (`strong`).
Numbers are conservative — increasing iterations is preferred to memory if
mobile constraints are an issue.

**Why Argon2id and not scrypt or bcrypt?**

- Argon2id is the winner of the Password Hashing Competition and the only
  KDF currently recommended without caveats by RFC 9106 / OWASP.
- Resistant to both side-channel attacks (the `i` half) and GPU/ASIC
  attacks (the `d` half).
- bcrypt has a 72-byte input limit and only 184-bit output. scrypt is
  acceptable but Argon2id is strictly newer with formal proofs.

**Source:** `src/lib/crypto/kdf.ts`. Library: `@noble/hashes/argon2`
(audited, zero-dependency, TypeScript). The async variant is used so the
main thread does not block.

## Random bytes

All randomness comes from libsodium's `randombytes_buf`, which delegates to
`crypto.getRandomValues` (browser) or `/dev/urandom` (Node). We never use
`Math.random` and never seed manually.

**Source:** `src/lib/crypto/random.ts`.

## SHA-256

Used for:
- Email hashing (server stores `sha256(lowercase_trim(email))` for
  account lookup; the *plaintext* email is also stored where re-notification
  is required, see threat model).
- Magic-link token hashing — the plaintext token is in the email URL only;
  the database stores `sha256(token)`.

**Source:** `src/lib/crypto/hash.ts`. Library: `@noble/hashes/sha2`.

## Shamir's Secret Sharing

**Field:** GF(256). **Threshold:** K-of-N with `2 ≤ K ≤ N ≤ 255`.

Used in **Switch mode** to split the symmetric key for a sealed payload
across N trustees, with reconstruction requiring any K of them.

**Why Shamir over multi-key wrapping or threshold ECC?**

- Information-theoretically secure. K-1 shares reveal *zero* bits of
  information about the secret — not even computationally hard, but
  mathematically impossible.
- Trustees do not need keys themselves. They store opaque bytes.
- Tiny implementation surface. The `shamir-secret-sharing` package is
  small (~200 LoC), reviewable, no external dependencies — but pre-1.0
  (`0.0.4`), single-maintainer, and unaudited; we vouch for the
  implementation only by reading it ourselves.

**Source:** `src/lib/crypto/shamir.ts`. Library: `shamir-secret-sharing`.

## Timelock encryption (drand)

**Algorithm:** BLS12-381-based identity-based encryption, where the
"identity" is a future drand round number.

- We use **drand quicknet** (3-second rounds, BLS unchained, RFC 9380
  scheme). Chain hash:
  `52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971`
- Capsule mode wraps the symmetric key (only) under timelock — the bulk
  content is encrypted with XChaCha20-Poly1305 under that key. This
  keeps timelock-encrypted payloads small (~32 bytes wrapped) and the
  bulk content fast.

**Why this and not "store the key on a server with a timer"?**

- A server-with-a-timer can be compelled to release the key early.
  drand timelock cannot — even drand operators cannot release a round
  signature before its scheduled time. The threshold property of the
  drand network (currently 14-of-19 unique operators across the world)
  is what makes this real.

**Quantum caveat:** BLS pairings rely on the discrete-log assumption in
elliptic-curve groups, which is broken by Shor's algorithm. Capsules
sealed today are safe against any practical adversary today; capsules
intended to remain sealed for decades carry quantum risk.

**Source:** `src/lib/crypto/timelock.ts`. Library: `tlock-js` (Protocol
Labs).

## WebAuthn PRF (Halo mode)

**Algorithm:** WebAuthn PRF extension — the authenticator computes
`HMAC-SHA-256(credential-bound-key, salt)` and returns a 32-byte output to
the page. The credential-bound key never leaves the secure element.

- The PRF output is used **directly as the KEK** (no HKDF needed — it is
  already uniform-random 32 bytes).
- A per-Halo random salt is stored in the envelope. Different (credential,
  salt) pairs yield independent KEKs.
- `residentKey: "required"` so unlock works from URL alone with no DB hint.
- `allowCredentials: [credentialId]` on assertion forces the browser to
  surface only the registered passkey; the AEAD tag check is the
  cryptographic backstop if the wrong credential is somehow used.
- Authenticators without PRF support fail closed with a clear error — we do
  not silently fall back to a weaker mode.

**Why this and not "encrypt to a server-known device key"?**

- A server-known key can be compelled or copied. The PRF output never
  exists on the server, never on the network, never as a recoverable secret
  on disk. Only the authenticator can produce it, and only with user
  presence + verification (biometric / PIN).

**Source:** `src/lib/crypto/halo-prf.ts`, `src/lib/modes/halo.ts`. Library:
`@simplewebauthn/server` + `@simplewebauthn/browser` (for support gates),
plus the native `navigator.credentials` API for PRF-extension calls
(SimpleWebAuthn doesn't yet model PRF salts in its TypeScript types).

## Schnorr proof of knowledge (Sigil v2 stub)

**Algorithm:** Schnorr Σ-protocol over `secp256k1` with the Fiat-Shamir
transform — non-interactive proof that the prover knows a witness `x` such
that `P = x·G`, without revealing `x`.

- Domain-separated by tag `hermetic:sigil:schnorr:v=1` baked into the
  challenge hash (prevents cross-protocol replay).
- Round-trip + tamper tests cover proof verification, wrong-witness
  rejection, and challenge-tag separation (12 tests).
- **Not yet integrated with the unlock UI.** v1 Sigil derives the wrap key
  from the witness via Argon2id (see KDF section). The Schnorr stub ships
  for the v2 server-blind upgrade: the recipient proves knowledge to the
  server, the server hands over the wrapped key, and the witness never
  passes through Argon2id over the public ciphertext.

**Source:** `src/lib/crypto/schnorr.ts`. Library: `@noble/curves`.

## EVM chain reads (Beacon mode)

**Library:** `viem`. We use only the read-side: `publicClient.getBlockNumber()`
and `getBlock()`. No transactions are sent, no wallet integration, no
private keys handled.

- Default RPC: `https://eth.llamarpc.com` (public). Override with
  `BEACON_RPC_URL` (server) or `NEXT_PUBLIC_BEACON_RPC_URL` (browser) for
  reliability.
- Beacon's chain anchor is a **UI gate**, not a cryptographic oracle: the
  unlock page refuses to attempt decryption until `currentBlock >=
  targetHeight`. The actual seal is an Argon2id-wrapped passphrase — see
  the threat model for the honesty disclosure.

**Source:** `src/lib/chain/viem.ts`, `src/lib/modes/beacon.ts`.

## CSRF

**Mechanism:** Same-origin assertion via `Origin` header (with `Referer`
fallback) on every state-changing POST. Compared against
`NEXT_PUBLIC_APP_URL`. Combined with the cookie `SameSite=Lax`, this
defeats top-level POST navigations from attacker pages.

**Source:** `src/lib/auth/csrf.ts`. Applied to: signin, signout, switches
(create + checkin), pacts (create), sleepers (release + revoke).

## Sessions / authentication

**Token:** signed JWT (HS256) over the user UUID, 30-day expiry. Stored
in an `HttpOnly`, `SameSite=Lax`, `Secure` (in production) cookie.

**Magic links:** 32 random bytes → URL-safe base64 (43 chars). Server
stores SHA-256 hash with 15-minute expiry. Single-use (`used_at`
timestamp prevents replay).

**Source:** `src/lib/auth/jwt.ts`, `src/lib/auth/session.ts`.

We do **not** currently use OPAQUE — that is planned for v2. The current
flow is acceptable because there is no password to steal; the magic link
is the only credential, and it expires quickly.

## What we deliberately do not use

- **PGP / OpenPGP** — armored encoding, complex protocol, poor key
  management story. age and tlock cover the use cases more cleanly.
- **AES-CBC / AES-CTR without authentication** — unauthenticated AEAD is
  a footgun. Always use a *AEAD* primitive.
- **MD5, SHA-1, RC4, DES** — broken or aging.
- **Self-implemented anything** — no rolled-our-own primitives. Every
  algorithm is a wrapper over a well-audited library.
