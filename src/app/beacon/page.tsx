import { Radio } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";
import { ModeHero } from "@/components/layout/mode-hero";

export default function BeaconPage() {
  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:py-24">
      <ModeHero
        icon={Radio}
        title="Beacon"
        tagline="Sealed by event"
        description="Unlocks when a verifiable on-chain event fires — a block height, a contract storage value, or an oracle reading. The chain decides when, not us."
      />
      <section className="flex flex-col">
        <ComingSoon mode="Beacon" />
      </section>
    </div>
  );
}
