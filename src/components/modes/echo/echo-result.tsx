"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Check, Copy, ExternalLink, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/utils/copy";

/**
 * Confirmation panel after an auction is opened. Shows the public URL
 * to share with bidders + the cryptographic deadline (close time + drand
 * round). Brutalist square-edged box; the URL is the only thing the
 * auctioneer needs to keep — anyone with it can bid or, after close,
 * reveal every bid.
 */
export function EchoResult({
  auctionUrl,
  closesAt,
  drandRound,
  onReset,
}: {
  auctionUrl: string;
  closesAt: Date;
  drandRound: number;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const ok = await copyToClipboard(auctionUrl);
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
      <div className="border-2 border-foreground bg-muted/30 p-5">
        <p className="text-muted-foreground mb-2 text-xs tracking-widest uppercase">
          Auction URL
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="bg-background flex-1 truncate border-2 border-foreground px-3 py-2 font-mono text-xs">
            {auctionUrl}
          </code>
          <Button onClick={copy} size="sm" className="gap-2">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <div className="text-muted-foreground mt-4 grid gap-2 text-xs sm:grid-cols-2">
          <div>
            <p className="text-foreground font-bold uppercase tracking-wide">
              Closes at
            </p>
            <p className="font-mono">{format(closesAt, "PPpp")}</p>
          </div>
          <div>
            <p className="text-foreground font-bold uppercase tracking-wide">
              Drand round
            </p>
            <p className="font-mono">{drandRound.toLocaleString()}</p>
          </div>
        </div>
        <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
          Share this URL with bidders. Each bid is sealed under the same
          drand round — every bid becomes decryptable at the same instant
          when that round is signed. Until then, no one — including you,
          the auctioneer — can read any bid.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={auctionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:bg-muted inline-flex h-9 items-center gap-2 border-2 border-foreground px-4 text-sm font-bold uppercase tracking-wide"
        >
          <ExternalLink className="size-3.5" /> Open auction page
        </a>
        <Button variant="ghost" size="sm" onClick={onReset} className="gap-2">
          <RotateCcw className="size-3.5" /> Open another
        </Button>
      </div>
    </div>
  );
}
