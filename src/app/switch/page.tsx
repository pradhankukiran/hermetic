import Link from "next/link";
import { KeyRound } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { CreateSwitchForm } from "@/components/modes/switch/create-switch-form";
import { buttonVariants } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";

export default async function SwitchPage() {
  const user = await getSessionUser();

  return (
    <>
      <PageHeader
        icon={KeyRound}
        eyebrow="Switch · sealed by trust"
        title="A dead-man's switch you control."
        description="Encrypt your content and split the key across your trustees with Shamir's Secret Sharing. Hermetic checks in with you on a schedule — if you go silent, your trustees can combine their shares to unlock your message."
      />
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        {user ? (
          <CreateSwitchForm />
        ) : (
          <div className="border-border/70 bg-muted/30 flex flex-col items-start gap-3 rounded-xl border p-6">
            <p className="text-sm font-medium">Sign in to create a Switch.</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Switches need an owner so we can track check-ins and notify your
              trustees if you go silent. Drops and Capsules don&apos;t require an
              account.
            </p>
            <Link
              href="/auth/signin"
              className={buttonVariants({ variant: "default" }) + " mt-1"}
            >
              Sign in with magic link
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
