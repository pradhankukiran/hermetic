"use client";

import { useMemo, useState } from "react";
import { Loader2, Lock, Users } from "lucide-react";
import { toast } from "sonner";

import { DropZone } from "@/components/modes/drop/drop-zone";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { buildPact, buildTextPact } from "@/lib/modes/pact";

import { CreatePactResult } from "./create-pact-result";
import { PactMemberList, type PactMember } from "./member-list";

type Phase =
  | { kind: "idle" }
  | { kind: "encrypting" }
  | { kind: "uploading" }
  | { kind: "registering" }
  | {
      kind: "done";
      pactUrl: string;
      partyCountN: number;
      emailsSent: number;
      emailsFailed: number;
    }
  | { kind: "error"; message: string };

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CreatePactForm() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [tab, setTab] = useState<"text" | "file">("text");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [members, setMembers] = useState<PactMember[]>([
    { email: "" },
    { email: "" },
  ]);

  const busy =
    phase.kind === "encrypting" ||
    phase.kind === "uploading" ||
    phase.kind === "registering";

  const partyCountN = members.length;
  const validMembers = useMemo(
    () => members.every((m) => EMAIL_RX.test(m.email.trim())),
    [members],
  );
  const dedupedEmails = useMemo(
    () => new Set(members.map((m) => m.email.trim().toLowerCase())),
    [members],
  );
  const allUnique = dedupedEmails.size === members.length;
  const hasContent = tab === "file" ? file != null : text.trim().length > 0;
  const canSeal = !busy && hasContent && validMembers && allUnique;

  async function seal() {
    try {
      setPhase({ kind: "encrypting" });
      const plan =
        tab === "file" && file
          ? await buildPact({ file, parties: members })
          : await buildTextPact(text, members);

      setPhase({ kind: "uploading" });

      setPhase({ kind: "registering" });
      const res = await fetch("/api/pacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cid: plan.cid,
          partyCountN: plan.partyCountN,
          parties: plan.parties,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        id: string;
        emailsSent?: number;
        emailsFailed?: number;
      };
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const pactUrl = `${origin}/pact/${data.id}`;
      setPhase({
        kind: "done",
        pactUrl,
        partyCountN,
        emailsSent: data.emailsSent ?? partyCountN,
        emailsFailed: data.emailsFailed ?? 0,
      });
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
    setMembers([{ email: "" }, { email: "" }]);
  }

  if (phase.kind === "done") {
    return (
      <CreatePactResult
        pactUrl={phase.pactUrl}
        partyCountN={phase.partyCountN}
        emailsSent={phase.emailsSent}
        emailsFailed={phase.emailsFailed}
        onReset={reset}
      />
    );
  }

  return (
    <div className="flex flex-col gap-7">
      {/* Step 1 — content */}
      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
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
              placeholder="Joint statements. Group secrets. Contractual releases. Anything that requires every party's consent before opening."
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

      {/* Step 2 — parties */}
      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          2. Parties ({partyCountN})
        </h2>
        <p className="text-muted-foreground text-xs">
          Each party gets one share via email. <span className="text-foreground font-medium">All {partyCountN} parties</span> must paste their shares together to unlock — no quorum, no fallback.
        </p>
        <PactMemberList
          members={members}
          onChange={setMembers}
          disabled={busy}
        />
        {!allUnique ? (
          <p className="text-destructive text-xs">
            Party emails must be unique.
          </p>
        ) : null}
      </section>

      <div className="flex items-center justify-between border-t pt-5">
        <p className="text-muted-foreground inline-flex items-center gap-2 text-xs">
          <Users className="size-3.5" />
          XChaCha20-Poly1305 · Shamir GF(256) · {partyCountN}-of-{partyCountN}
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
                ? "Notifying parties…"
                : "Seal pact"}
        </Button>
      </div>

      {phase.kind === "error" ? (
        <p className="text-destructive text-sm">{phase.message}</p>
      ) : null}
    </div>
  );
}
