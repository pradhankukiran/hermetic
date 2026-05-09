import Link from "next/link";
import { ArrowRight, Hexagon, Hourglass, Link2, Users } from "lucide-react";

const modes = [
  {
    href: "/drop",
    icon: Link2,
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
      "Encrypt for a future date using drand timelock. Nobody on Earth can open it early.",
  },
  {
    href: "/switch",
    icon: Users,
    title: "Switch",
    tagline: "Sealed by trust",
    description:
      "Split the key across your trustees with Shamir Secret Sharing. Unlocks only if you go silent.",
  },
];

export default function LandingPage() {
  return (
    <div className="grid min-h-dvh grid-cols-1 gap-4 p-4 sm:gap-6 sm:p-6 lg:h-dvh lg:max-h-dvh lg:grid-cols-12 lg:gap-6 lg:overflow-hidden lg:p-6">
      {/* Hero column */}
      <section className="border-border/60 bg-muted/30 flex min-h-0 flex-col justify-center gap-6 rounded-2xl border p-6 sm:gap-7 sm:p-10 lg:col-span-5 lg:p-10">
        <div className="flex items-center gap-3 sm:gap-5">
          <Hexagon
            className="size-12 sm:size-14 lg:size-16"
            strokeWidth={1.5}
          />
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Hermetic
          </h1>
        </div>

        <p className="text-xl font-medium tracking-tight sm:text-2xl">
          Sealed envelopes
          <span className="text-muted-foreground"> for the internet.</span>
        </p>

        <div className="border-border/60 inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs">
          <span className="text-muted-foreground">
            End-to-end encrypted · Zero-knowledge · Decentralized
          </span>
        </div>

        <p className="text-muted-foreground max-w-md text-sm leading-relaxed sm:text-base">
          Encrypt anything in your browser. Choose how it gets unlocked: by
          link, by date, or by your trustees. We never see the contents — and
          neither does the network.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link
            href="/drop"
            className="bg-foreground text-background inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Seal something <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* Modes column — three cards stacked vertically */}
      <section className="grid auto-rows-fr gap-4 lg:col-span-7 lg:grid-rows-3 lg:gap-4 lg:overflow-hidden">
        {modes.map((mode) => {
          const Icon = mode.icon;
          return (
            <Link
              key={mode.href}
              href={mode.href}
              className="group bg-card text-card-foreground border-border/60 hover:border-foreground/40 flex min-h-0 items-center gap-5 rounded-2xl border p-5 transition-colors sm:p-6 lg:p-8"
            >
              <div className="bg-muted flex size-14 shrink-0 items-center justify-center rounded-xl lg:size-16">
                <Icon className="size-6 lg:size-7" strokeWidth={1.5} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                    {mode.title}
                  </h2>
                  <ArrowRight className="text-muted-foreground size-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="text-muted-foreground text-[11px] tracking-widest uppercase">
                  {mode.tagline}
                </p>
                <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
                  {mode.description}
                </p>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
