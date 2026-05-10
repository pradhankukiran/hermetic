"use client";

import { format } from "date-fns";
import { Eye, EyeOff, Loader2, ScrollText } from "lucide-react";

import type { OpenedBid } from "@/lib/modes/echo";

export type BidRowState =
  | { status: "sealed" }
  | { status: "revealing" }
  | { status: "revealed"; opened: OpenedBid }
  | { status: "error"; message: string };

export type BidRow = {
  cid: string;
  bidderName: string;
  submittedAt: Date;
  state: BidRowState;
};

/**
 * Brutalist bid roster. Pre-close: shows just the bidder display names
 * + submission timestamps. Post-close: rows expand to reveal the
 * decrypted bid text as each one is opened (in sequence by the parent).
 */
export function BidList({ bids }: { bids: BidRow[] }) {
  if (bids.length === 0) {
    return (
      <div className="border-2 border-dashed border-foreground p-8 text-center">
        <p className="text-muted-foreground text-sm font-bold uppercase tracking-wide">
          No bids yet
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          Bids appear here as they are submitted, but their contents stay
          sealed until the close round arrives.
        </p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {bids.map((bid, i) => (
        <BidItem key={bid.cid} index={i + 1} bid={bid} />
      ))}
    </ol>
  );
}

function BidItem({ index, bid }: { index: number; bid: BidRow }) {
  return (
    <li className="border-2 border-foreground bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="bg-foreground text-background flex size-9 shrink-0 items-center justify-center font-mono text-sm font-bold">
            {String(index).padStart(2, "0")}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold uppercase tracking-tight">
              {bid.bidderName}
            </p>
            <p className="text-muted-foreground text-xs font-mono">
              {format(bid.submittedAt, "PPp")}
            </p>
          </div>
        </div>
        <BidStatusBadge state={bid.state} />
      </div>
      <BidBody state={bid.state} />
      <p className="text-muted-foreground mt-2 truncate font-mono text-[10px]">
        cid {bid.cid}
      </p>
    </li>
  );
}

function BidStatusBadge({ state }: { state: BidRowState }) {
  if (state.status === "sealed") {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide">
        <EyeOff className="size-3.5" /> Sealed
      </span>
    );
  }
  if (state.status === "revealing") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide">
        <Loader2 className="size-3.5 animate-spin" /> Revealing
      </span>
    );
  }
  if (state.status === "revealed") {
    return (
      <span className="bg-foreground text-background inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold uppercase tracking-wide">
        <Eye className="size-3.5" /> Open
      </span>
    );
  }
  return (
    <span className="text-destructive inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide">
      <EyeOff className="size-3.5" /> Failed
    </span>
  );
}

function BidBody({ state }: { state: BidRowState }) {
  if (state.status === "sealed" || state.status === "revealing") return null;

  if (state.status === "error") {
    return (
      <p className="text-destructive border-destructive/40 bg-destructive/5 mt-3 border-2 p-3 text-xs">
        {state.message}
      </p>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-1">
      <p className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest">
        <ScrollText className="size-3" /> Decrypted bid
      </p>
      <pre className="bg-muted border-2 border-foreground p-3 font-mono text-xs whitespace-pre-wrap break-words">
        {state.opened.text}
      </pre>
    </div>
  );
}
