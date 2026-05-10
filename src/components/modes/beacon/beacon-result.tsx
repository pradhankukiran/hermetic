"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, KeyRound, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/utils/copy";

/**
 * Post-creation panel — shows the share URL and the passphrase the owner
 * must keep to unlock the beacon. The passphrase only ever lives in the
 * owner's hands; it never touches the server, the IPFS gateway, or the DB.
 */
export function BeaconResult({
  shareUrl,
  passphrase,
  targetHeight,
  chainId,
  onReset,
}: {
  shareUrl: string;
  passphrase: string;
  targetHeight: bigint;
  chainId: number;
  onReset: () => void;
}) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function copyUrl() {
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setCopiedUrl(true);
      toast.success("Link copied");
      setTimeout(() => setCopiedUrl(false), 1800);
    } else {
      toast.error("Couldn't copy — select and copy manually");
    }
  }

  async function copyPass() {
    const ok = await copyToClipboard(passphrase);
    if (ok) {
      setCopiedPass(true);
      toast.success("Passphrase copied");
      setTimeout(() => setCopiedPass(false), 1800);
    } else {
      toast.error("Couldn't copy — select and copy manually");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="border-border/70 bg-muted/30 rounded-xl border p-5">
        <p className="text-muted-foreground mb-2 text-xs tracking-widest uppercase">
          Beacon URL
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="bg-background flex-1 truncate rounded-md border px-3 py-2 font-mono text-xs">
            {shareUrl}
          </code>
          <Button onClick={copyUrl} size="sm" className="gap-2">
            {copiedUrl ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            {copiedUrl ? "Copied" : "Copy"}
          </Button>
        </div>
        <div className="text-muted-foreground mt-4 grid gap-2 text-xs sm:grid-cols-2">
          <div>
            <p className="text-foreground font-medium">Unlocks at block</p>
            <p className="font-mono">{targetHeight.toString()}</p>
          </div>
          <div>
            <p className="text-foreground font-medium">Chain</p>
            <p className="font-mono">
              {chainId === 1 ? "Ethereum mainnet" : `chainId=${chainId}`}
            </p>
          </div>
        </div>
      </div>

      <div className="border-2 border-foreground bg-background p-5">
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="size-4" strokeWidth={2.5} />
          <p className="text-sm font-bold uppercase tracking-wide">
            Owner passphrase
          </p>
        </div>
        <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
          Save this somewhere safe (a password manager). The chain enforces{" "}
          <span className="text-foreground font-medium">when</span> the
          beacon can be unlocked; this passphrase enforces{" "}
          <span className="text-foreground font-medium">who</span>. Without it,
          the contents stay sealed forever — even after the block is mined.
          Hermetic does not store it.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="bg-muted flex-1 break-all rounded-md border px-3 py-2 font-mono text-xs">
            {showPass ? passphrase : "•".repeat(Math.min(48, passphrase.length))}
          </code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPass((v) => !v)}
          >
            {showPass ? "Hide" : "Reveal"}
          </Button>
          <Button onClick={copyPass} size="sm" className="gap-2">
            {copiedPass ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            {copiedPass ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:bg-muted inline-flex h-9 items-center gap-2 border-2 border-foreground px-4 text-sm font-bold uppercase tracking-wide"
        >
          <ExternalLink className="size-3.5" /> Open beacon view
        </a>
        <Button variant="ghost" size="sm" onClick={onReset} className="gap-2">
          <RotateCcw className="size-3.5" /> Seal another
        </Button>
      </div>
    </div>
  );
}
