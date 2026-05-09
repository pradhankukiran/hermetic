import { Hourglass } from "lucide-react";

import { ModeHero } from "@/components/layout/mode-hero";
import { CreateCapsuleForm } from "@/components/modes/capsule/create-capsule-form";

export default function CapsulePage() {
  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:py-24">
      <ModeHero
        icon={Hourglass}
        title="Capsule"
        tagline="Sealed by time"
        description="Pick a future date. Hermetic encrypts your content using drand timelock so it cannot be decrypted — by anyone — until that date arrives. No central authority holds the key."
      />
      <section className="flex flex-col">
        <CreateCapsuleForm />
      </section>
    </div>
  );
}
