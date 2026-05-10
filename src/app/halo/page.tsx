import { Fingerprint } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";
import { ModeHero } from "@/components/layout/mode-hero";

export default function HaloPage() {
  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:py-24">
      <ModeHero
        icon={Fingerprint}
        title="Halo"
        tagline="Sealed by hardware"
        description="Wrapped to a passkey or WebAuthn credential. Only the device with that credential can unlock — not even with the right password from another machine."
      />
      <section className="flex flex-col">
        <ComingSoon mode="Halo" />
      </section>
    </div>
  );
}
