# Threat Model

This document describes what Hermetic protects against, what it does *not*
protect against, and the residual risks even when used correctly. It is
written assuming an adversary that is sophisticated, motivated, and has
access to plausible levers (subpoenas, server breach, network-level
surveillance).

If you find a gap not addressed here, please open an issue. We would rather
acknowledge a weakness than hide it.

---

## Goals

Hermetic provides three primitives — **Drop**, **Capsule**, and **Switch** —
that share a single security property:

> *The contents you encrypt, and the keys that protect them, are never
> visible to Hermetic the service, the IPFS network, or any party other than
> the intended unlocker.*

## Adversary model

We model the following attackers:

| # | Adversary | Capability |
|---|-----------|------------|
| A | Curious operator | Read-only access to the Hermetic database, logs, and IPFS pinning provider |
| B | Malicious operator | Read-write access to all server infrastructure |
| C | Network observer | Passive TLS traffic capture, possibly with metadata |
| D | Subpoena / court order | Legal compulsion against Hermetic, the IPFS provider, the email provider, or any cloud vendor |
| E | Compromised client | Browser malware on the *creator's* machine before sealing |
| F | Lost recipient | The intended unlocker loses their share / key / device |
| G | Colluding trustees | A subset of trustees collaborate before the trigger |

We assume the cryptographic primitives we use (XChaCha20-Poly1305,
Argon2id, Curve25519, BLS12-381, Shamir over GF(256), drand quicknet) are
secure as currently published.

---

## What Hermetic protects against

### Drop mode

| Threat | Protection |
|--------|------------|
| Operator reading the file | Content is encrypted client-side with a random 256-bit key. Server only sees ciphertext. |
| Network observer reading the file | Ciphertext over HTTPS to Pinata. The decryption key is never sent. |
| Subpoena against Hermetic | We have no key. We can hand over ciphertext. It is unintelligible. |
| Subpoena against Pinata / IPFS | Same — ciphertext only. |
| Sharing the URL with the wrong person | The fragment-based key (`#` portion) is never sent in HTTP requests, never logged in server access logs, never present in `Referer` headers when navigating away. |

### Capsule mode

| Threat | Protection |
|--------|------------|
| Operator opening the capsule early | Symmetric key is wrapped with **drand timelock** (BLS-based). Even Hermetic, IPFS, and the drand network operators cannot decrypt before the target round is signed by the threshold network. |
| Recipient impatience | tlock is computationally hard to brute-force without the future drand signature. |
| drand network compromise | Quicknet uses a t-of-n threshold (currently 14/19 nodes). A single drand operator cannot release the round early. |
| Subpoena against Hermetic | We have no key, and there is no key for *anyone* until the drand round arrives. |

### Switch mode

| Threat | Protection |
|--------|------------|
| Operator unlocking the switch | The decryption key is split via **Shamir's Secret Sharing** with threshold K-of-N. Hermetic stores no shares — they are emailed to trustees at creation time and live only in their inboxes / password managers. |
| One rogue trustee | A single share carries no information. Up to K-1 colluding trustees still learn nothing. |
| Server pretending the switch fired early | The status flip from `active` to `triggered` only reveals the CID. Without K shares, the CID is useless ciphertext. |
| Server hiding that the switch fired | Trustees can re-derive their share status if they preserved the original share email. The CID is discoverable from the public `/api/switches/[id]/status` endpoint once `triggered`. |
| Account takeover (attacker controls owner email) | Trustees still need to reach K. The attacker cannot prematurely trigger anything by checking *in*; only by stopping check-ins, which already triggers. They cannot trigger *now* by stopping; they have to wait the configured inactivity period. |

### Pact mode

| Threat | Protection |
|--------|------------|
| Operator forging consent | N-of-N Shamir means the server cannot reconstruct the key with one share missing. Even all-but-one collusion fails. |
| Single party defection | If one party refuses to sign, the seal stays closed forever. That's the design — there's no quorum slack. Choose your parties before sealing. |
| Server claiming a Pact is active when it's not | Pacts have only `active` / `revoked` status. Members can verify the CID against their original share email. |

### Halo mode

| Threat | Protection |
|--------|------------|
| Operator decrypting on the server | The KEK is derived from a WebAuthn PRF assertion — the authenticator never exports it. The server only ever sees the wrapped envelope. |
| Wrong device on unlock | `allowCredentials: [credentialId]` forces the browser to surface only the registered passkey. AEAD tag check on unwrap is the cryptographic backstop. |
| Stolen passkey | A passkey requires user verification (biometric / PIN). Stolen device + biometric = trust collapses; that's outside Hermetic's scope, see "Compromised creator endpoint." |
| Authenticator without PRF | Halo refuses to seal and surfaces a clear error. We do not silently fall back to a weaker mode. |

### Beacon mode

| Threat | Protection |
|--------|------------|
| Operator decrypting before the block | The wrap key is derived from an Argon2id KEK over the owner's passphrase. The chain block-height check is a UI gate, **not a cryptographic oracle.** Without the passphrase, no block height matters. |
| Operator pretending a height is reached | The unlock UI calls a public EVM RPC directly from the browser. The user can verify against any block explorer. |
| Compromise of one drand-style oracle | Beacon does not use drand or oracles in v1; it uses chain block height. EVM mainnet's consensus is the t-of-n. |
| Sealing for a block in the past | Rejected by the create form. |

### Echo mode

| Threat | Protection |
|--------|------------|
| Operator peeking at bids early | Each bid is timelock-encrypted to the auction's drand round. tlock cannot be brute-forced without the future drand signature. |
| Bidder lifting another bid into a different auction | AAD includes the auction id + round + chain hash. Replayed ciphertext fails the AEAD tag. |
| Late submission after close | Server returns `410 Gone` for bids submitted after `closesAt`. Even if accepted, they would be sealed under the *next* round, useless for this auction. |
| Bidder identity leaking | Only the chosen `bidderName` is stored — Hermetic never sees the bidder's email or IP-bound identity beyond standard request logs. |

### Sleeper mode

| Threat | Protection |
|--------|------------|
| Operator releasing without owner consent | The release endpoint requires a session cookie from the owner. CSRF is enforced via Origin checks. State changes use atomic `UPDATE` with `ownerId` in the WHERE clause. |
| Stale CID leak after revoke | Revoke flips status; subsequent status reads hide the CID. **However, an attacker who already fetched the CID from a public release moment retains the ciphertext on IPFS** — they still need the URL fragment to decrypt. Recipients should treat any released sleeper as potentially permanent. |
| Owner account takeover | Attacker can release/revoke at will. Mitigation: short JWT expiry (30 days), no password to phish, magic-link emails go to a secondary device. We do not currently support session revocation; documented as a follow-up. |

### Mirror mode

| Threat | Protection |
|--------|------------|
| Operator combining halves | Server never holds either half. Both halves live exclusively in trustee email inboxes after creation. |
| One holder defects | A single half reveals zero. The seal stays closed forever — that's the design (mutual disclosure or nothing). |
| Server claiming Mirror is revoked | Status is just metadata. A holder who has both halves out-of-band can always reconstruct independent of server status. |
| Holder identity exposure | Holder emails are stored as SHA-256 hashes only — Hermetic cannot enumerate who the holders are. |

### Sigil mode

| Threat | Protection |
|--------|------------|
| Operator brute-forcing the witness | The wrap key is Argon2id-derived (`balanced` preset: t=3, m=64 MiB). Brute-force is computationally expensive; the salt is per-Sigil random. |
| Operator-side ZK | The server stores only the envelope on IPFS. No witness, salt, or KEK ever crosses the wire. **However, the unlocking page sees the witness in plaintext** (the user types it in). v1 is server-side ZK only. |
| Witness sharing weakness | The witness is shared as a memorable string / riddle answer. Low-entropy witnesses (single words, dates) are dictionary-attackable; document a "use ≥128 bits of entropy or a high-cost preset" recommendation in the create form. |
| v2 upgrade path | The Schnorr proof primitives (`src/lib/crypto/schnorr.ts`) ship now. v2 will let the recipient prove witness knowledge to the server without revealing it; the server then hands over a wrapped key. The witness never materializes anywhere except the recipient's mind. |

---

## What Hermetic does **NOT** protect against

We are explicit about these so you can decide whether Hermetic fits your
threat model.

### Compromised creator endpoint (Adversary E)

If the device used to seal the content is compromised — keylogger,
screen-recording malware, hostile browser extension, hardware tampering
— the adversary can read the plaintext *before* it is encrypted, no
matter how strong the cryptography downstream is.

> *Hermetic protects data in transit and at rest. It cannot protect data
> while it is being created.*

### Metadata

The server necessarily learns metadata. Specifically:

- **Drops:** request IPs, Pinata signed-URL grants, ciphertext sizes, CID,
  upload timestamps. With burn-after-reading enabled (planned), also: view
  count and burn time.
- **Capsules:** CID, drand round, unlock timestamp, ciphertext size, owner
  account (if signed in).
- **Switches:** CID, threshold K, share count N, inactivity duration,
  last-checkin timestamp, owner account, **trustee email addresses in
  plaintext** (for re-notification when triggered), status transitions.
- **Pacts:** CID, party count N, owner account, **member email addresses in
  plaintext** (same trade-off as Switch trustees). Member email hashes also
  stored for indexing.
- **Halos:** No DB rows. Server only sees the IPFS upload (envelope),
  request metadata.
- **Beacons:** CID, target block height, chain id, owner account.
- **Echoes:** **public auction title and description** (intentionally — they
  describe what the bids are about), drand round, close timestamp, bid CIDs
  and bidder display names. Bid contents stay sealed until the round.
- **Sleepers:** CID, owner account, status, release timestamp.
- **Mirrors:** CID, holder email **hashes** (no plaintext), status.
- **Sigils:** No DB rows. Server only sees the IPFS upload.

We document trustee emails as **plaintext** explicitly. Hashing them would
prevent the trigger-time notification from working; we chose to make
re-notification reliable. If you object to this trade-off, treat the
trustee email field as if the server can read it (because it can) — you can
use disposable/aliased addresses if you want minimal linkage.

### Loss of keys / shares (Adversary F)

If the recipient of a Drop loses the URL fragment, the file is gone.
We cannot recover it. There is no "forgot key" path, by design.

If a trustee loses their share, that share is gone. If the lost share is
*also* below threshold, the secret is unrecoverable. There is no escrow.

### Pre-trigger collusion of trustees (Adversary G)

If K trustees collude *before* the switch fires, they cannot retrieve
the ciphertext from Hermetic — the CID is hidden until status flips.
However, if they obtain the CID through other means (e.g., the owner
shared it), K trustees can reconstruct the key and decrypt. This is
inherent to Shamir SSS at the chosen threshold.

> *Choose your trustees and threshold accordingly. K=ceil(N/2)+1 is a
> reasonable default.*

### The drand network for Capsules (long horizons)

drand quicknet is a public, distributed threshold network. We do not
operate it. Our security depends on:

1. The drand quicknet group continuing to operate honestly.
2. The BLS12-381 signature scheme remaining secure.

Both have been true for the lifetime of drand. Neither is a guarantee
forever. For very-long-horizon capsules (decades), you should weigh this.

### Quantum adversaries

XChaCha20-Poly1305 and Argon2id remain secure under known quantum
attacks. **drand timelock** uses BLS12-381 pairings — those are
believed to be vulnerable to a sufficiently powerful quantum adversary
running Shor's algorithm. This is a known limitation of all
pairing-based timelock schemes. No production quantum computer with
enough qubits exists today. Plan accordingly.

### Pinata / IPFS availability

Hermetic stores ciphertext on IPFS via Pinata. If Pinata is offline
or removes the pin, the ciphertext becomes unreachable. The
encrypted blob is content-addressed (CID), so anyone can re-pin it
elsewhere if they have a copy. We currently pin only on Pinata; v2
plans include a second pin via Lighthouse for redundancy.

### Vercel / Neon / Resend uptime

Hermetic's orchestration layer (the app, the metadata DB, the
heartbeat cron, the email service) runs on Vercel + Neon + Resend.
If they are unavailable, you cannot create switches or check in.
The data is still safe (encrypted at rest), but operations stop
until they recover.

---

## Cryptographic choices

See [`docs/crypto.md`](./crypto.md) for the rationale behind each
algorithm and parameter choice.

## Reporting issues

Security-relevant issues should be reported privately. For ordinary
bugs, please open a GitHub issue. We will publish a security policy
file before public launch.
