"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DropZone } from "@/components/modes/drop/drop-zone";
import { createSigil, createTextSigil } from "@/lib/modes/sigil";

import { SigilResult } from "./sigil-result";

type Phase =
  | { kind: "idle" }
  | { kind: "deriving" }
  | { kind: "uploading" }
  | { kind: "done"; shareUrl: string; riddleQuestion: string }
  | { kind: "error"; message: string };

export function CreateSigilForm() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [tab, setTab] = useState<"text" | "file">("text");
  const [witness, setWitness] = useState("");
  const [riddle, setRiddle] = useState("");
  const [showWitness, setShowWitness] = useState(false);

  const busy = phase.kind === "deriving" || phase.kind === "uploading";
  const hasContent = tab === "file" ? file != null : text.trim().length > 0;
  const hasWitness = witness.length > 0;
  const hasRiddle = riddle.trim().length > 0;
  const canSeal = !busy && hasContent && hasWitness && hasRiddle;

  async function seal() {
    try {
      setPhase({ kind: "deriving" });
      const result =
        tab === "file" && file
          ? await createSigil({ file, witness, riddleQuestion: riddle })
          : await createTextSigil(text, witness, riddle);
      setPhase({ kind: "uploading" });
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const shareUrl = `${origin}/sigil/${result.cid}`;
      setPhase({
        kind: "done",
        shareUrl,
        riddleQuestion: result.riddleQuestion,
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
    setWitness("");
    setRiddle("");
    setShowWitness(false);
  }

  if (phase.kind === "done") {
    return (
      <SigilResult
        shareUrl={phase.shareUrl}
        riddleQuestion={phase.riddleQuestion}
        onReset={reset}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
          1. What to seal
        </h2>
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "text" | "file")}
          className="gap-3"
        >
          <TabsList className="self-start">
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="file">File</TabsTrigger>
          </TabsList>
          <TabsContent value="text" className="m-0">
            <Textarea
              placeholder="A confession that only your co-conspirator can read. A passphrase to a vault. Anything that the right person already knows the answer to."
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
        <h2 className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
          2. The riddle
        </h2>
        <Label htmlFor="sigil-riddle" className="text-xs uppercase tracking-wide">
          Question shown to the unlocker
        </Label>
        <Input
          id="sigil-riddle"
          placeholder="What's the password we agreed on?"
          value={riddle}
          onChange={(e) => setRiddle(e.target.value)}
          disabled={busy}
          autoComplete="off"
        />
        <p className="text-muted-foreground text-xs leading-relaxed">
          The riddle is plaintext metadata — it travels in the envelope so the
          recipient sees it before unlocking. Don&apos;t put the answer in here.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
          3. The witness
        </h2>
        <Label htmlFor="sigil-witness" className="text-xs uppercase tracking-wide">
          Answer / passphrase (kept secret)
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="sigil-witness"
            type={showWitness ? "text" : "password"}
            placeholder="the moon is blue"
            value={witness}
            onChange={(e) => setWitness(e.target.value)}
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
          in your browser. Pick something with real entropy (a passphrase, not
          a 4-digit PIN).
        </p>
      </div>

      <div className="flex items-center justify-between border-t pt-5">
        <p className="text-muted-foreground text-xs">
          Argon2id (64 MiB) · XChaCha20-Poly1305 · key wrap stays in your browser.
        </p>
        <Button onClick={seal} disabled={!canSeal} className="gap-2">
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Lock className="size-4" />
          )}
          {phase.kind === "deriving"
            ? "Deriving key…"
            : phase.kind === "uploading"
              ? "Uploading…"
              : "Seal sigil"}
        </Button>
      </div>

      {phase.kind === "error" ? (
        <p className="text-destructive text-sm">{phase.message}</p>
      ) : null}
    </div>
  );
}
