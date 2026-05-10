import { Gavel } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";
import { ModeHero } from "@/components/layout/mode-hero";

export default function EchoPage() {
  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:py-24">
      <ModeHero
        icon={Gavel}
        title="Echo"
        tagline="Sealed by reveal"
        description="Sealed-bid auction. N parties submit bids encrypted under a shared drand round; everyone's bid opens at the same instant when the round arrives."
      />
      <section className="flex flex-col">
        <ComingSoon mode="Echo" />
      </section>
    </div>
  );
}
