import Link from "next/link";
import { ArrowRight, Hexagon, Hourglass, Send, KeyRound } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const modes = [
  {
    href: "/drop",
    icon: Send,
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
    icon: KeyRound,
    title: "Switch",
    tagline: "Sealed by trust",
    description:
      "Split the decryption key across your trustees with Shamir Secret Sharing. Unlocks only if you go silent and K of them combine shares.",
  },
];

export default function LandingPage() {
  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:py-24">
      {/* Hero */}
      <section className="flex flex-col items-start justify-center gap-8">
        <div className="flex items-center gap-3 sm:gap-5">
          <Hexagon
            className="size-14 sm:size-20 md:size-24"
            strokeWidth={2.25}
          />
          <h1 className="text-6xl font-black tracking-tighter uppercase sm:text-7xl md:text-8xl">
            Hermetic
          </h1>
        </div>

        <p className="text-2xl font-medium tracking-tight sm:text-3xl">
          Sealed envelopes
          <span className="text-muted-foreground"> for the internet.</span>
        </p>

        <p className="text-muted-foreground max-w-xl text-base sm:text-lg">
          Encrypt anything in your browser. Choose how it gets unlocked: by link,
          by date, or by your trustees. We never see the contents — and neither
          does the network.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href="/drop"
            className="bg-foreground text-background inline-flex h-12 items-center gap-2 border-2 border-foreground px-6 text-sm font-bold uppercase tracking-wide shadow-brutal transition-transform hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
          >
            Seal something <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* Three modes */}
      <section className="flex flex-col">
        <div className="mb-6 flex flex-col gap-1">
          <p className="text-muted-foreground text-xs tracking-widest uppercase">
            Three unlock modes
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Pick what triggers the unlock.
          </h2>
        </div>
        <div className="grid gap-3">
          {modes.map((mode) => {
            const Icon = mode.icon;
            return (
              <Link key={mode.href} href={mode.href} className="group">
                <Card className="shadow-brutal transition-transform hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
                  <CardHeader className="flex flex-row items-center gap-4">
                    <div className="bg-foreground text-background flex size-14 shrink-0 items-center justify-center sm:size-16">
                      <Icon className="size-7 sm:size-8" strokeWidth={2.5} />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <CardTitle className="text-3xl font-black tracking-tighter uppercase sm:text-4xl">
                        {mode.title}
                      </CardTitle>
                      <CardDescription className="text-base font-bold uppercase tracking-wide">
                        {mode.tagline}
                      </CardDescription>
                    </div>
                    <ArrowRight className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
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
