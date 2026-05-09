"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Download,
  FileLock2,
  Key,
  Loader2,
  LockOpen,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { utf8Decode } from "@/lib/crypto";
import { unlockSwitchClientSide } from "@/lib/modes/switch";
import { formatBytes } from "@/lib/utils/format";

type Decoded = { filename: string; mimeType: string; bytes: Uint8Array };

type Phase =
  | { kind: "collecting" }
  | { kind: "decrypting" }
  | { kind: "ready"; decoded: Decoded }
  | { kind: "error"; message: string };

export function SwitchUnlockPanel({
  cid,
  thresholdK,
}: {
  cid: string;
  thresholdK: number;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "collecting" });
  const [shares, setShares] = useState<string[]>(
    Array.from({ length: thresholdK }, () => ""),
  );

  const filledShares = shares.filter((s) => s.trim().length > 0);
  const canCombine =
    phase.kind === "collecting" && filledShares.length >= thresholdK;

  function setShareAt(i: number, value: string) {
    const next = shares.slice();
    next[i] = value;
    setShares(next);
  }

  function addShareSlot() {
    setShares([...shares, ""]);
  }

  async function combineAndDecrypt() {
    setPhase({ kind: "decrypting" });
    try {
      const decoded = await unlockSwitchClientSide({
        cid,
        shareStrings: filledShares.slice(0, thresholdK),
      });
      setPhase({ kind: "ready", decoded });
    } catch (err) {
      setPhase({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to combine shares",
      });
    }
  }

  if (phase.kind === "ready") {
    return <UnlockedContent decoded={phase.decoded} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="border-border/70 bg-muted/30 rounded-xl border p-5">
        <div className="mb-4 flex items-center gap-3">
          <LockOpen className="size-5" strokeWidth={1.75} />
          <h2 className="text-lg font-semibold">
            Unlock with {thresholdK} of N shares
          </h2>
        </div>
        <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
          Each trustee should paste their share below. When at least{" "}
          <span className="text-foreground font-medium">{thresholdK}</span> are
          entered, the browser combines them and decrypts the content. Shares
          never leave this page.
        </p>

        <div className="flex flex-col gap-2">
          {shares.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-muted-foreground bg-background flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium">
                <Key className="size-3" />
              </span>
              <Input
                placeholder={`Share #${i + 1}`}
                value={s}
                onChange={(e) => setShareAt(i, e.target.value)}
                className="flex-1 font-mono text-xs"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addShareSlot}
            className="gap-1"
          >
            Add another slot
          </Button>
          <p className="text-muted-foreground text-xs">
            {filledShares.length} of {thresholdK} required
          </p>
        </div>
      </div>

      <Button
        onClick={combineAndDecrypt}
        disabled={!canCombine}
        className="self-start gap-2"
      >
        {phase.kind === "decrypting" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <LockOpen className="size-4" />
        )}
        Combine &amp; decrypt
      </Button>

      {phase.kind === "error" ? (
        <div className="border-destructive/30 bg-destructive/5 flex items-start gap-2 rounded-xl border p-4">
          <AlertTriangle className="text-destructive mt-0.5 size-4" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">Couldn&apos;t unlock</p>
            <p className="text-muted-foreground text-xs">{phase.message}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function UnlockedContent({ decoded }: { decoded: Decoded }) {
  const isText = decoded.mimeType.startsWith("text/");
  const text = isText ? utf8Decode(decoded.bytes) : null;

  function download() {
    const buffer = new ArrayBuffer(decoded.bytes.byteLength);
    new Uint8Array(buffer).set(decoded.bytes);
    const blob = new Blob([buffer], { type: decoded.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = decoded.filename;
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
            <p className="truncate text-sm font-medium">{decoded.filename}</p>
            <p className="text-muted-foreground text-xs">
              {formatBytes(decoded.bytes.byteLength)} · {decoded.mimeType}
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
