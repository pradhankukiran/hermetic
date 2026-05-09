"use client";

import { useMemo, useState } from "react";
import { Loader2, Lock, Users } from "lucide-react";
import { toast } from "sonner";

import { DropZone } from "@/components/modes/drop/drop-zone";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { buildSwitch, buildTextSwitch } from "@/lib/modes/switch";

import { CreateSwitchResult } from "./create-switch-result";
import { TrusteeList, type TrusteeEmail } from "./trustee-list";

type Phase =
  | { kind: "idle" }
  | { kind: "encrypting" }
  | { kind: "uploading" }
  | { kind: "registering" }
  | {
      kind: "done";
      switchUrl: string;
      thresholdK: number;
      shareCountN: number;
      inactivityDays: number;
      emailsSent: number;
      emailsFailed: number;
    }
  | { kind: "error"; message: string };

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INACTIVITY_PRESETS = [7, 14, 30, 90, 180, 365];

export function CreateSwitchForm() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [tab, setTab] = useState<"text" | "file">("text");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [trustees, setTrustees] = useState<TrusteeEmail[]>([
    { email: "" },
    { email: "" },
    { email: "" },
  ]);
  const [thresholdK, setThresholdK] = useState(2);
  const [inactivityDays, setInactivityDays] = useState(30);

  const busy =
    phase.kind === "encrypting" ||
    phase.kind === "uploading" ||
    phase.kind === "registering";

  const shareCountN = trustees.length;
  const validTrustees = useMemo(
    () => trustees.every((t) => EMAIL_RX.test(t.email.trim())),
    [trustees],
  );
  const dedupedEmails = useMemo(
    () => new Set(trustees.map((t) => t.email.trim().toLowerCase())),
    [trustees],
  );
  const allUnique = dedupedEmails.size === trustees.length;
  const validThreshold = thresholdK >= 2 && thresholdK <= shareCountN;
  const hasContent = tab === "file" ? file != null : text.trim().length > 0;
  const canSeal =
    !busy && hasContent && validTrustees && allUnique && validThreshold;

  async function seal() {
    try {
      setPhase({ kind: "encrypting" });
      const plan =
        tab === "file" && file
          ? await buildSwitch({
              file,
              thresholdK,
              shareCountN,
              inactivityDays,
              trustees,
            })
          : await buildTextSwitch(text, trustees, thresholdK, inactivityDays);

      setPhase({ kind: "uploading" });

      setPhase({ kind: "registering" });
      const res = await fetch("/api/switches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cid: plan.cid,
          thresholdK: plan.thresholdK,
          shareCountN: plan.shareCountN,
          inactivitySeconds: plan.inactivitySeconds,
          trustees: plan.trustees,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        id: string;
        emailsSent: number;
        emailsFailed: number;
      };
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const switchUrl = `${origin}/switch/${data.id}`;
      setPhase({
        kind: "done",
        switchUrl,
        thresholdK,
        shareCountN,
        inactivityDays,
        emailsSent: data.emailsSent,
        emailsFailed: data.emailsFailed,
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
    setTrustees([{ email: "" }, { email: "" }, { email: "" }]);
    setThresholdK(2);
    setInactivityDays(30);
  }

  if (phase.kind === "done") {
    return (
      <CreateSwitchResult
        switchUrl={phase.switchUrl}
        thresholdK={phase.thresholdK}
        shareCountN={phase.shareCountN}
        inactivityDays={phase.inactivityDays}
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
              placeholder="Wills. Seed phrases. Final messages. Confessions. Things only your trusted people should ever read — and only if you go silent."
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

      {/* Step 2 — trustees */}
      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          2. Trustees ({shareCountN})
        </h2>
        <p className="text-muted-foreground text-xs">
          Each trustee gets one share via email. They keep it safe. None of them
          alone can unlock anything.
        </p>
        <TrusteeList
          trustees={trustees}
          onChange={setTrustees}
          disabled={busy}
        />
        {!allUnique ? (
          <p className="text-destructive text-xs">
            Trustee emails must be unique.
          </p>
        ) : null}
      </section>

      {/* Step 3 — threshold */}
      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          3. Threshold (K of {shareCountN})
        </h2>
        <p className="text-muted-foreground text-xs">
          How many trustees must combine shares to unlock.{" "}
          <span className="text-foreground font-medium">
            Higher = harder to misuse, easier to lock yourself out.
          </span>
        </p>
        <div className="flex items-center gap-4">
          <Slider
            min={2}
            max={Math.max(2, shareCountN)}
            step={1}
            value={[Math.min(thresholdK, shareCountN)]}
            onValueChange={(v) => {
              const next = Array.isArray(v) ? (v[0] ?? 2) : v;
              setThresholdK(next);
            }}
            disabled={busy || shareCountN < 2}
            className="flex-1"
          />
          <span className="font-mono text-sm tabular-nums">
            {Math.min(thresholdK, shareCountN)} of {shareCountN}
          </span>
        </div>
      </section>

      {/* Step 4 — inactivity */}
      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          4. Trigger after silence
        </h2>
        <p className="text-muted-foreground text-xs">
          Hermetic emails you periodic check-in reminders. If you don&apos;t
          check in for this long, the switch fires.
        </p>
        <div className="flex flex-wrap gap-2">
          {INACTIVITY_PRESETS.map((d) => (
            <Button
              key={d}
              type="button"
              variant={inactivityDays === d ? "default" : "outline"}
              size="sm"
              disabled={busy}
              onClick={() => setInactivityDays(d)}
              className=""
            >
              {d} days
            </Button>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between border-t pt-5">
        <p className="text-muted-foreground inline-flex items-center gap-2 text-xs">
          <Users className="size-3.5" />
          XChaCha20-Poly1305 · Shamir GF(256) · {thresholdK}-of-{shareCountN}
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
                ? "Notifying trustees…"
                : "Seal switch"}
        </Button>
      </div>

      {phase.kind === "error" ? (
        <p className="text-destructive text-sm">{phase.message}</p>
      ) : null}
    </div>
  );
}
