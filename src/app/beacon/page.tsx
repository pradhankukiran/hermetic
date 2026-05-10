import { Radio } from "lucide-react";

import { ModeHero } from "@/components/layout/mode-hero";
import { CreateBeaconForm } from "@/components/modes/beacon/create-beacon-form";

export default function BeaconPage() {
  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:py-24">
      <ModeHero
        icon={Radio}
        title="Beacon"
        tagline="Sealed by block"
        description="Pick a future Ethereum mainnet block. The unlock page refuses to attempt decryption until the chain has mined that block, then asks for the owner passphrase. The chain decides when, the passphrase decides who."
      />
      <section className="flex flex-col">
        <CreateBeaconForm />
      </section>
    </div>
  );
}
