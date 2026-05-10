import { Eye } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";
import { ModeHero } from "@/components/layout/mode-hero";

export default function SigilPage() {
  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:py-24">
      <ModeHero
        icon={Eye}
        title="Sigil"
        tagline="Sealed by proof"
        description="Unlocks when someone proves they know the answer — without revealing it. Zero-knowledge proof of knowledge guards the seal."
      />
      <section className="flex flex-col">
        <ComingSoon mode="Sigil" />
      </section>
    </div>
  );
}
