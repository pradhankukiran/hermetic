"use client";

import { useState } from "react";
import { Gavel, Hourglass, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UnlockDatePicker } from "@/components/modes/capsule/unlock-date-picker";
import { createAuction } from "@/lib/modes/echo";

import { EchoResult } from "./echo-result";

type Phase =
  | { kind: "idle" }
  | { kind: "creating" }
  | {
      kind: "done";
      auctionUrl: string;
      auctionId: string;
      closesAt: Date;
      drandRound: number;
    }
  | { kind: "error"; message: string };

const TITLE_MAX = 200;
const DESC_MAX = 4000;

/**
 * Brutalist auction-creation form. Title + description are public (the
 * server stores them as plaintext; everyone visiting the auction page
 * sees them). The close time is what matters cryptographically — bids
 * are sealed to the drand round at-or-after that instant.
 */
export function CreateAuctionForm() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [closesAt, setClosesAt] = useState<Date | null>(null);

  const [minCloseMs] = useState(() => Date.now() + 60_000);
  const busy = phase.kind === "creating";
  const validTitle = title.trim().length > 0 && title.length <= TITLE_MAX;
  const validDesc =
    description.trim().length > 0 && description.length <= DESC_MAX;
  const validClose = closesAt != null && closesAt.getTime() > minCloseMs;
  const canCreate = !busy && validTitle && validDesc && validClose;

  async function create() {
    if (!closesAt) return;
    try {
      setPhase({ kind: "creating" });
      const result = await createAuction({
        title,
        description,
        closesAt,
      });
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const auctionUrl = `${origin}/echo/${result.id}`;
      setPhase({
        kind: "done",
        auctionUrl,
        auctionId: result.id,
        closesAt: result.closesAt,
        drandRound: result.drandRound,
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
    setTitle("");
    setDescription("");
    setClosesAt(null);
  }

  if (phase.kind === "done") {
    return (
      <EchoResult
        auctionUrl={phase.auctionUrl}
        closesAt={phase.closesAt}
        drandRound={phase.drandRound}
        onReset={reset}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
          1. Auction title
        </h2>
        <Label htmlFor="echo-title" className="sr-only">
          Title
        </Label>
        <Input
          id="echo-title"
          placeholder="e.g. Anonymous research grant proposals"
          maxLength={TITLE_MAX}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
          2. What bidders should know
        </h2>
        <Label htmlFor="echo-desc" className="sr-only">
          Description
        </Label>
        <Textarea
          id="echo-desc"
          placeholder="Describe what's being auctioned, the evaluation criteria, and what bids should contain. Visible to anyone with the URL."
          className="min-h-32 font-mono text-sm"
          maxLength={DESC_MAX}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={busy}
        />
        <p className="text-muted-foreground text-xs">
          {description.length}/{DESC_MAX} characters · public
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
          3. When bidding closes
        </h2>
        <UnlockDatePicker
          value={closesAt}
          onChange={setClosesAt}
          disabled={busy}
        />
      </div>

      <div className="flex items-center justify-between border-t pt-5">
        <p className="text-muted-foreground inline-flex items-center gap-2 text-xs">
          <Hourglass className="size-3.5" />
          Drand quicknet · BLS12-381 · 3-second rounds
        </p>
        <Button onClick={create} disabled={!canCreate} className="gap-2">
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Gavel className="size-4" />
          )}
          {busy ? "Opening…" : "Open auction"}
        </Button>
      </div>

      {phase.kind === "error" ? (
        <p className="text-destructive text-sm">{phase.message}</p>
      ) : null}
    </div>
  );
}
