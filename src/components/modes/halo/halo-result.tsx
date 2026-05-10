"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/utils/copy";

export function HaloResult({
  shareUrl,
  credentialId,
  onReset,
}: {
  shareUrl: string;
  credentialId: string;
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

  // The credential id is non-secret (it's stored in the IPFS envelope) but
  // long; show only a short prefix/suffix.
  const shortCred =
    credentialId.length > 24
      ? `${credentialId.slice(0, 10)}…${credentialId.slice(-6)}`
      : credentialId;

  return (
    <div className="flex flex-col gap-5">
      <div className="border-2 border-foreground bg-muted/40 p-5">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="size-4" strokeWidth={2.5} />
          <p className="text-xs font-bold uppercase tracking-widest">
            Sealed to this device
          </p>
        </div>
        <p className="text-muted-foreground mb-4 text-xs leading-relaxed">
          Only the passkey you just registered can unlock this halo. The link
          is safe to share, but a recipient on a different device cannot open
          it — you must open it from this device, or transfer the passkey
          (e.g. iCloud Keychain sync, hybrid transport) to another.
        </p>

        <p className="text-muted-foreground mb-2 text-xs tracking-widest uppercase">
          Unlock URL
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="bg-background flex-1 truncate border-2 border-foreground px-3 py-2 text-xs font-mono">
            {shareUrl}
          </code>
          <Button onClick={copy} variant="default" size="sm" className="gap-2">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <p className="text-muted-foreground mt-4 text-xs font-mono">
          Credential ID: {shortCred}
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
