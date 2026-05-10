"use client";

import { useState } from "react";
import { Loader2, Lock, Power } from "lucide-react";
import { toast } from "sonner";

import { DropZone } from "@/components/modes/drop/drop-zone";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createSleeper, createTextSleeper } from "@/lib/modes/sleeper";

import { SleeperResult } from "./sleeper-result";

type Phase =
  | { kind: "idle" }
  | { kind: "encrypting" }
  | { kind: "uploading" }
  | { kind: "registering" }
  | { kind: "done"; shareUrl: string; sleeperId: string }
  | { kind: "error"; message: string };

export function CreateSleeperForm() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [tab, setTab] = useState<"text" | "file">("text");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");

  const busy =
    phase.kind === "encrypting" ||
    phase.kind === "uploading" ||
    phase.kind === "registering";

  const hasContent = tab === "file" ? file != null : text.trim().length > 0;
  const canSeal = !busy && hasContent;

  async function seal() {
    try {
      setPhase({ kind: "encrypting" });
      const result =
        tab === "file" && file
          ? await createSleeper(file)
          : await createTextSleeper(text);
      setPhase({ kind: "registering" });
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const shareUrl = `${origin}/sleeper/${result.id}#${result.key}`;
      setPhase({ kind: "done", shareUrl, sleeperId: result.id });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setPhase({ kind: "error", message });
      toast.error(message);
    }
  }

  function reset() {
    setPhase({ kind: "idle" });
    setFile(null);
    setText("");
  }

  if (phase.kind === "done") {
    return (
      <SleeperResult
        shareUrl={phase.shareUrl}
        sleeperId={phase.sleeperId}
        onReset={reset}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "text" | "file")}
        className="gap-4"
      >
        <TabsList className="self-start">
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="file">File</TabsTrigger>
        </TabsList>
        <TabsContent value="text" className="m-0">
          <Textarea
            placeholder="A statement to be released on your command. A confession that holds until you choose. A truth waiting for its moment."
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

      <div className="flex items-center justify-between gap-3 border-t pt-5">
        <p className="text-muted-foreground inline-flex items-center gap-2 text-xs">
          <Power className="size-3.5" strokeWidth={2.5} />
          XChaCha20-Poly1305 · Key never leaves your browser
        </p>
        <Button onClick={seal} disabled={!canSeal} className="gap-2">
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Lock className="size-4" />
          )}
          {phase.kind === "encrypting"
            ? "Encrypting…"
            : phase.kind === "uploading"
              ? "Uploading…"
              : phase.kind === "registering"
                ? "Registering…"
                : "Seal sleeper"}
        </Button>
      </div>

      {phase.kind === "error" ? (
        <p className="text-destructive text-sm">{phase.message}</p>
      ) : null}
    </div>
  );
}
