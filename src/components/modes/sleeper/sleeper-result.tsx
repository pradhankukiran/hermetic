"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, RotateCcw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/utils/copy";

export function SleeperResult({
  shareUrl,
  sleeperId,
  onReset,
}: {
  shareUrl: string;
  sleeperId: string;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setCopied(true);
      toast.success("Sleeper URL copied");
      setTimeout(() => setCopied(false), 1800);
    } else {
      toast.error("Couldn't copy — select and copy manually");
    }
  }

  // Strip the fragment so the owner-page link doesn't leak the key in
  // navigation history (the fragment is only needed by the recipient).
  const ownerUrl = `/sleeper/${sleeperId}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="border-border/70 bg-muted/30 rounded-xl border p-5">
        <p className="text-muted-foreground mb-2 text-xs tracking-widest uppercase">
          Share URL — sealed until you release
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
        <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
          The decryption key lives in the URL fragment (after <code>#</code>).
          Hand this URL to whoever should eventually read the contents — they
          will see &ldquo;sealed&rdquo; until you press <em>Release</em>.
        </p>
      </div>

      <div className="border-amber-500/30 bg-amber-500/5 flex gap-3 rounded-xl border p-4">
        <ShieldAlert
          className="text-amber-500 size-5 shrink-0"
          strokeWidth={1.75}
        />
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">Important</p>
          <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-xs leading-relaxed">
            <li>
              Save the share URL now — only the URL fragment can decrypt the
              content. We don&apos;t store the key.
            </li>
            <li>
              Until you press <em>Release</em>, the page stays sealed even if
              the URL is shared widely.
            </li>
            <li>
              You can re-seal (revoke) at any time. Anyone who already grabbed
              the CID could still pull the ciphertext from IPFS — but without
              the URL fragment key, it&apos;s noise.
            </li>
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={ownerUrl}
          className="hover:bg-muted inline-flex h-9 items-center gap-2 border-2 border-foreground px-4 text-sm font-bold uppercase tracking-wide"
        >
          <ExternalLink className="size-3.5" /> Open owner page
        </a>
        <Button variant="ghost" size="sm" onClick={onReset} className="gap-2">
          <RotateCcw className="size-3.5" /> Seal another
        </Button>
      </div>
    </div>
  );
}
