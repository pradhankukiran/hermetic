import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Hourglass,
  KeyRound,
  Lock,
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

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-16 px-4 py-16 sm:px-6 sm:py-20">
        {/* Three modes */}
        <Section
          eyebrow="Three modes · same encryption"
          title="Pick what triggers the unlock."
        >
          <div className="grid gap-4 sm:grid-cols-3">
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
              note="Split the key into N shares. Trustees hold them. K of N can combine and unlock — but only after the dead-man's deadline passes."
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
          <div className="grid gap-4 sm:grid-cols-2">
            <BrutalCallout
              icon={AlertTriangle}
              title="Compromised browser"
              body="Keylogger, hostile extension, screen-record malware on the device used to seal. Plaintext is in your browser before it's encrypted; we can't help if your device leaks it."
            />
            <BrutalCallout
              icon={AlertTriangle}
              title="Metadata"
              body="Server learns: file size, timestamps, who shared with whom, hashed emails. Trustee emails for switches are stored in plaintext (so we can re-notify on trigger). Documented in docs/threat-model.md."
            />
            <BrutalCallout
              icon={AlertTriangle}
              title="Lost keys / shares"
              body="If you lose the URL fragment, the file is gone. If trustees lose K shares, the switch is gone. There is no escrow, no key recovery. By design."
            />
            <BrutalCallout
              icon={AlertTriangle}
              title="Pre-trigger collusion"
              body="K trustees who collude before the switch fires can reconstruct the key — but the server hides the CID until status flips, so they need to obtain it some other way. Choose your trustees and threshold accordingly."
            />
            <BrutalCallout
              icon={AlertTriangle}
              title="Quantum adversaries"
              body="XChaCha20-Poly1305 and Argon2id remain secure. Drand timelock relies on BLS12-381 pairings — vulnerable to a sufficiently powerful quantum computer running Shor's. None exists today."
            />
            <BrutalCallout
              icon={AlertTriangle}
              title="Vendor uptime"
              body="Pinata is offline → CIDs unreachable. Vercel is down → can't create switches or check in. The data is still safe (encrypted at rest), but the app stops."
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
              ["Sessions", "HS256 JWT, HttpOnly cookie", "jose"],
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
