"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/utils/copy";

export function SigilResult({
  shareUrl,
  riddleQuestion,
  onReset,
}: {
  shareUrl: string;
  riddleQuestion: string;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1800);
    } else {
      toast.error("Couldn't copy — select and copy manually");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="border-border/70 bg-muted/30 rounded-xl border p-5">
        <p className="text-muted-foreground mb-2 text-xs tracking-widest uppercase">
          Sigil URL
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="bg-background flex-1 truncate rounded-md border px-3 py-2 font-mono text-xs">
            {shareUrl}
          </code>
          <Button onClick={copy} size="sm" className="gap-2">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <div className="text-muted-foreground mt-4 grid gap-2 text-xs">
          <div>
            <p className="text-foreground font-medium">Riddle</p>
            <p className="font-mono">{riddleQuestion}</p>
          </div>
        </div>
        <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
          Anyone with this URL sees the riddle, but only someone who can answer
          it (the witness) can decrypt. The witness is not in the URL — share
          it through a different channel from the link itself.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:bg-muted inline-flex h-9 items-center gap-2 border-2 border-foreground px-4 text-sm font-bold uppercase tracking-wide"
        >
          <ExternalLink className="size-3.5" /> Open recipient view
        </a>
        <Button variant="ghost" size="sm" onClick={onReset} className="gap-2">
          <RotateCcw className="size-3.5" /> Seal another
        </Button>
      </div>
    </div>
  );
}
