"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function signOut() {
    setSubmitting(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Sign out failed — try again");
      setSubmitting(false);
    }
  }

  return (
    <Button
      onClick={signOut}
      variant="ghost"
      size="sm"
      disabled={submitting}
      className="gap-2"
    >
      {submitting ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <LogOut className="size-4" />
      )}
      Sign out
    </Button>
  );
}
