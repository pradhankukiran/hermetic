"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Download,
  FileLock2,
  Loader2,
  Moon,
  ShieldOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { utf8Decode } from "@/lib/crypto";
import { openSleeper, type OpenedSleeper } from "@/lib/modes/sleeper";
import { formatBytes } from "@/lib/utils/format";

type Phase =
  | { kind: "loading" }
  | { kind: "missing-key" }
  | { kind: "result"; opened: OpenedSleeper }
  | { kind: "error"; message: string };

export function OpenSleeper({ sleeperId }: { sleeperId: string }) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fragment =
        typeof window !== "undefined" ? window.location.hash.slice(1) : "";
      try {
        const opened = await openSleeper({
          id: sleeperId,
          // openSleeper only consumes the key when status === "released".
          // For asleep / revoked the key is never read, so an empty string
          // is fine. For released without a real key, decryption throws and
          // we surface "missing-key" below.
          keyB64Url: fragment,
        });
        if (cancelled) return;
        setPhase({ kind: "result", opened });
      } catch (err) {
        if (cancelled) return;
        if (!fragment) {
          // Decryption was attempted (so the seal is released) but the
          // visitor has no key in their URL — surface that explicitly.
          setPhase({ kind: "missing-key" });
          return;
        }
        const message =
          err instanceof Error ? err.message : "Failed to open sleeper";
        setPhase({ kind: "error", message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sleeperId]);

  if (phase.kind === "loading") {
    return (
      <div className="border-border/60 bg-muted/20 flex items-center gap-3 rounded-xl border border-dashed p-10">
        <Loader2 className="size-5 animate-spin" />
        <p className="text-muted-foreground text-sm">
          Checking seal status…
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
          truncated by an email client or chat app.
        </p>
      </div>
    );
  }

  if (phase.kind === "error") {
    return (
      <div className="border-destructive/30 bg-destructive/5 flex flex-col gap-2 rounded-xl border p-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-destructive size-4" />
          <p className="text-sm font-medium">Couldn&apos;t open this sleeper</p>
        </div>
        <p className="text-muted-foreground text-sm">{phase.message}</p>
        <p className="text-muted-foreground text-xs">
          The owner may have re-sealed it, the key in your URL is wrong, or
          the IPFS gateway is temporarily unavailable.
        </p>
      </div>
    );
  }

  if (phase.opened.kind === "asleep") {
    return <AsleepCard />;
  }

  if (phase.opened.kind === "revoked") {
    return <RevokedCard />;
  }

  return <ReleasedContent opened={phase.opened} />;
}

function AsleepCard() {
  return (
    <div className="border-2 border-foreground bg-background flex flex-col gap-3 p-6">
      <div className="flex items-center gap-3">
        <div className="bg-foreground text-background flex size-10 shrink-0 items-center justify-center">
          <Moon className="size-5" strokeWidth={2.5} />
        </div>
        <h2 className="text-lg font-black uppercase tracking-tight">
          Sealed by command
        </h2>
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">
        This sleeper has not yet been released. The owner controls when it
        becomes readable — there is no timer, no countdown, no automatic
        unlock. Bookmark this URL and check back later.
      </p>
      <p className="text-muted-foreground text-xs leading-relaxed">
        Even though you may have the decryption key in your URL fragment,
        Hermetic is not revealing the ciphertext location until the owner
        explicitly releases it.
      </p>
    </div>
  );
}

function RevokedCard() {
  return (
    <div className="border-amber-500/30 bg-amber-500/5 flex gap-3 rounded-xl border p-5">
      <ShieldOff
        className="text-amber-500 size-5 shrink-0"
        strokeWidth={1.75}
      />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Sleeper revoked</p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          The owner has re-sealed this sleeper. It is no longer publicly
          available through Hermetic. If they release it again later, this URL
          will resume working.
        </p>
      </div>
    </div>
  );
}

function ReleasedContent({
  opened,
}: {
  opened: Extract<OpenedSleeper, { kind: "released" }>;
}) {
  const isText = opened.mimeType.startsWith("text/");
  const text = isText ? utf8Decode(opened.bytes) : null;

  function download() {
    const buffer = new ArrayBuffer(opened.bytes.byteLength);
    new Uint8Array(buffer).set(opened.bytes);
    const blob = new Blob([buffer], { type: opened.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = opened.filename;
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
            <p className="truncate text-sm font-medium">{opened.filename}</p>
            <p className="text-muted-foreground text-xs">
              {formatBytes(opened.bytes.byteLength)} · {opened.mimeType}
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
