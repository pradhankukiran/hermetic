import Link from "next/link";
import { Handshake } from "lucide-react";

import { ModeHero } from "@/components/layout/mode-hero";
import { CreatePactForm } from "@/components/modes/pact/create-pact-form";
import { buttonVariants } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";

export default async function PactPage() {
  const user = await getSessionUser();

  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:py-24">
      <ModeHero
        icon={Handshake}
        title="Pact"
        tagline="Sealed by consensus"
        description="N-of-N agreement. Encrypt your content and split the key across every party. There's no quorum, no timer, no fallback — every party must consent before the seal opens."
      />
      <section className="flex flex-col">
        {user ? (
          <CreatePactForm />
        ) : (
          <div className="border-border/70 bg-muted/30 flex flex-col items-start gap-3 rounded-xl border p-6">
            <p className="text-sm font-medium">Sign in to create a Pact.</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Pacts need an owner so we can deliver the share emails to every
              party. Drops and Capsules don&apos;t require an account.
            </p>
            <Link
              href="/auth/signin"
              className={buttonVariants({ variant: "default" }) + " mt-1"}
            >
              Sign in with magic link
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
