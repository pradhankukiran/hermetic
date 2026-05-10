"use client";

import { useState } from "react";
import { Check, Copy, RotateCcw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/utils/copy";

export function MirrorResult({
  mirrorUrl,
  onReset,
}: {
  mirrorUrl: string;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const ok = await copyToClipboard(mirrorUrl);
    if (ok) {
      setCopied(true);
      toast.success("Mirror URL copied");
      setTimeout(() => setCopied(false), 1800);
    } else {
      toast.error("Couldn't copy — select and copy manually");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="border-border/70 bg-muted/30 rounded-xl border p-5">
        <p className="text-muted-foreground mb-2 text-xs tracking-widest uppercase">
          Mirror URL
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="bg-background flex-1 truncate rounded-md border px-3 py-2 font-mono text-xs">
            {mirrorUrl}
          </code>
          <Button onClick={copy} size="sm" className="gap-2">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
          Both holders just received an email with their half of the key.
          When they are ready, they meet at this URL and paste their halves
          into the same browser session to unlock.
        </p>
      </div>

      <div className="border-amber-500/30 bg-amber-500/5 flex gap-3 rounded-xl border p-4">
        <ShieldAlert className="text-amber-500 size-5 shrink-0" strokeWidth={1.75} />
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">Important</p>
          <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-xs leading-relaxed">
            <li>
              We don&apos;t store either half. If a holder loses theirs, the
              Mirror is permanently locked.
            </li>
            <li>
              Either holder alone cannot unlock — withholding a half just
              traps both of you. That is the point.
            </li>
            <li>
              Both halves must be present in the same browser session. They
              are never sent to our servers during unlock.
            </li>
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={onReset} className="gap-2">
          <RotateCcw className="size-3.5" /> Create another
        </Button>
      </div>
    </div>
  );
}
