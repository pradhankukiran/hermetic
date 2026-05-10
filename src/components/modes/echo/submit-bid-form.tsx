"use client";

import { useState } from "react";
import { Loader2, Lock, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitBid } from "@/lib/modes/echo";

const NAME_MAX = 80;
const BID_MAX = 4000;

type Phase =
  | { kind: "idle" }
  | { kind: "encrypting" }
  | { kind: "uploading" }
  | { kind: "registering" }
  | { kind: "done"; cid: string }
  | { kind: "error"; message: string };

/**
 * Modal-style bid form. Only mounted while the auction is open. The form
 * encrypts in-browser (XChaCha20-Poly1305 + tlock), uploads the envelope
 * to IPFS, and POSTs the resulting CID to the auction.
 */
export function SubmitBidForm({
  auctionId,
  drandRound,
  onClose,
  onSubmitted,
}: {
  auctionId: string;
  drandRound: number;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [bidderName, setBidderName] = useState("");
  const [bidText, setBidText] = useState("");

  const busy =
    phase.kind === "encrypting" ||
    phase.kind === "uploading" ||
    phase.kind === "registering";

  const validName =
    bidderName.trim().length > 0 && bidderName.length <= NAME_MAX;
  const validBid = bidText.trim().length > 0 && bidText.length <= BID_MAX;
  const canSubmit = !busy && validName && validBid && phase.kind !== "done";

  async function submit() {
    try {
      setPhase({ kind: "encrypting" });
      // submitBid handles its own phases internally; we surface a coarse
      // "encrypting → uploading → registering" sequence so users see
      // progress on slow connections.
      setPhase({ kind: "uploading" });
      const result = await submitBid({
        auctionId,
        drandRound,
        bidderName,
        bidText,
      });
      setPhase({ kind: "registering" });
      setPhase({ kind: "done", cid: result.cid });
      toast.success("Bid sealed");
      onSubmitted();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Couldn't submit bid";
      setPhase({ kind: "error", message });
      toast.error(message);
    }
  }

  if (phase.kind === "done") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
        <div className="bg-background border-2 border-foreground w-full max-w-md p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-black uppercase tracking-tight">
              Bid sealed
            </h3>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="hover:bg-muted size-8 inline-flex items-center justify-center"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your bid is encrypted under the same drand round as everyone
            else&apos;s. It cannot be read by anyone — including you — until the
            auction closes. After close, return to this page to reveal all
            bids together.
          </p>
          <p className="mt-3 text-xs font-mono break-all bg-muted px-3 py-2 border-2 border-foreground">
            {phase.cid}
          </p>
          <div className="mt-5 flex justify-end">
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div className="bg-background border-2 border-foreground w-full max-w-md p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black uppercase tracking-tight">
            Submit a bid
          </h3>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            disabled={busy}
            className="hover:bg-muted size-8 inline-flex items-center justify-center disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="echo-bidder">Display name</Label>
            <Input
              id="echo-bidder"
              placeholder="e.g. Bidder #1, alice, MetaCorp"
              maxLength={NAME_MAX}
              value={bidderName}
              onChange={(e) => setBidderName(e.target.value)}
              disabled={busy}
            />
            <p className="text-muted-foreground text-xs">
              Public — appears in the bidder list before reveal.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="echo-bid">Bid</Label>
            <Textarea
              id="echo-bid"
              placeholder="Your bid amount, terms, or rationale. Encrypted before it leaves your browser."
              className="min-h-32 font-mono text-sm"
              maxLength={BID_MAX}
              value={bidText}
              onChange={(e) => setBidText(e.target.value)}
              disabled={busy}
            />
            <p className="text-muted-foreground text-xs">
              {bidText.length}/{BID_MAX} · sealed until auction close
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 border-t pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button onClick={submit} disabled={!canSubmit} className="gap-2">
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Lock className="size-4" />
              )}
              {phase.kind === "encrypting"
                ? "Sealing…"
                : phase.kind === "uploading"
                  ? "Uploading…"
                  : phase.kind === "registering"
                    ? "Registering…"
                    : "Seal bid"}
            </Button>
          </div>

          {phase.kind === "error" ? (
            <p className="text-destructive text-sm">{phase.message}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
