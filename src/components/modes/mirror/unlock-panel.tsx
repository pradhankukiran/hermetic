"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Download,
  FileLock2,
  GitCompareArrows,
  Loader2,
  LockOpen,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { utf8Decode } from "@/lib/crypto";
import { unlockMirrorClientSide } from "@/lib/modes/mirror";
import { formatBytes } from "@/lib/utils/format";

type Decoded = { filename: string; mimeType: string; bytes: Uint8Array };

type Phase =
  | { kind: "collecting" }
  | { kind: "decrypting" }
  | { kind: "ready"; decoded: Decoded }
  | { kind: "error"; message: string };

export function MirrorUnlockPanel({ cid }: { cid: string }) {
  const [phase, setPhase] = useState<Phase>({ kind: "collecting" });
  const [halfA, setHalfA] = useState("");
  const [halfB, setHalfB] = useState("");

  const filledA = halfA.trim().length > 0;
  const filledB = halfB.trim().length > 0;
  const canCombine = phase.kind === "collecting" && filledA && filledB;

  async function combineAndDecrypt() {
    setPhase({ kind: "decrypting" });
    try {
      const decoded = await unlockMirrorClientSide({
        cid,
        halfA,
        halfB,
      });
      setPhase({ kind: "ready", decoded });
    } catch (err) {
      setPhase({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to combine halves",
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
          <GitCompareArrows className="size-5" strokeWidth={2.5} />
          <h2 className="text-lg font-semibold">
            Unlock with both halves
          </h2>
        </div>
        <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
          Both holders should be at this screen at the same time. Paste each
          half into its slot below. The browser combines them locally and
          decrypts the contents — neither half is ever sent to our servers.
        </p>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="mirror-half-a"
              className="text-muted-foreground text-xs font-bold uppercase tracking-widest"
            >
              Half A
            </label>
            <Input
              id="mirror-half-a"
              placeholder="paste half A here"
              value={halfA}
              onChange={(e) => setHalfA(e.target.value)}
              className="font-mono text-xs"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="mirror-half-b"
              className="text-muted-foreground text-xs font-bold uppercase tracking-widest"
            >
              Half B
            </label>
            <Input
              id="mirror-half-b"
              placeholder="paste half B here"
              value={halfB}
              onChange={(e) => setHalfB(e.target.value)}
              className="font-mono text-xs"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
        </div>

        <p className="text-muted-foreground mt-3 text-xs">
          {filledA && filledB
            ? "Both halves entered."
            : `${[filledA, filledB].filter(Boolean).length} of 2 halves entered`}
        </p>
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
