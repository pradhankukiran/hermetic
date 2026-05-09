import { Hourglass } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { CreateCapsuleForm } from "@/components/modes/capsule/create-capsule-form";

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
        <CreateCapsuleForm />
      </div>
    </>
  );
}
