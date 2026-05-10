import Link from "next/link";
import {
  ArrowRight,
  Eye,
  Fingerprint,
  Gavel,
  GitCompareArrows,
  Handshake,
  Hexagon,
  Hourglass,
  KeyRound,
  Power,
  Radio,
  Send,
  type LucideIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Mode = {
  href: string;
  icon: LucideIcon;
  title: string;
  tagline: string;
  description: string;
};

const modesLeft: Mode[] = [
  {
    href: "/drop",
    icon: Send,
    title: "Drop",
    tagline: "Sealed by link",
    description:
      "Encrypt now, share via link. The decryption key lives in the URL fragment — never sent to a server.",
  },
  {
    href: "/capsule",
    icon: Hourglass,
    title: "Capsule",
    tagline: "Sealed by time",
    description:
      "Encrypt for a future date using drand timelock. Nobody can open it early.",
  },
  {
    href: "/switch",
    icon: KeyRound,
    title: "Switch",
    tagline: "Sealed by trust",
    description:
      "Split the key across your trustees with Shamir Secret Sharing. Unlocks if you go silent.",
  },
  {
    href: "/pact",
    icon: Handshake,
    title: "Pact",
    tagline: "Sealed by consensus",
    description:
      "N-of-N agreement. Every party must sign before the seal opens. No quorum slack.",
  },
  {
    href: "/halo",
    icon: Fingerprint,
    title: "Halo",
    tagline: "Sealed by hardware",
    description:
      "Bound to a passkey or WebAuthn device. Only that hardware can unlock.",
  },
];

const modesRight: Mode[] = [
  {
    href: "/beacon",
    icon: Radio,
    title: "Beacon",
    tagline: "Sealed by event",
    description:
      "Unlocks when a chain event fires — block height, oracle reading, or contract state.",
  },
  {
    href: "/echo",
    icon: Gavel,
    title: "Echo",
    tagline: "Sealed by reveal",
    description:
      "Sealed bid auction. Bids stay hidden until the round closes; all open at once.",
  },
  {
    href: "/sleeper",
    icon: Power,
    title: "Sleeper",
    tagline: "Sealed by command",
    description:
      "Sits encrypted until the owner explicitly releases it. No timer, no link.",
  },
  {
    href: "/mirror",
    icon: GitCompareArrows,
    title: "Mirror",
    tagline: "Sealed by mutual disclosure",
    description:
      "Two halves, two holders. Neither opens alone — both must combine.",
  },
  {
    href: "/sigil",
    icon: Eye,
    title: "Sigil",
    tagline: "Sealed by proof",
    description:
      "Unlocks when someone proves they know the answer — without revealing it.",
  },
];

function ModeCard({ mode }: { mode: Mode }) {
  const Icon = mode.icon;
  return (
    <Link href={mode.href} className="group">
      <Card className="shadow-brutal transition-transform hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="bg-foreground text-background flex size-10 shrink-0 items-center justify-center sm:size-12">
            <Icon className="size-5 sm:size-6" strokeWidth={2.5} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <CardTitle className="text-2xl font-black tracking-tighter uppercase sm:text-3xl">
              {mode.title}
            </CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-wide sm:text-sm">
              {mode.tagline}
            </CardDescription>
          </div>
          <ArrowRight className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {mode.description}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function LandingPage() {
  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-3 lg:gap-8 lg:py-16">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center gap-6 text-center">
        <div className="flex items-center gap-3 sm:gap-4">
          <Hexagon
            className="size-10 sm:size-14 md:size-16"
            strokeWidth={2.25}
          />
          <h1 className="text-5xl font-black tracking-tighter uppercase sm:text-6xl md:text-7xl">
            Hermetic
          </h1>
        </div>

        <p className="text-xl font-medium tracking-tight sm:text-2xl">
          Sealed envelopes
          <span className="text-muted-foreground"> for the internet.</span>
        </p>

        <p className="text-muted-foreground max-w-md text-sm leading-relaxed sm:text-base">
          Encrypt anything in your browser. Choose how it gets unlocked. We
          never see the contents — and neither does the network.
        </p>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Link
            href="/drop"
            className="bg-foreground text-background inline-flex h-10 items-center gap-2 px-5 text-xs font-bold uppercase tracking-wide transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-foreground/90"
          >
            Seal something <ArrowRight className="size-3.5" />
          </Link>
          <Link
            href="/how-it-works"
            className="border-2 border-foreground bg-background text-foreground hover:bg-muted inline-flex h-10 items-center gap-2 px-5 text-xs font-bold uppercase tracking-wide transition-colors"
          >
            How it works
          </Link>
        </div>
      </section>

      {/* Modes column 1 — Drop · Capsule · Switch · Pact · Halo */}
      <section className="grid auto-rows-min gap-3">
        {modesLeft.map((mode) => (
          <ModeCard key={mode.href} mode={mode} />
        ))}
      </section>

      {/* Modes column 2 — Beacon · Echo · Sleeper · Mirror · Sigil */}
      <section className="grid auto-rows-min gap-3">
        {modesRight.map((mode) => (
          <ModeCard key={mode.href} mode={mode} />
        ))}
      </section>
    </div>
  );
}
