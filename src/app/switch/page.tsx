import { Users } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";

export default function SwitchPage() {
  return (
    <>
      <PageHeader
        icon={Users}
        eyebrow="Switch · sealed by trust"
        title="A dead-man's switch you control."
        description="Encrypt your content and split the key across your trustees with Shamir's Secret Sharing. Hermetic checks in with you on a schedule — if you go silent, your trustees can combine their shares to unlock your message."
      />
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <div className="border-border/60 bg-muted/30 rounded-xl border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">
            Switch UI coming in Phase 6.
          </p>
        </div>
      </div>
    </>
  );
}
