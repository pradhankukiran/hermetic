"use client";

import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createDrop, createTextDrop } from "@/lib/modes/drop";

import { DropResult } from "./drop-result";
import { DropZone } from "./drop-zone";

type Phase =
  | { kind: "idle" }
  | { kind: "encrypting" }
  | { kind: "uploading" }
  | { kind: "done"; shareUrl: string }
  | { kind: "error"; message: string };

export function CreateDropForm() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [tab, setTab] = useState<"file" | "text">("file");

  const busy = phase.kind === "encrypting" || phase.kind === "uploading";

  async function seal() {
    try {
      setPhase({ kind: "encrypting" });
      const result =
        tab === "file" && file
          ? await createDrop(file)
          : await createTextDrop(text);
      setPhase({ kind: "uploading" });
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const shareUrl = `${origin}/drop/${result.cid}#${result.key}`;
      setPhase({ kind: "done", shareUrl });
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
  }

  if (phase.kind === "done") {
    return <DropResult shareUrl={phase.shareUrl} onReset={reset} />;
  }

  const canSeal =
    !busy && (tab === "file" ? file != null : text.trim().length > 0);

  return (
    <div className="flex flex-col gap-5">
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "file" | "text")}
        className="gap-4"
      >
        <TabsList className="self-start">
          <TabsTrigger value="file">File</TabsTrigger>
          <TabsTrigger value="text">Text</TabsTrigger>
        </TabsList>
        <TabsContent value="file" className="m-0">
          <DropZone file={file} onFileChange={setFile} disabled={busy} />
        </TabsContent>
        <TabsContent value="text" className="m-0">
          <Textarea
            placeholder="Paste a secret, message, or note. It will be encrypted in your browser."
            className="min-h-44 font-mono text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
          />
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          Encrypted with XChaCha20-Poly1305. Key never leaves your browser.
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
              : "Seal & share"}
        </Button>
      </div>

      {phase.kind === "error" ? (
        <p className="text-destructive text-sm">{phase.message}</p>
      ) : null}
    </div>
  );
}
