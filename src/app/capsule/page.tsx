import { Hourglass } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";

export default function CapsulePage() {
  return (
    <>
      <PageHeader
        icon={Hourglass}
        eyebrow="Capsule · sealed by time"
        title="Encrypt for the future."
        description="Pick a future date. Hermetic encrypts your content using drand timelock so it cannot be decrypted — by anyone — until that date arrives. No central authority holds the key."
      />
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <div className="border-border/60 bg-muted/30 rounded-xl border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">
            Capsule UI coming in Phase 5.
          </p>
        </div>
      </div>
    </>
  );
}
