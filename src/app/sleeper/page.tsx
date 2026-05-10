import { Power } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";
import { ModeHero } from "@/components/layout/mode-hero";

export default function SleeperPage() {
  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:py-24">
      <ModeHero
        icon={Power}
        title="Sleeper"
        tagline="Sealed by command"
        description="Encrypt now, sit on it. The seal stays closed until you, the owner, click release. No timer, no link, no trustees — just your call."
      />
      <section className="flex flex-col">
        <ComingSoon mode="Sleeper" />
      </section>
    </div>
  );
}
