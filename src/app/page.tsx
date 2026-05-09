import Link from "next/link";
import { ArrowRight, Hexagon, Hourglass, Link2, Users } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const modes = [
  {
    href: "/drop",
    icon: Link2,
    title: "Drop",
    tagline: "Sealed by link",
    description:
      "Encrypt now, share via link. The decryption key lives in the URL fragment — never sent to a server. Optional burn-after-reading.",
  },
  {
    href: "/capsule",
    icon: Hourglass,
    title: "Capsule",
    tagline: "Sealed by time",
    description:
      "Encrypt for a future date using drand timelock. Nobody on Earth can open it early — including you, the recipient, or any server.",
  },
  {
    href: "/switch",
    icon: Users,
    title: "Switch",
    tagline: "Sealed by trust",
    description:
      "Split the decryption key across your trustees with Shamir Secret Sharing. Unlocks only if you go silent and K of them combine shares.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="relative overflow-hidden border-b">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="flex flex-col items-start gap-6 sm:items-center sm:text-center">
            <div className="border-border/60 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
              <Hexagon className="size-3" strokeWidth={1.75} />
              <span className="text-muted-foreground">
                End-to-end encrypted · Zero-knowledge · Decentralized
              </span>
            </div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Sealed envelopes
              <span className="text-muted-foreground"> for the internet.</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl text-base sm:text-lg">
              Encrypt anything in your browser. Choose how it gets unlocked: by link,
              by date, or by your trustees. We never see the contents — and neither
              does the network.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/drop"
                className="bg-foreground text-background inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-medium transition-opacity hover:opacity-90"
              >
                Seal something <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/threat-model"
                className="hover:bg-muted inline-flex h-10 items-center rounded-full px-5 text-sm transition-colors"
              >
                How it works
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8 flex flex-col gap-1">
          <p className="text-muted-foreground text-xs tracking-widest uppercase">
            Three unlock modes
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Pick what triggers the unlock.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modes.map((mode) => {
            const Icon = mode.icon;
            return (
              <Link key={mode.href} href={mode.href} className="group">
                <Card className="hover:border-foreground/30 h-full transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
                        <Icon className="size-5" strokeWidth={1.75} />
                      </div>
                      <ArrowRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <CardTitle className="mt-3 text-xl">{mode.title}</CardTitle>
                    <CardDescription className="text-xs tracking-wide uppercase">
                      {mode.tagline}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {mode.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
