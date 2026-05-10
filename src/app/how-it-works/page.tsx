import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Eye,
  Fingerprint,
  Gavel,
  GitCompareArrows,
  Handshake,
  Hourglass,
  KeyRound,
  Lock,
  Power,
  Radio,
  Send,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        icon={ShieldCheck}
        eyebrow="Architecture · Threat model"
        title="How it works"
        description="Hermetic encrypts every byte in your browser. The server, the network, the cloud provider — none of them can read your content. We can hand them anything they ask for. What they get is ciphertext."
      />

      <div className="flex w-full flex-col gap-16 px-4 py-16 sm:px-6 sm:py-20 lg:px-12">
        {/* Ten modes */}
        <Section
          eyebrow="Ten modes · same encryption"
          title="Pick what triggers the unlock."
        >
          <p className="text-muted-foreground -mt-2 max-w-2xl text-sm leading-relaxed">
            Every mode reuses the same skeleton: a random symmetric key
            encrypts the content under XChaCha20-Poly1305 with a mode-bound
            AAD. What changes is the unlock <em>policy</em> — how that key gets
            re-derived. Adding a mode is plugging in a different
            <code> wrapKey</code> / <code>unwrapKey</code> strategy.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <ModeCard
              icon={Send}
              name="Drop"
              tagline="Sealed by link"
              note="Encrypt → upload ciphertext to IPFS → share /drop/[cid]#[key]. The key lives in the URL fragment, never sent to a server."
            />
            <ModeCard
              icon={Hourglass}
              name="Capsule"
              tagline="Sealed by time"
              note="Wrap the symmetric key with drand timelock. Nobody — us, you, the recipient, the network — can decrypt before the round arrives."
            />
            <ModeCard
              icon={KeyRound}
              name="Switch"
              tagline="Sealed by trust"
              note="Dead-man's switch. Shamir-split the key across N trustees; if the owner goes silent past the deadline, K of N can combine."
            />
            <ModeCard
              icon={Handshake}
              name="Pact"
              tagline="Sealed by consensus"
              note="N-of-N agreement. Every party must combine their share — no quorum slack, no fallback. One holdout means the seal stays closed."
            />
            <ModeCard
              icon={Fingerprint}
              name="Halo"
              tagline="Sealed by hardware"
              note="Wrap the key under a WebAuthn PRF-derived KEK. Only the device with the registered passkey can produce the unwrap key."
            />
            <ModeCard
              icon={Radio}
              name="Beacon"
              tagline="Sealed by event"
              note="UI gates on an EVM block height (chain decides when) plus a passphrase the owner holds (decides who). Honest about being a UI gate, not an oracle."
            />
            <ModeCard
              icon={Gavel}
              name="Echo"
              tagline="Sealed by reveal"
              note="Sealed-bid auction. N bidders submit content tlock-encrypted to the same close round; every bid opens at the same instant."
            />
            <ModeCard
              icon={Power}
              name="Sleeper"
              tagline="Sealed by command"
              note="Sits encrypted indefinitely. Unlocks the moment the owner clicks release; can be re-sealed at any time."
            />
            <ModeCard
              icon={GitCompareArrows}
              name="Mirror"
              tagline="Sealed by mutual disclosure"
              note="2-of-2 Shamir. Two halves, two holders. Neither opens alone — both must combine in the same browser session."
            />
            <ModeCard
              icon={Eye}
              name="Sigil"
              tagline="Sealed by proof"
              note="Argon2id-wrapped key derivable only from the right witness. Schnorr proof primitives ship for the v2 server-blind upgrade."
            />
          </div>
        </Section>

        {/* What we protect against */}
        <Section
          eyebrow="What we protect against"
          title="Seven flavors of adversary."
        >
          <BrutalTable
            headers={["Adversary", "Capability", "What they get"]}
            rows={[
              [
                "A. Curious operator",
                "Read access to DB + IPFS + email logs",
                "Ciphertext, CIDs, hashed identifiers",
              ],
              [
                "B. Malicious operator",
                "Full read-write of all infra",
                "Same — they can break service, not break crypto",
              ],
              [
                "C. Network observer",
                "Passive TLS metadata capture",
                "Connection metadata; payloads are TLS-protected and ciphertext anyway",
              ],
              [
                "D. Subpoena / court order",
                "Legal compulsion against any vendor",
                "Whatever the operator has — which is unintelligible bytes",
              ],
              [
                "E. Single rogue trustee",
                "Holds one Shamir share",
                "Nothing. Zero information about the secret.",
              ],
              [
                "F. Lost recipient",
                "Lost the URL fragment, share, or recovery code",
                "Nothing — and that's the point. No back doors.",
              ],
              [
                "G. Compromised drand operator",
                "One of ~19 quicknet operators turns hostile",
                "Nothing — drand uses a t-of-n threshold (currently 14/19)",
              ],
            ]}
          />
        </Section>

        {/* What we don't protect */}
        <Section
          eyebrow="What we don't protect"
          title="And we're honest about it."
        >
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <BrutalCallout
              icon={AlertTriangle}
              title="Compromised browser"
              body="Keylogger, hostile extension, screen-record malware on the device used to seal. Plaintext is in your browser before it's encrypted; we can't help if your device leaks it."
            />
            <BrutalCallout
              icon={AlertTriangle}
              title="Metadata"
              body="Server learns: file size, timestamps, who shared with whom, hashed emails, public auction titles for Echo. Trustee/member emails for Switch and Pact are stored as plaintext to enable re-notification; Mirror keeps holder emails as hashes only."
            />
            <BrutalCallout
              icon={AlertTriangle}
              title="Lost keys / shares"
              body="If you lose the URL fragment, the file is gone. If trustees lose K shares, the switch is gone. If you forget the Sigil witness or the Beacon passphrase, the seal is gone. There is no escrow, no recovery. By design."
            />
            <BrutalCallout
              icon={AlertTriangle}
              title="Pre-trigger collusion"
              body="K trustees who collude before a Switch fires can reconstruct the key — but the server hides the CID until status flips. Pact requires unanimous (N-of-N) consent, so one party can always withhold. Mirror is 2-of-2 by design."
            />
            <BrutalCallout
              icon={AlertTriangle}
              title="Beacon UI gate"
              body="The chain anchor on Beacon is a UI gate, not a cryptographic oracle. A determined attacker can ignore the block-height check and try the passphrase early. The passphrase is the actual seal; the chain decides when the UI offers the prompt."
            />
            <BrutalCallout
              icon={AlertTriangle}
              title="Sigil server-side ZK only"
              body="V1 Sigil is server-side zero-knowledge: the server never sees the witness, but the unlocking page does (the user types it in). The Schnorr stub ships now for v2 where the recipient proves knowledge to the server without revealing it."
            />
            <BrutalCallout
              icon={AlertTriangle}
              title="Halo PRF availability"
              body="Halo requires an authenticator that supports the WebAuthn PRF extension (Touch ID, Windows Hello, modern Yubikeys, Android passkeys all do). Older USB authenticators may not — we fail closed with a friendly message."
            />
            <BrutalCallout
              icon={AlertTriangle}
              title="Quantum adversaries"
              body="XChaCha20-Poly1305 and Argon2id remain secure. Drand timelock relies on BLS12-381 pairings — vulnerable to a sufficiently powerful quantum computer running Shor's. Schnorr secp256k1 (Sigil v2) has the same caveat. None exists today."
            />
            <BrutalCallout
              icon={AlertTriangle}
              title="Vendor uptime"
              body="Pinata offline → CIDs unreachable. Vercel down → can't create accounts or check in. Public EVM RPC unreachable → Beacon can't read block height. Data stays safe (encrypted at rest), but the app stops."
            />
            <BrutalCallout
              icon={AlertTriangle}
              title="Email-account compromise"
              body="Magic-link auth means your email IS the credential. An attacker who reads your inbox can sign in and trigger Sleeper releases or revoke a Switch. Use a fresh address with strong 2FA, and never let Hermetic auth share an inbox with high-value services."
            />
          </div>
        </Section>

        {/* Cryptography */}
        <Section
          eyebrow="Cryptographic choices"
          title="No homemade crypto. Audited primitives only."
        >
          <BrutalTable
            headers={["Primitive", "Algorithm", "Library"]}
            rows={[
              ["Symmetric AEAD", "XChaCha20-Poly1305 (24-byte nonce)", "libsodium"],
              ["Password KDF", "Argon2id (RFC 9106)", "@noble/hashes"],
              ["Random", "CSPRNG via randombytes_buf", "libsodium"],
              ["Hash", "SHA-256", "@noble/hashes"],
              ["Secret sharing", "Shamir over GF(256), 2 ≤ K ≤ N ≤ 255", "shamir-secret-sharing"],
              ["Timelock", "drand quicknet, BLS12-381 pairings", "tlock-js"],
              ["Hardware-bound KEK", "WebAuthn PRF extension (HMAC-SHA256)", "@simplewebauthn/* + native WebAuthn"],
              ["Proof of knowledge", "Schnorr Σ-protocol over secp256k1 + Fiat-Shamir", "@noble/curves (Sigil v2 stub)"],
              ["Chain reads (Beacon)", "EVM JSON-RPC (block height)", "viem"],
              ["Sessions", "HS256 JWT, HttpOnly cookie", "jose"],
              ["CSRF", "Origin / Referer same-origin assertion", "(in-house)"],
            ]}
          />
        </Section>

        {/* Read more */}
        <Section eyebrow="Read more" title="The full story.">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="https://github.com/pradhankukiran/hermetic/blob/main/docs/threat-model.md"
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-foreground bg-background hover:bg-muted inline-flex items-center justify-between gap-3 px-5 py-4 transition-colors"
            >
              <div>
                <p className="text-base font-bold uppercase tracking-tight">
                  docs/threat-model.md
                </p>
                <p className="text-muted-foreground text-xs font-mono">
                  Adversaries, protections, residual risks
                </p>
              </div>
              <ArrowRight className="size-4 shrink-0" strokeWidth={2.5} />
            </Link>
            <Link
              href="https://github.com/pradhankukiran/hermetic/blob/main/docs/crypto.md"
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-foreground bg-background hover:bg-muted inline-flex items-center justify-between gap-3 px-5 py-4 transition-colors"
            >
              <div>
                <p className="text-base font-bold uppercase tracking-tight">
                  docs/crypto.md
                </p>
                <p className="text-muted-foreground text-xs font-mono">
                  Every algorithm, why we picked it, where it lives
                </p>
              </div>
              <ArrowRight className="size-4 shrink-0" strokeWidth={2.5} />
            </Link>
          </div>
        </Section>

        {/* Footer note */}
        <div className="border-2 border-foreground bg-foreground text-background flex items-start gap-4 p-6">
          <Lock className="size-6 shrink-0" strokeWidth={2.5} />
          <div className="flex flex-col gap-2">
            <p className="text-lg font-bold uppercase tracking-tight">
              The bottom line
            </p>
            <p className="text-sm leading-relaxed">
              Hermetic protects against a server breach, a malicious admin, a
              subpoena, a hostile network. It does not protect against your own
              compromised device, lost keys, or vendor outages. We make that
              trade-off explicit. If you need stronger guarantees, fork the
              repo and run it yourself.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
          {eyebrow}
        </p>
        <h2 className="text-3xl font-black tracking-tighter uppercase sm:text-4xl">
          {title}
        </h2>
      </header>
      {children}
    </section>
  );
}

function ModeCard({
  icon: Icon,
  name,
  tagline,
  note,
}: {
  icon: LucideIcon;
  name: string;
  tagline: string;
  note: string;
}) {
  return (
    <div className="border-2 border-foreground bg-background flex flex-col gap-3 p-5">
      <div className="bg-foreground text-background flex size-10 items-center justify-center">
        <Icon className="size-5" strokeWidth={2.5} />
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-2xl font-black tracking-tighter uppercase">
          {name}
        </h3>
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-wide">
          {tagline}
        </p>
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">{note}</p>
    </div>
  );
}

function BrutalCallout({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="border-2 border-foreground bg-background flex gap-4 p-5">
      <Icon className="size-5 shrink-0" strokeWidth={2.5} />
      <div className="flex flex-col gap-1.5">
        <p className="text-base font-bold uppercase tracking-tight">{title}</p>
        <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function BrutalTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="border-2 border-foreground overflow-x-auto bg-background">
      <table className="w-full">
        <thead>
          <tr className="bg-foreground text-background">
            {headers.map((h) => (
              <th
                key={h}
                className="border-foreground border-r-2 px-4 py-3 text-left text-xs font-bold uppercase tracking-widest last:border-r-0"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-foreground border-t-2 first:border-t-0"
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="border-foreground border-r-2 px-4 py-3 text-sm last:border-r-0"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
