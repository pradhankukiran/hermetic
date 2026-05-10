import { GitCompareArrows } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";
import { ModeHero } from "@/components/layout/mode-hero";

export default function MirrorPage() {
  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:py-24">
      <ModeHero
        icon={GitCompareArrows}
        title="Mirror"
        tagline="Sealed by mutual disclosure"
        description="Two halves, two holders. Neither opens alone — both must combine to unlock. Built for hostage-style exchanges where neither party should reveal first."
      />
      <section className="flex flex-col">
        <ComingSoon mode="Mirror" />
      </section>
    </div>
  );
}
