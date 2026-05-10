"use client";

import { useState } from "react";
import { Check, Copy, RotateCcw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/utils/copy";

export function CreatePactResult({
  pactUrl,
  partyCountN,
  emailsSent,
  emailsFailed,
  onReset,
}: {
  pactUrl: string;
  partyCountN: number;
  emailsSent: number;
  emailsFailed: number;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const ok = await copyToClipboard(pactUrl);
    if (ok) {
      setCopied(true);
      toast.success("Pact URL copied");
      setTimeout(() => setCopied(false), 1800);
    } else {
      toast.error("Couldn't copy — select and copy manually");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="border-border/70 bg-muted/30 rounded-xl border p-5">
        <p className="text-muted-foreground mb-2 text-xs tracking-widest uppercase">
          Pact URL
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="bg-background flex-1 truncate rounded-md border px-3 py-2 font-mono text-xs">
            {pactUrl}
          </code>
          <Button onClick={copy} size="sm" className="gap-2">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <div className="text-muted-foreground mt-4 grid gap-2 text-xs sm:grid-cols-2">
          <div>
            <p className="text-foreground font-medium">Threshold</p>
            <p>
              {partyCountN} of {partyCountN} (every party)
            </p>
          </div>
          <div>
            <p className="text-foreground font-medium">Parties notified</p>
            <p>
              {emailsSent}/{partyCountN}
              {emailsFailed > 0 ? ` · ${emailsFailed} failed` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="border-amber-500/30 bg-amber-500/5 flex gap-3 rounded-xl border p-4">
        <ShieldAlert className="text-amber-500 size-5 shrink-0" strokeWidth={1.75} />
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">Important</p>
          <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-xs leading-relaxed">
            <li>
              Every party just received their share by email. We don&apos;t
              store them. <span className="text-foreground font-medium">If even one share is lost, the pact is unrecoverable.</span>
            </li>
            <li>
              All {partyCountN} parties must gather on the Pact URL above and
              paste their shares simultaneously. Shares are combined client-side
              and never leave the browser.
            </li>
            <li>
              No timer, no fallback. The seal is openable from this moment —
              but only when every party consents.
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
