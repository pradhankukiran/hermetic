"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Download,
  Eye,
  EyeOff,
  FileLock2,
  KeyRound,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { utf8Decode } from "@/lib/crypto";
import {
  fetchSigilHeader,
  openSigil,
  type OpenedSigil,
  type SigilHeader,
} from "@/lib/modes/sigil";
import { formatBytes } from "@/lib/utils/format";

type Phase =
  | { kind: "loading-header" }
  | { kind: "challenge"; header: SigilHeader; lastError: string | null }
  | { kind: "unlocking"; header: SigilHeader }
  | { kind: "ready"; header: SigilHeader; sigil: OpenedSigil }
  | { kind: "error"; message: string };

export function OpenSigil({ cid }: { cid: string }) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading-header" });
  const [witness, setWitness] = useState("");
  const [showWitness, setShowWitness] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const header = await fetchSigilHeader(cid);
        if (cancelled) return;
        setPhase({ kind: "challenge", header, lastError: null });
      } catch (err) {
        if (cancelled) return;
        setPhase({
          kind: "error",
          message:
            err instanceof Error ? err.message : "Failed to fetch sigil",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cid]);

  async function tryUnlock() {
    if (phase.kind !== "challenge") return;
    if (!witness) return;
    const header = phase.header;
    setPhase({ kind: "unlocking", header });
    try {
      const sigil = await openSigil({ cid, witness });
      setPhase({ kind: "ready", header, sigil });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to unlock";
      setPhase({ kind: "challenge", header, lastError: message });
    }
  }

  if (phase.kind === "loading-header") {
    return (
      <div className="border-border/60 bg-muted/20 flex items-center gap-3 border-2 border-dashed p-10">
        <Loader2 className="size-5 animate-spin" />
        <p className="text-muted-foreground text-sm">
          Fetching sigil envelope from IPFS…
        </p>
      </div>
    );
  }

  if (phase.kind === "error") {
    return (
      <div className="border-destructive/30 bg-destructive/5 flex flex-col gap-2 border-2 p-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-destructive size-4" />
          <p className="text-sm font-medium">Couldn&apos;t open sigil</p>
        </div>
        <p className="text-muted-foreground text-sm">{phase.message}</p>
      </div>
    );
  }

  if (phase.kind === "ready") {
    return <SigilContent header={phase.header} sigil={phase.sigil} />;
  }

  // Either challenge or unlocking — both render the prompt UI.
  const header =
    phase.kind === "challenge" ? phase.header : phase.header;
  const lastError = phase.kind === "challenge" ? phase.lastError : null;
  const busy = phase.kind === "unlocking";

  return (
    <div className="flex flex-col gap-6">
      <section className="border-2 border-foreground bg-background p-6 sm:p-8">
        <p className="text-muted-foreground mb-3 text-xs tracking-widest uppercase">
          The riddle
        </p>
        <p className="text-2xl font-black uppercase tracking-tight sm:text-3xl">
          {header.riddleQuestion}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <Label
          htmlFor="sigil-witness-input"
          className="text-xs uppercase tracking-wide"
        >
          Your answer (the witness)
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="sigil-witness-input"
            type={showWitness ? "text" : "password"}
            placeholder="type the witness exactly"
            value={witness}
            onChange={(e) => setWitness(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && witness && !busy) {
                e.preventDefault();
                void tryUnlock();
              }
            }}
            disabled={busy}
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowWitness((v) => !v)}
            disabled={busy}
            aria-label={showWitness ? "Hide witness" : "Show witness"}
          >
            {showWitness ? (
              <EyeOff className="size-4" strokeWidth={2.5} />
            ) : (
              <Eye className="size-4" strokeWidth={2.5} />
            )}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Knowing the witness reveals nothing to us — Argon2id derives the key
          in your browser, then unwraps the content key. We only ever saw the
          ciphertext.
        </p>

        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-muted-foreground inline-flex items-center gap-2 text-xs">
            <KeyRound className="size-3.5" />
            File: <span className="font-mono">{header.filename}</span> ·{" "}
            {formatBytes(header.size)}
          </p>
          <Button
            onClick={tryUnlock}
            disabled={!witness || busy}
            className="gap-2"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <KeyRound className="size-4" />
            )}
            {busy ? "Deriving key…" : "Unlock"}
          </Button>
        </div>

        {lastError ? (
          <p className="text-destructive text-sm font-medium">{lastError}</p>
        ) : null}
      </section>
    </div>
  );
}

function SigilContent({
  header,
  sigil,
}: {
  header: SigilHeader;
  sigil: OpenedSigil;
}) {
  const isText = sigil.mimeType.startsWith("text/");
  const text = isText ? utf8Decode(sigil.bytes) : null;

  function download() {
    const buffer = new ArrayBuffer(sigil.bytes.byteLength);
    new Uint8Array(buffer).set(sigil.bytes);
    const blob = new Blob([buffer], { type: sigil.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = sigil.filename;
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
            <p className="truncate text-sm font-medium">{sigil.filename}</p>
            <p className="text-muted-foreground text-xs">
              {formatBytes(sigil.bytes.byteLength)} · {sigil.mimeType} · sealed
              with the answer to{" "}
              <span className="text-foreground font-mono">
                &ldquo;{header.riddleQuestion}&rdquo;
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
