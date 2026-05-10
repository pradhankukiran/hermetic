"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  Eye,
  Gavel,
  Hourglass,
  Loader2,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  fetchAuctionHeader,
  openBid,
  type AuctionHeader,
} from "@/lib/modes/echo";

import { BidList, type BidRow } from "./bid-list";
import { SubmitBidForm } from "./submit-bid-form";

type Status = "open" | "closing" | "closed";

type Phase =
  | { kind: "loading" }
  | { kind: "ready"; header: AuctionHeader; bids: BidRow[] }
  | { kind: "error"; message: string };

const POLL_OPEN_MS = 5000; // refresh bid roster every 5s while open
const POLL_CLOSED_MS = 15_000; // slower poll once closed

function statusFor(closesAt: Date): Status {
  const ms = closesAt.getTime() - Date.now();
  if (ms <= 0) return "closed";
  if (ms <= 1500) return "closing";
  return "open";
}

function useCountdown(target: Date) {
  const [now, setNow] = useState<number>(() => Date.now());
  const targetMs = target.getTime();
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [targetMs]);
  return targetMs - now;
}

function mergeBids(
  prev: BidRow[],
  serverBids: AuctionHeader["bids"],
): BidRow[] {
  // Preserve any already-revealed bid bodies across refreshes — we only
  // want to splice in newly-arrived rows.
  const existingByCid = new Map(prev.map((b) => [b.cid, b]));
  return serverBids.map((b) => {
    const existing = existingByCid.get(b.cid);
    if (existing) {
      return {
        cid: b.cid,
        bidderName: b.bidderName,
        submittedAt: b.submittedAt,
        state: existing.state,
      };
    }
    return {
      cid: b.cid,
      bidderName: b.bidderName,
      submittedAt: b.submittedAt,
      state: { status: "sealed" },
    };
  });
}

/**
 * Top-level controller for the auction page. Three lifecycle states:
 *
 *   - OPEN: countdown, "Submit a bid" button, live bid roster (sealed).
 *   - CLOSED, not yet revealed: "Reveal all bids" button. The drand
 *     round may or may not be signed yet (clocks differ); reveal-all
 *     attempts to decrypt every bid in sequence and surfaces "not ready
 *     yet" gracefully if the round signature isn't out.
 *   - CLOSED, revealed: every bid row shows the decrypted text.
 *
 * Decryption is sequential rather than parallel so the user can watch
 * each bid open one at a time — that visual cadence is the whole point
 * of the "echo" name.
 */
export function OpenEcho({ auctionId }: { auctionId: string }) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [showBidForm, setShowBidForm] = useState(false);
  const [revealing, setRevealing] = useState(false);

  // Refresher: fetch the auction header from the server and merge the
  // bid list. Setting state inside an async callback (microtask) is the
  // intended pattern for "synchronize React with an external system".
  const refresh = useCallback(async () => {
    try {
      const header = await fetchAuctionHeader(auctionId);
      setPhase((prev) => {
        const prevBids = prev.kind === "ready" ? prev.bids : [];
        return { kind: "ready", header, bids: mergeBids(prevBids, header.bids) };
      });
    } catch (err) {
      // Don't replace a ready state with an error on a transient poll
      // failure — only surface on first load.
      setPhase((prev) => {
        if (prev.kind !== "loading") return prev;
        return {
          kind: "error",
          message:
            err instanceof Error ? err.message : "Failed to load auction",
        };
      });
    }
  }, [auctionId]);

  // Initial load. Wrap in an async IIFE so setState happens in a
  // microtask (linter is happy and behaviour matches Capsule mode).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const header = await fetchAuctionHeader(auctionId);
        if (cancelled) return;
        setPhase({
          kind: "ready",
          header,
          bids: mergeBids([], header.bids),
        });
      } catch (err) {
        if (cancelled) return;
        setPhase({
          kind: "error",
          message:
            err instanceof Error ? err.message : "Failed to load auction",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auctionId]);

  // Polling cadence — fast while open, slow once closed.
  const closesAtMs =
    phase.kind === "ready" ? phase.header.closesAt.getTime() : null;
  useEffect(() => {
    if (closesAtMs == null) return;
    const status = statusFor(new Date(closesAtMs));
    const period = status === "closed" ? POLL_CLOSED_MS : POLL_OPEN_MS;
    const id = setInterval(() => {
      void refresh();
    }, period);
    return () => clearInterval(id);
  }, [closesAtMs, refresh]);

  // When the auction closes, kick off a one-shot refresh ~1s later
  // so the new "closed" status renders without waiting for the poll.
  useEffect(() => {
    if (closesAtMs == null) return;
    const ms = closesAtMs - Date.now();
    if (ms <= 0) return;
    const id = setTimeout(() => {
      void refresh();
    }, ms + 1000);
    return () => clearTimeout(id);
  }, [closesAtMs, refresh]);

  // The reveal-all loop reads from current state via a snapshot taken
  // at click-time. We use a small ref to hold the latest bids so the
  // callback can re-read between awaited bid decryptions; the ref is
  // updated from an effect, NEVER during render.
  const bidsRef = useRef<BidRow[]>([]);
  const headerIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (phase.kind === "ready") {
      bidsRef.current = phase.bids;
      headerIdRef.current = phase.header.id;
    }
  }, [phase]);

  const revealAll = useCallback(async () => {
    const headerId = headerIdRef.current;
    if (!headerId) return;
    setRevealing(true);
    try {
      // Snapshot the cid order at click-time. Each row's *state* is read
      // from the live ref between awaits so we don't reattempt rows that
      // have already been resolved by a concurrent action.
      const cids = bidsRef.current.map((b) => b.cid);
      for (const cid of cids) {
        const current = bidsRef.current.find((b) => b.cid === cid);
        if (!current || current.state.status === "revealed") continue;
        setPhase((prev) => {
          if (prev.kind !== "ready") return prev;
          return {
            ...prev,
            bids: prev.bids.map((b) =>
              b.cid === cid ? { ...b, state: { status: "revealing" } } : b,
            ),
          };
        });
        try {
          const opened = await openBid(cid, headerId);
          if (opened == null) {
            // Round not yet emitted — back off and let the user retry.
            setPhase((prev) => {
              if (prev.kind !== "ready") return prev;
              return {
                ...prev,
                bids: prev.bids.map((b) =>
                  b.cid === cid
                    ? {
                        ...b,
                        state: {
                          status: "error",
                          message:
                            "Drand round not yet signed — try again in a few seconds.",
                        },
                      }
                    : b,
                ),
              };
            });
            // Stop the loop: if the round isn't out yet, the rest will
            // fail too. The user can hit "Reveal all bids" again later.
            break;
          }
          setPhase((prev) => {
            if (prev.kind !== "ready") return prev;
            return {
              ...prev,
              bids: prev.bids.map((b) =>
                b.cid === cid
                  ? { ...b, state: { status: "revealed", opened } }
                  : b,
              ),
            };
          });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to decrypt bid";
          setPhase((prev) => {
            if (prev.kind !== "ready") return prev;
            return {
              ...prev,
              bids: prev.bids.map((b) =>
                b.cid === cid
                  ? { ...b, state: { status: "error", message } }
                  : b,
              ),
            };
          });
        }
      }
    } finally {
      setRevealing(false);
    }
  }, []);

  if (phase.kind === "loading") {
    return (
      <div className="border-2 border-dashed border-foreground bg-muted/20 flex items-center gap-3 p-10">
        <Loader2 className="size-5 animate-spin" />
        <p className="text-muted-foreground text-sm font-bold uppercase tracking-wide">
          Loading auction…
        </p>
      </div>
    );
  }

  if (phase.kind === "error") {
    return (
      <div className="border-2 border-foreground bg-destructive/5 flex flex-col gap-2 p-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-destructive size-4" />
          <p className="text-sm font-bold uppercase tracking-tight">
            Couldn&apos;t load auction
          </p>
        </div>
        <p className="text-muted-foreground text-sm">{phase.message}</p>
      </div>
    );
  }

  const { header, bids } = phase;
  const status = statusFor(header.closesAt);
  const allRevealed =
    bids.length > 0 && bids.every((b) => b.state.status === "revealed");

  return (
    <div className="flex flex-col gap-6">
      <AuctionHeaderPanel header={header} status={status} />

      {status !== "closed" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-foreground bg-muted/30 p-4">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-bold uppercase tracking-tight">
              Bidding is open
            </p>
            <p className="text-muted-foreground text-xs">
              Bids are sealed in your browser before upload.
            </p>
          </div>
          <Button onClick={() => setShowBidForm(true)} className="gap-2">
            <Plus className="size-4" /> Submit a bid
          </Button>
        </div>
      ) : (
        <ClosedBanner
          allRevealed={allRevealed}
          revealing={revealing}
          onReveal={revealAll}
          bidCount={bids.length}
        />
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Bids · {bids.length}
        </h2>
        <BidList bids={bids} />
      </div>

      {showBidForm ? (
        <SubmitBidForm
          auctionId={header.id}
          drandRound={header.drandRound}
          onClose={() => setShowBidForm(false)}
          onSubmitted={() => {
            setShowBidForm(false);
            void refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function AuctionHeaderPanel({
  header,
  status,
}: {
  header: AuctionHeader;
  status: Status;
}) {
  const ms = useCountdown(header.closesAt);
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const label =
    status === "closed"
      ? "Auction closed"
      : status === "closing"
        ? "Closing now…"
        : "Closes in";

  return (
    <div className="flex flex-col gap-5 border-2 border-foreground bg-muted/30 p-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight uppercase sm:text-3xl">
          {header.title}
        </h2>
        <p className="text-muted-foreground mt-3 whitespace-pre-wrap text-sm leading-relaxed">
          {header.description}
        </p>
      </div>

      <div className="flex flex-col gap-3 border-t-2 border-foreground/30 pt-5">
        <div className="flex items-center gap-2">
          <Hourglass className="size-4" strokeWidth={2.5} />
          <p className="text-xs font-bold uppercase tracking-widest">
            {label}
          </p>
        </div>

        {status === "closed" ? (
          <p className="font-mono text-3xl font-black tabular-nums sm:text-4xl">
            {format(header.closesAt, "PPpp")}
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-3 text-center">
            {[
              { label: "Days", value: days },
              { label: "Hours", value: hours },
              { label: "Minutes", value: mins },
              { label: "Seconds", value: secs },
            ].map((unit) => (
              <div
                key={unit.label}
                className="bg-background border-2 border-foreground flex flex-col gap-0.5 p-3"
              >
                <p className="font-mono text-2xl font-black tabular-nums">
                  {unit.value.toString().padStart(2, "0")}
                </p>
                <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
                  {unit.label}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="text-muted-foreground grid gap-1 text-xs sm:grid-cols-2">
          <p>
            Closes:{" "}
            <span className="text-foreground font-mono">
              {format(header.closesAt, "PPpp")}
            </span>
          </p>
          <p>
            Drand round:{" "}
            <span className="text-foreground font-mono">
              {header.drandRound.toLocaleString()}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function ClosedBanner({
  allRevealed,
  revealing,
  onReveal,
  bidCount,
}: {
  allRevealed: boolean;
  revealing: boolean;
  onReveal: () => void;
  bidCount: number;
}) {
  if (allRevealed) {
    return (
      <div className="bg-foreground text-background flex flex-wrap items-center justify-between gap-3 border-2 border-foreground p-4">
        <div className="flex items-center gap-3">
          <Gavel className="size-5" strokeWidth={2.5} />
          <p className="text-sm font-bold uppercase tracking-tight">
            All bids revealed
          </p>
        </div>
        <p className="font-mono text-xs uppercase tracking-widest opacity-80">
          {bidCount} bid{bidCount === 1 ? "" : "s"} open
        </p>
      </div>
    );
  }

  return (
    <div className="border-2 border-foreground bg-muted/30 flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-bold uppercase tracking-tight">
          Auction closed
        </p>
        <p className="text-muted-foreground text-xs">
          The drand round has been signed (or will be momentarily). Reveal
          decrypts every bid in sequence in your browser.
        </p>
      </div>
      <Button
        onClick={onReveal}
        disabled={revealing || bidCount === 0}
        className="gap-2"
      >
        {revealing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Eye className="size-4" />
        )}
        {revealing ? "Revealing…" : "Reveal all bids"}
      </Button>
    </div>
  );
}
