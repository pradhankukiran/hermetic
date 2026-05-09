"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  Download,
  FileLock2,
  Hourglass,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { utf8Decode } from "@/lib/crypto";
import { fetchCapsuleHeader, openCapsule, type OpenedCapsule } from "@/lib/modes/capsule";

type Header = {
  filename: string;
  mimeType: string;
  size: number;
  drandRound: number;
  unlockAt: Date;
};

type Phase =
  | { kind: "loading-header" }
  | { kind: "waiting"; header: Header }
  | { kind: "unlocking"; header: Header }
  | { kind: "ready"; header: Header; capsule: OpenedCapsule }
  | { kind: "error"; message: string };

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function useCountdown(target: Date) {
  const [now, setNow] = useState<number>(() => Date.now());
  const targetMs = target.getTime();
  useEffect(() => {
    if (targetMs <= Date.now()) return;
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (targetMs <= current) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [targetMs]);
  return targetMs - now;
}

export function OpenCapsule({ cid }: { cid: string }) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading-header" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const header = await fetchCapsuleHeader(cid);
        if (cancelled) return;
        if (header.unlockAt.getTime() <= Date.now()) {
          setPhase({ kind: "unlocking", header });
        } else {
          setPhase({ kind: "waiting", header });
        }
      } catch (err) {
        if (cancelled) return;
        setPhase({
          kind: "error",
          message:
            err instanceof Error ? err.message : "Failed to fetch capsule",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cid]);

  // Once unlockAt has passed (and we are in 'waiting'), bump to 'unlocking'.
  // Always go through setTimeout — even with ms<=0, setTimeout dispatches
  // asynchronously so we avoid a synchronous setState-in-effect cascade.
  // Depend on a stable scalar (the unlock instant) rather than the whole phase
  // object so the timer isn't recreated on unrelated phase transitions.
  const waitingUntil =
    phase.kind === "waiting" ? phase.header.unlockAt.getTime() : null;
  useEffect(() => {
    if (waitingUntil == null) return;
    const ms = Math.max(0, waitingUntil - Date.now());
    const id = setTimeout(
      () =>
        setPhase((p) =>
          p.kind === "waiting" ? { kind: "unlocking", header: p.header } : p,
        ),
      ms,
    );
    return () => clearTimeout(id);
  }, [waitingUntil]);

  // When in 'unlocking', actually decrypt. Depend on the drand round (a stable
  // scalar) so we don't re-run on unrelated state changes.
  const unlockingRound =
    phase.kind === "unlocking" ? phase.header.drandRound : null;
  useEffect(() => {
    if (unlockingRound == null) return;
    let cancelled = false;
    (async () => {
      try {
        const capsule = await openCapsule(cid);
        if (cancelled) return;
        setPhase((p) =>
          p.kind === "unlocking"
            ? { kind: "ready", header: p.header, capsule }
            : p,
        );
      } catch (err) {
        if (cancelled) return;
        setPhase({
          kind: "error",
          message:
            err instanceof Error
              ? err.message
              : "Failed to decrypt — drand round may not yet be available",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [unlockingRound, cid]);

  if (phase.kind === "loading-header") {
    return (
      <div className="border-border/60 bg-muted/20 flex items-center gap-3 rounded-xl border border-dashed p-10">
        <Loader2 className="size-5 animate-spin" />
        <p className="text-muted-foreground text-sm">
          Fetching capsule envelope from IPFS…
        </p>
      </div>
    );
  }

  if (phase.kind === "error") {
    return (
      <div className="border-destructive/30 bg-destructive/5 flex flex-col gap-2 rounded-xl border p-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-destructive size-4" />
          <p className="text-sm font-medium">Couldn&apos;t open capsule</p>
        </div>
        <p className="text-muted-foreground text-sm">{phase.message}</p>
      </div>
    );
  }

  if (phase.kind === "waiting") {
    return <Countdown header={phase.header} />;
  }

  if (phase.kind === "unlocking") {
    return (
      <div className="border-border/60 bg-muted/20 flex flex-col gap-2 rounded-xl border border-dashed p-10">
        <div className="flex items-center gap-3">
          <Loader2 className="size-5 animate-spin" />
          <p className="text-sm font-medium">Drand round reached — decrypting…</p>
        </div>
        <p className="text-muted-foreground text-xs">
          Fetching beacon signature for round{" "}
          <span className="font-mono">
            {phase.header.drandRound.toLocaleString()}
          </span>
        </p>
      </div>
    );
  }

  return <CapsuleContent header={phase.header} capsule={phase.capsule} />;
}

function Countdown({ header }: { header: Header }) {
  const ms = useCountdown(header.unlockAt);
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return (
    <div className="border-border/70 bg-muted/30 flex flex-col gap-5 rounded-xl border p-6">
      <div className="flex items-center gap-3">
        <Hourglass className="size-5" strokeWidth={1.75} />
        <h2 className="text-lg font-semibold">Sealed until</h2>
      </div>

      <p className="text-3xl font-medium tracking-tight sm:text-4xl">
        {format(header.unlockAt, "PPpp")}
      </p>

      <div className="grid grid-cols-4 gap-3 text-center">
        {[
          { label: "Days", value: days },
          { label: "Hours", value: hours },
          { label: "Minutes", value: mins },
          { label: "Seconds", value: secs },
        ].map((unit) => (
          <div
            key={unit.label}
            className="bg-background flex flex-col gap-0.5 rounded-lg border p-3"
          >
            <p className="font-mono text-2xl font-semibold tabular-nums">
              {unit.value.toString().padStart(2, "0")}
            </p>
            <p className="text-muted-foreground text-[10px] tracking-widest uppercase">
              {unit.label}
            </p>
          </div>
        ))}
      </div>

      <div className="text-muted-foreground grid gap-1 text-xs">
        <p>
          Drand round:{" "}
          <span className="text-foreground font-mono">
            {header.drandRound.toLocaleString()}
          </span>
        </p>
        <p>
          Filename:{" "}
          <span className="text-foreground font-mono">{header.filename}</span> ·{" "}
          {formatBytes(header.size)}
        </p>
      </div>

      <p className="text-muted-foreground text-xs leading-relaxed">
        This page will automatically attempt to unlock when the round arrives.
        Until then, no one — not us, not the network, not even the recipient —
        can read the contents.
      </p>
    </div>
  );
}

function CapsuleContent({
  header,
  capsule,
}: {
  header: Header;
  capsule: OpenedCapsule;
}) {
  const isText = capsule.mimeType.startsWith("text/");
  const text = isText ? utf8Decode(capsule.bytes) : null;

  function download() {
    const buffer = new ArrayBuffer(capsule.bytes.byteLength);
    new Uint8Array(buffer).set(capsule.bytes);
    const blob = new Blob([buffer], { type: capsule.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = capsule.filename;
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
            <p className="truncate text-sm font-medium">{capsule.filename}</p>
            <p className="text-muted-foreground text-xs">
              {formatBytes(capsule.bytes.byteLength)} · {capsule.mimeType} ·
              unlocked{" "}
              <span className="font-mono">
                {format(header.unlockAt, "PPp")}
              </span>
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
