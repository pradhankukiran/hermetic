"use client";

import { useState } from "react";
import { Fingerprint, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DropZone } from "@/components/modes/drop/drop-zone";
import { createHalo, createTextHalo } from "@/lib/modes/halo";

import { HaloResult } from "./halo-result";

type Phase =
  | { kind: "idle" }
  | { kind: "encrypting" }
  | { kind: "passkey" }
  | { kind: "uploading" }
  | { kind: "done"; shareUrl: string; credentialId: string }
  | { kind: "error"; message: string };

export function CreateHaloForm() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [tab, setTab] = useState<"file" | "text">("file");

  const busy =
    phase.kind === "encrypting" ||
    phase.kind === "passkey" ||
    phase.kind === "uploading";

  async function seal() {
    try {
      // The halo flow does encrypt → passkey → upload internally; we
      // surface the "passkey" phase optimistically since that is the
      // step the user perceives as the longest.
      setPhase({ kind: "encrypting" });

      // Small async tick so React paints the encrypting state before the
      // browser shows the platform passkey modal.
      await new Promise((r) => setTimeout(r, 0));
      setPhase({ kind: "passkey" });

      const result =
        tab === "file" && file
          ? await createHalo(file)
          : await createTextHalo(text);
      setPhase({ kind: "uploading" });
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const shareUrl = `${origin}/halo/${result.cid}`;
      setPhase({
        kind: "done",
        shareUrl,
        credentialId: result.credentialId,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      // On cancel or error, return to idle so the form is usable again.
      setPhase({ kind: "idle" });
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
      <HaloResult
        shareUrl={phase.shareUrl}
        credentialId={phase.credentialId}
        onReset={reset}
      />
    );
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
            placeholder="Paste a secret. It will be encrypted in your browser and bound to a passkey."
            className="min-h-44 font-mono text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
          />
        </TabsContent>
      </Tabs>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-xs leading-relaxed sm:max-w-sm">
          You&apos;ll be asked to register or use a passkey. The PRF output
          from your authenticator becomes the key — only this device can
          unlock.
        </p>
        <Button onClick={seal} disabled={!canSeal} className="gap-2">
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Fingerprint className="size-4" strokeWidth={2.5} />
          )}
          {phase.kind === "encrypting"
            ? "Encrypting…"
            : phase.kind === "passkey"
              ? "Waiting for passkey…"
              : phase.kind === "uploading"
                ? "Uploading…"
                : "Seal with passkey"}
        </Button>
      </div>

      <div className="border-2 border-foreground bg-muted/40 p-4">
        <p className="text-xs font-bold uppercase tracking-widest">
          What is PRF?
        </p>
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
          The WebAuthn{" "}
          <a
            href="https://w3c.github.io/webauthn/#prf-extension"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            PRF extension
          </a>{" "}
          lets a passkey deterministically derive a 32-byte secret from a
          per-halo salt. The secret never leaves your authenticator until
          a user gesture authorizes it. Supported on Chrome / Edge / Safari
          17+; not yet on Firefox.
        </p>
      </div>
    </div>
  );
}
