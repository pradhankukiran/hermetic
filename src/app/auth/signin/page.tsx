import { KeyRound } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { SignInForm } from "@/components/auth/signin-form";

export default function SignInPage() {
  return (
    <>
      <PageHeader
        icon={KeyRound}
        eyebrow="Sign in · magic link"
        title="Sign in to Hermetic."
        description="Hermetic uses passwordless magic links. We email you a link, you click it, you're in. We hash your email server-side — your address is not stored in plaintext."
      />
      <div className="mx-auto w-full max-w-md px-4 py-10 sm:px-6">
        <SignInForm />
      </div>
    </>
  );
}
