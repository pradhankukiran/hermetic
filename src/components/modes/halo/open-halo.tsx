"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Download,
  FileLock2,
  Fingerprint,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { utf8Decode } from "@/lib/crypto";
import { fetchHaloHeader, openHalo, type OpenedHalo } from "@/lib/modes/halo";
import { formatBytes } from "@/lib/utils/format";

type HaloHeader = {
  credentialId: string;
  filename: string;
  mimeType: string;
  size: number;
};

type Phase =
  | { kind: "loading" }
  | { kind: "ready"; header: HaloHeader }
  | { kind: "unlocking"; header: HaloHeader }
  | { kind: "open"; halo: OpenedHalo }
  | { kind: "error"; message: string };

export function OpenHalo({ cid }: { cid: string }) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const header = await fetchHaloHeader(cid);
        if (!cancelled) setPhase({ kind: "ready", header });
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load halo";
        setPhase({ kind: "error", message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cid]);

  async function unlock() {
    if (phase.kind !== "ready") return;
    const header = phase.header;
    setPhase({ kind: "unlocking", header });
    try {
      const halo = await openHalo(cid);
      setPhase({ kind: "open", halo });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to unlock halo";
      setPhase({ kind: "error", message });
    }
  }

  if (phase.kind === "loading") {
    return (
      <div className="border-2 border-dashed border-foreground bg-muted/20 flex items-center gap-3 p-10">
        <Loader2 className="size-5 animate-spin" strokeWidth={2.5} />
        <p className="text-muted-foreground text-sm">
          Fetching halo envelope from IPFS…
        </p>
      </div>
    );
  }

  if (phase.kind === "error") {
    return (
      <div className="flex flex-col gap-4">
        <div className="border-2 border-foreground bg-destructive/10 flex flex-col gap-2 p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4" strokeWidth={2.5} />
            <p className="text-sm font-bold uppercase tracking-tight">
              Couldn&apos;t open this halo
            </p>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {phase.message}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Reload the header — most error states (wrong device, cancel,
            // PRF unsupported) are recoverable by retrying with a different
            // passkey. Re-fetching is the cleanest reset.
            setPhase({ kind: "loading" });
            (async () => {
              try {
                const header = await fetchHaloHeader(cid);
                setPhase({ kind: "ready", header });
              } catch (err) {
                const message =
                  err instanceof Error ? err.message : "Failed to load halo";
                setPhase({ kind: "error", message });
              }
            })();
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (phase.kind === "open") {
    return <HaloContent halo={phase.halo} />;
  }

  // ready or unlocking
  const { header } = phase;
  const unlocking = phase.kind === "unlocking";
  const shortCred =
    header.credentialId.length > 24
      ? `${header.credentialId.slice(0, 10)}…${header.credentialId.slice(-6)}`
      : header.credentialId;

  return (
    <div className="flex flex-col gap-5">
      <div className="border-2 border-foreground bg-background flex items-center gap-4 p-4">
        <div className="bg-foreground text-background flex size-10 shrink-0 items-center justify-center">
          <FileLock2 className="size-4" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold uppercase tracking-tight">
            {header.filename}
          </p>
          <p className="text-muted-foreground text-xs font-mono">
            {formatBytes(header.size)} · {header.mimeType}
          </p>
        </div>
      </div>

      <div className="border-2 border-foreground bg-muted/40 p-5">
        <div className="mb-2 flex items-center gap-2">
          <Fingerprint className="size-4" strokeWidth={2.5} />
          <p className="text-xs font-bold uppercase tracking-widest">
            Passkey required
          </p>
        </div>
        <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
          This halo is sealed to a specific WebAuthn credential. Only the
          device that registered it can unlock — the unlock will fail
          silently on any other device.
        </p>
        <p className="text-muted-foreground text-xs font-mono">
          Credential ID: {shortCred}
        </p>
      </div>

      <Button
        onClick={unlock}
        disabled={unlocking}
        className="gap-2 self-start"
      >
        {unlocking ? (
          <Loader2 className="size-4 animate-spin" strokeWidth={2.5} />
        ) : (
          <Fingerprint className="size-4" strokeWidth={2.5} />
        )}
        {unlocking ? "Waiting for passkey…" : "Unlock with passkey"}
      </Button>
    </div>
  );
}

function HaloContent({ halo }: { halo: OpenedHalo }) {
  const isText = halo.mimeType.startsWith("text/");
  const text = isText ? utf8Decode(halo.bytes) : null;

  function download() {
    const buffer = new ArrayBuffer(halo.bytes.byteLength);
    new Uint8Array(buffer).set(halo.bytes);
    const blob = new Blob([buffer], { type: halo.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = halo.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="border-2 border-foreground bg-background flex items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="bg-foreground text-background flex size-10 shrink-0 items-center justify-center">
            <FileLock2 className="size-4" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold uppercase tracking-tight">
              {halo.filename}
            </p>
            <p className="text-muted-foreground text-xs font-mono">
              {formatBytes(halo.bytes.byteLength)} · {halo.mimeType}
            </p>
          </div>
        </div>
        <Button onClick={download} size="sm" className="gap-2">
          <Download className="size-4" /> Download
        </Button>
      </div>

      {text != null ? (
        <div className="border-2 border-foreground bg-muted/40 p-5">
          <p className="text-muted-foreground mb-2 text-xs tracking-widest uppercase">
            Decrypted message
          </p>
          <pre className="bg-background border-2 border-foreground p-4 text-sm whitespace-pre-wrap overflow-auto">
            {text}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
