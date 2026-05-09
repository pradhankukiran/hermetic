import { Link2 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";

export default function DropPage() {
  return (
    <>
      <PageHeader
        icon={Link2}
        eyebrow="Drop · sealed by link"
        title="Encrypt and share."
        description="Drag a file or paste text. Hermetic encrypts it in your browser, uploads only the ciphertext to IPFS, and gives you a one-time link. The decryption key lives in the URL fragment — never sent to a server."
      />
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <div className="border-border/60 bg-muted/30 rounded-xl border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">
            Drop UI coming next.
          </p>
        </div>
      </div>
    </>
  );
}
