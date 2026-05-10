import Link from "next/link";
import { Power } from "lucide-react";

import { ModeHero } from "@/components/layout/mode-hero";
import { CreateSleeperForm } from "@/components/modes/sleeper/create-sleeper-form";
import { buttonVariants } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";

export default async function SleeperPage() {
  const user = await getSessionUser();

  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:py-24">
      <ModeHero
        icon={Power}
        title="Sleeper"
        tagline="Sealed by command"
        description="Encrypt now, sit on it. The seal stays closed until you, the owner, click release. No timer, no link, no trustees — just your call."
      />
      <section className="flex flex-col">
        {user ? (
          <CreateSleeperForm />
        ) : (
          <div className="border-border/70 bg-muted/30 flex flex-col items-start gap-3 rounded-xl border p-6">
            <p className="text-sm font-medium">Sign in to create a Sleeper.</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Sleepers need an owner so we can verify who is allowed to release
              or re-seal. Drops and Capsules don&apos;t require an account.
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
