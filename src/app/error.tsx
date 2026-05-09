"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // No PII in errors, but still — don't ship to a third party.
    console.error("[hermetic]", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center sm:px-6">
      <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full">
        <AlertTriangle className="size-6" strokeWidth={1.75} />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Something broke.</h1>
        <p className="text-muted-foreground max-w-md">
          The seal held — your data is safe. Something on the page itself failed.
        </p>
      </div>
      <Button onClick={reset} variant="outline" className="gap-2">
        <RotateCw className="size-4" /> Try again
      </Button>
    </div>
  );
}
