"use client";

import { useMemo, useState } from "react";
import { GitCompareArrows, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { DropZone } from "@/components/modes/drop/drop-zone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { buildMirror, buildTextMirror } from "@/lib/modes/mirror";

import { MirrorResult } from "./mirror-result";

type Phase =
  | { kind: "idle" }
  | { kind: "encrypting" }
  | { kind: "uploading" }
  | { kind: "registering" }
  | { kind: "done"; mirrorUrl: string }
  | { kind: "error"; message: string };

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CreateMirrorForm() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [tab, setTab] = useState<"text" | "file">("text");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [emailA, setEmailA] = useState("");
  const [emailB, setEmailB] = useState("");

  const busy =
    phase.kind === "encrypting" ||
    phase.kind === "uploading" ||
    phase.kind === "registering";

  const validA = EMAIL_RX.test(emailA.trim());
  const validB = EMAIL_RX.test(emailB.trim());
  const distinct =
    emailA.trim().toLowerCase() !== emailB.trim().toLowerCase() ||
    emailA.trim() === "";
  const hasContent = tab === "file" ? file != null : text.trim().length > 0;
  const canSeal = !busy && hasContent && validA && validB && distinct;

  const distinctError = useMemo(() => {
    if (!validA || !validB) return null;
    if (!distinct) return "Holders must have distinct emails.";
    return null;
  }, [validA, validB, distinct]);

  async function seal() {
    try {
      setPhase({ kind: "encrypting" });
      const plan =
        tab === "file" && file
          ? await buildMirror({
              file,
              holderA: { email: emailA.trim() },
              holderB: { email: emailB.trim() },
            })
          : await buildTextMirror(
              text,
              { email: emailA.trim() },
              { email: emailB.trim() },
            );

      setPhase({ kind: "uploading" });

      setPhase({ kind: "registering" });
      const res = await fetch("/api/mirrors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cid: plan.cid,
          holderA: { email: emailA.trim(), half: plan.halfA },
          holderB: { email: emailB.trim(), half: plan.halfB },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { id: string };
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const mirrorUrl = `${origin}/mirror/${data.id}`;
      setPhase({ kind: "done", mirrorUrl });
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
    setEmailA("");
    setEmailB("");
  }

  if (phase.kind === "done") {
    return <MirrorResult mirrorUrl={phase.mirrorUrl} onReset={reset} />;
  }

  return (
    <div className="flex flex-col gap-7">
      {/* Step 1 — content */}
      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-sm font-bold tracking-widest uppercase">
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
              placeholder="A confession. A counter-offer. A whistleblower's letter. Anything that only opens when both parties have committed simultaneously."
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
      </section>

      {/* Step 2 — holders */}
      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-sm font-bold tracking-widest uppercase">
          2. Holders
        </h2>
        <p className="text-muted-foreground text-xs">
          Each holder receives one half of the key by email. Neither half on
          its own decrypts anything — both must be combined in the same
          browser session to unlock.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="mirror-holder-a"
              className="text-xs font-bold uppercase tracking-widest"
            >
              Holder A
            </Label>
            <Input
              id="mirror-holder-a"
              type="email"
              placeholder="alice@example.com"
              value={emailA}
              onChange={(e) => setEmailA(e.target.value)}
              disabled={busy}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="mirror-holder-b"
              className="text-xs font-bold uppercase tracking-widest"
            >
              Holder B
            </Label>
            <Input
              id="mirror-holder-b"
              type="email"
              placeholder="bob@example.com"
              value={emailB}
              onChange={(e) => setEmailB(e.target.value)}
              disabled={busy}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>
        {distinctError ? (
          <p className="text-destructive text-xs">{distinctError}</p>
        ) : null}
      </section>

      <div className="flex items-center justify-between border-t pt-5">
        <p className="text-muted-foreground inline-flex items-center gap-2 text-xs">
          <GitCompareArrows className="size-3.5" strokeWidth={2.5} />
          XChaCha20-Poly1305 · Shamir 2-of-2 · No server-held halves
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
                ? "Sending halves…"
                : "Seal mirror"}
        </Button>
      </div>

      {phase.kind === "error" ? (
        <p className="text-destructive text-sm">{phase.message}</p>
      ) : null}
    </div>
  );
}
