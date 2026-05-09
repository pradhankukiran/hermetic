"use client";

import { useState } from "react";
import { Hourglass, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DropZone } from "@/components/modes/drop/drop-zone";
import { createCapsule, createTextCapsule } from "@/lib/modes/capsule";

import { CapsuleResult } from "./capsule-result";
import { UnlockDatePicker } from "./unlock-date-picker";

type Phase =
  | { kind: "idle" }
  | { kind: "encrypting" }
  | { kind: "uploading" }
  | {
      kind: "done";
      shareUrl: string;
      unlockAt: Date;
      drandRound: number;
    }
  | { kind: "error"; message: string };

export function CreateCapsuleForm() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [tab, setTab] = useState<"file" | "text">("text");
  const [unlockAt, setUnlockAt] = useState<Date | null>(null);

  // Compute "min unlock" once at mount via useState lazy init so render stays pure.
  const [minUnlockMs] = useState(() => Date.now() + 60_000);
  const busy = phase.kind === "encrypting" || phase.kind === "uploading";
  const validUnlock = unlockAt != null && unlockAt.getTime() > minUnlockMs;
  const hasContent = tab === "file" ? file != null : text.trim().length > 0;
  const canSeal = !busy && hasContent && validUnlock;

  async function seal() {
    if (!unlockAt) return;
    try {
      setPhase({ kind: "encrypting" });
      const result =
        tab === "file" && file
          ? await createCapsule(file, unlockAt)
          : await createTextCapsule(text, unlockAt);
      setPhase({ kind: "uploading" });
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const shareUrl = `${origin}/capsule/${result.cid}`;
      setPhase({
        kind: "done",
        shareUrl,
        unlockAt: result.unlockAt,
        drandRound: result.drandRound,
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
    setUnlockAt(null);
  }

  if (phase.kind === "done") {
    return (
      <CapsuleResult
        shareUrl={phase.shareUrl}
        unlockAt={phase.unlockAt}
        drandRound={phase.drandRound}
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
              placeholder="A letter to your future self. A confession with a release date. A predicted price. A secret you don't want to forget."
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
          2. When it unlocks
        </h2>
        <UnlockDatePicker value={unlockAt} onChange={setUnlockAt} disabled={busy} />
      </div>

      <div className="flex items-center justify-between border-t pt-5">
        <p className="text-muted-foreground inline-flex items-center gap-2 text-xs">
          <Hourglass className="size-3.5" />
          Drand quicknet · BLS12-381 · 3-second rounds
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
              : "Seal capsule"}
        </Button>
      </div>

      {phase.kind === "error" ? (
        <p className="text-destructive text-sm">{phase.message}</p>
      ) : null}
    </div>
  );
}
