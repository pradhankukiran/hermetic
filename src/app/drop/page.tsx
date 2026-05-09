import { Send } from "lucide-react";

import { ModeHero } from "@/components/layout/mode-hero";
import { CreateDropForm } from "@/components/modes/drop/create-drop-form";

export default function DropPage() {
  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:py-24">
      <ModeHero
        icon={Send}
        title="Drop"
        tagline="Sealed by link"
        description="Drag a file or paste text. Hermetic encrypts it in your browser, uploads only the ciphertext to IPFS, and gives you a one-time link. The decryption key lives in the URL fragment — never sent to a server."
      />
      <section className="flex flex-col">
        <CreateDropForm />
      </section>
    </div>
  );
}
