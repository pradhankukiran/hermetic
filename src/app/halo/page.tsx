import { Fingerprint } from "lucide-react";

import { ModeHero } from "@/components/layout/mode-hero";
import { CreateHaloForm } from "@/components/modes/halo/create-halo-form";

export default function HaloPage() {
  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:py-24">
      <ModeHero
        icon={Fingerprint}
        title="Halo"
        tagline="Sealed by hardware"
        description="Wrapped to a passkey via the WebAuthn PRF extension. Only the device that registered the passkey can unlock — not even with the right URL from another machine."
      />
      <section className="flex flex-col">
        <CreateHaloForm />
      </section>
    </div>
  );
}
