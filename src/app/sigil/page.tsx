import { Eye } from "lucide-react";

import { ModeHero } from "@/components/layout/mode-hero";
import { CreateSigilForm } from "@/components/modes/sigil/create-sigil-form";

export default function SigilPage() {
  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:py-24">
      <ModeHero
        icon={Eye}
        title="Sigil"
        tagline="Sealed by proof"
        description="Unlocks when someone proves they know the answer — without revealing it to us. Pick a witness, attach a riddle, share the link. The witness never leaves the recipient's browser."
      />
      <section className="flex flex-col">
        <CreateSigilForm />
      </section>
    </div>
  );
}
