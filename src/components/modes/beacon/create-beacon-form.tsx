"use client";

import { useEffect, useState } from "react";
import { Loader2, Lock, Radio, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DropZone } from "@/components/modes/drop/drop-zone";
import { randomBase64Url } from "@/lib/crypto";
import { createBeacon, createTextBeacon } from "@/lib/modes/beacon";

import { BeaconResult } from "./beacon-result";
import { HeightPicker } from "./height-picker";

type Phase =
  | { kind: "idle" }
  | { kind: "encrypting" }
  | { kind: "uploading" }
  | {
      kind: "done";
      shareUrl: string;
      passphrase: string;
      targetHeight: bigint;
      chainId: number;
    }
  | { kind: "error"; message: string };

export function CreateBeaconForm() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [tab, setTab] = useState<"file" | "text">("text");
  const [targetHeight, setTargetHeight] = useState<bigint | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [passMode, setPassMode] = useState<"auto" | "custom">("auto");
  const [generating, setGenerating] = useState(false);

  // Generate an initial 24-byte random passphrase on mount when in auto mode.
  useEffect(() => {
    if (passMode !== "auto" || passphrase) return;
    let cancelled = false;
    setGenerating(true);
    randomBase64Url(24)
      .then((p) => {
        if (!cancelled) setPassphrase(p);
      })
      .finally(() => {
        if (!cancelled) setGenerating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [passMode, passphrase]);

  async function regeneratePass() {
    setGenerating(true);
    try {
      setPassphrase(await randomBase64Url(24));
    } finally {
      setGenerating(false);
    }
  }

  const busy = phase.kind === "encrypting" || phase.kind === "uploading";
  const hasContent = tab === "file" ? file != null : text.trim().length > 0;
  const validPass = passphrase.length >= 8;
  const validHeight = targetHeight != null && targetHeight > 0n;
  const canSeal = !busy && hasContent && validHeight && validPass;

  async function seal() {
    if (!validHeight || !validPass || !targetHeight) return;
    try {
      setPhase({ kind: "encrypting" });
      const result =
        tab === "file" && file
          ? await createBeacon(file, targetHeight, passphrase)
          : await createTextBeacon(text, targetHeight, passphrase);
      setPhase({ kind: "uploading" });
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const shareUrl = `${origin}/beacon/${result.cid}`;
      setPhase({
        kind: "done",
        shareUrl,
        passphrase,
        targetHeight: result.targetHeight,
        chainId: result.chainId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setPhase({ kind: "error", message });
      toast.error(message);
    }
  }

  function reset() {
    setPhase({ kind: "idle" });
    setFile(null);
    setText("");
    setTargetHeight(null);
    setPassphrase("");
    setPassMode("auto");
  }

  if (phase.kind === "done") {
    return (
      <BeaconResult
        shareUrl={phase.shareUrl}
        passphrase={phase.passphrase}
        targetHeight={phase.targetHeight}
        chainId={phase.chainId}
        onReset={reset}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
          1. What to seal
        </h2>
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "file" | "text")}
          className="gap-3"
        >
          <TabsList className="self-start">
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="file">File</TabsTrigger>
          </TabsList>
          <TabsContent value="text" className="m-0">
            <Textarea
              placeholder="A message that should stay sealed until a future Ethereum block. A pre-commit. A timed reveal. A bet whose proof shouldn't surface yet."
              className="min-h-44 font-mono text-sm"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={busy}
            />
          </TabsContent>
          <TabsContent value="file" className="m-0">
            <DropZone file={file} onFileChange={setFile} disabled={busy} />
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
          2. When it unlocks (block height)
        </h2>
        <HeightPicker
          value={targetHeight}
          onChange={setTargetHeight}
          disabled={busy}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
          3. Owner passphrase
        </h2>
        <Tabs
          value={passMode}
          onValueChange={(v) => {
            const mode = v as "auto" | "custom";
            setPassMode(mode);
            if (mode === "custom") setPassphrase("");
          }}
          className="gap-3"
        >
          <TabsList className="self-start">
            <TabsTrigger value="auto">Generate</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
          <TabsContent value="auto" className="m-0">
            <div className="flex items-center gap-2">
              <code className="bg-muted/50 flex-1 break-all rounded-md border px-3 py-2 font-mono text-xs">
                {generating ? "generating…" : passphrase || "—"}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={regeneratePass}
                disabled={busy || generating}
                className="gap-1.5"
              >
                {generating ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                New
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="custom" className="m-0">
            <Input
              type="password"
              placeholder="At least 8 characters"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              disabled={busy}
              autoComplete="new-password"
            />
            {passphrase.length > 0 && passphrase.length < 8 ? (
              <p className="text-destructive mt-2 text-xs">
                Passphrase must be at least 8 characters.
              </p>
            ) : null}
          </TabsContent>
        </Tabs>
        <p className="text-muted-foreground text-xs leading-relaxed">
          The chain anchor is a UI gate; this passphrase is the cryptographic
          seal. Hermetic never sees it. Lose it and the contents are
          unrecoverable — even after the block is mined.
        </p>
      </div>

      <div className="flex items-center justify-between border-t pt-5">
        <p className="text-muted-foreground inline-flex items-center gap-2 text-xs">
          <Radio className="size-3.5" />
          Ethereum mainnet · ~12s blocks · viem RPC
        </p>
        <Button onClick={seal} disabled={!canSeal} className="gap-2">
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Lock className="size-4" />
          )}
          {phase.kind === "encrypting"
            ? "Sealing…"
            : phase.kind === "uploading"
              ? "Uploading…"
              : "Seal beacon"}
        </Button>
      </div>

      {phase.kind === "error" ? (
        <p className="text-destructive text-sm">{phase.message}</p>
      ) : null}
    </div>
  );
}
