import { Handshake } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";
import { ModeHero } from "@/components/layout/mode-hero";

export default function PactPage() {
  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:py-24">
      <ModeHero
        icon={Handshake}
        title="Pact"
        tagline="Sealed by consensus"
        description="N-of-N agreement. Every party must sign before the seal opens — no quorum slack. Useful for joint decisions, group secrets, contractual releases."
      />
      <section className="flex flex-col">
        <ComingSoon mode="Pact" />
      </section>
    </div>
  );
}
