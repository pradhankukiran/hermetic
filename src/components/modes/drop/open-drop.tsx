"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Download, FileLock2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { utf8Decode } from "@/lib/crypto";
import { gatewayUrl } from "@/lib/ipfs/gateway";
import { openDrop, type OpenedDrop } from "@/lib/modes/drop";

type Phase =
  | { kind: "loading" }
  | { kind: "missing-key" }
  | { kind: "ready"; drop: OpenedDrop }
  | { kind: "error"; message: string };

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function OpenDrop({ cid }: { cid: string }) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fragment = window.location.hash.slice(1);
      if (!fragment) {
        setPhase({ kind: "missing-key" });
        return;
      }
      try {
        const drop = await openDrop(gatewayUrl(cid), fragment);
        if (!cancelled) setPhase({ kind: "ready", drop });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to decrypt";
        setPhase({ kind: "error", message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cid]);

  if (phase.kind === "loading") {
    return (
      <div className="border-border/60 bg-muted/20 flex items-center gap-3 rounded-xl border border-dashed p-10">
        <Loader2 className="size-5 animate-spin" />
        <p className="text-muted-foreground text-sm">
          Fetching ciphertext from IPFS and decrypting in your browser…
        </p>
      </div>
    );
  }

  if (phase.kind === "missing-key") {
    return (
      <div className="border-destructive/30 bg-destructive/5 flex flex-col gap-2 rounded-xl border p-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-destructive size-4" />
          <p className="text-sm font-medium">Decryption key missing</p>
        </div>
        <p className="text-muted-foreground text-sm">
          This URL is incomplete. The decryption key lives after the{" "}
          <code>#</code> in the share URL — make sure your link wasn&apos;t
          truncated by an email client or a chat app.
        </p>
      </div>
    );
  }

  if (phase.kind === "error") {
    return (
      <div className="border-destructive/30 bg-destructive/5 flex flex-col gap-2 rounded-xl border p-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-destructive size-4" />
          <p className="text-sm font-medium">Couldn&apos;t open this drop</p>
        </div>
        <p className="text-muted-foreground text-sm">{phase.message}</p>
        <p className="text-muted-foreground text-xs">
          The ciphertext may have been removed, the key is wrong, or the IPFS
          gateway is temporarily unavailable.
        </p>
      </div>
    );
  }

  return <DropContent drop={phase.drop} />;
}

function DropContent({ drop }: { drop: OpenedDrop }) {
  const isText = drop.mimeType.startsWith("text/");
  const text = isText ? utf8Decode(drop.bytes) : null;

  function download() {
    const buffer = new ArrayBuffer(drop.bytes.byteLength);
    new Uint8Array(buffer).set(drop.bytes);
    const blob = new Blob([buffer], { type: drop.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = drop.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="border-border/70 bg-muted/30 flex items-center justify-between gap-4 rounded-xl border p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="bg-background flex size-10 shrink-0 items-center justify-center rounded-lg border">
            <FileLock2 className="size-4" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{drop.filename}</p>
            <p className="text-muted-foreground text-xs">
              {formatBytes(drop.bytes.byteLength)} · {drop.mimeType}
            </p>
          </div>
        </div>
        <Button onClick={download} size="sm" className="gap-2">
          <Download className="size-4" /> Download
        </Button>
      </div>

      {text != null ? (
        <div className="border-border/70 bg-muted/30 rounded-xl border p-5">
          <p className="text-muted-foreground mb-2 text-xs tracking-widest uppercase">
            Decrypted message
          </p>
          <pre className="bg-background overflow-auto rounded-md border p-4 text-sm whitespace-pre-wrap">
            {text}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
