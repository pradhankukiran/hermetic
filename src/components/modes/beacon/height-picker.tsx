"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentBlockHeight } from "@/lib/modes/beacon";

/**
 * Picker for the unlock block height. Quick presets ("+10 min", "+1 hour",
 * etc., translated into block deltas at 12s/block) calculated from the
 * current chain head, plus an absolute-block input as a fallback.
 *
 * Stays honest: doesn't pretend to know exactly when a future block will
 * land, only that the chain head must equal-or-exceed the chosen number
 * before the open page even attempts decryption.
 */

const SECONDS_PER_BLOCK = 12;

type Preset = { label: string; addSeconds: number };

const PRESETS: Preset[] = [
  { label: "+10 min", addSeconds: 600 },
  { label: "+1 hour", addSeconds: 3600 },
  { label: "+1 day", addSeconds: 86_400 },
  { label: "+1 week", addSeconds: 604_800 },
];

function blocksFromSeconds(seconds: number): bigint {
  return BigInt(Math.ceil(seconds / SECONDS_PER_BLOCK));
}

export function HeightPicker({
  value,
  onChange,
  disabled,
}: {
  value: bigint | null;
  onChange: (h: bigint) => void;
  disabled?: boolean;
}) {
  const [head, setHead] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Fetch the current head once on mount + whenever the user clicks refresh.
  // All setState calls live behind an `await`, so the synchronous body of the
  // effect does no setState — keeps react-hooks/set-state-in-effect happy.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const h = await getCurrentBlockHeight();
        if (cancelled) return;
        setHead(h);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to read chain head",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshNonce]);

  function refresh() {
    setLoading(true);
    setRefreshNonce((n) => n + 1);
  }

  function applyPreset(addSeconds: number) {
    if (head == null) return;
    const target = head + blocksFromSeconds(addSeconds);
    onChange(target);
  }

  function applyText(text: string) {
    if (text.trim() === "") {
      // We can't represent "cleared" through the parent's bigint-or-null prop
      // when there's no other channel; the user can type non-numeric chars to
      // wipe and start over. The rendered value here will go back to "".
      return;
    }
    try {
      const n = BigInt(text.trim());
      if (n <= BigInt(0)) return;
      onChange(n);
    } catch {
      // Non-integer input — ignore until the user fixes it.
    }
  }

  // Fully derived from the prop — no local mirror, no setState-during-render.
  const inputValue = value != null ? value.toString() : "";

  const blocksRemaining =
    value != null && head != null && value > head ? value - head : null;
  const approxSeconds =
    blocksRemaining != null
      ? Number(blocksRemaining) * SECONDS_PER_BLOCK
      : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="border-border/70 bg-muted/30 flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs">
        <span className="text-muted-foreground">Mainnet head</span>
        <div className="flex items-center gap-2">
          <code className="font-mono">
            {head != null ? head.toString() : loading ? "…" : "?"}
          </code>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={refresh}
            disabled={loading}
            aria-label="Refresh chain head"
          >
            {loading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <RefreshCw className="size-3" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p.label}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || head == null}
            onClick={() => applyPreset(p.addSeconds)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="Or enter an absolute block number"
        value={inputValue}
        onChange={(e) => applyText(e.target.value)}
        disabled={disabled}
        aria-label="Target block height"
      />

      {value != null && head != null ? (
        value > head ? (
          <p className="text-muted-foreground text-xs">
            Will unlock at block{" "}
            <span className="text-foreground font-mono">
              {value.toString()}
            </span>
            {" — "}
            <span className="text-foreground font-mono">
              {blocksRemaining?.toString()}
            </span>{" "}
            blocks from now (~{formatSeconds(approxSeconds ?? 0)} at 12s
            blocks).
          </p>
        ) : (
          <p className="text-destructive text-xs">
            Block {value.toString()} is at or below the current head — pick a
            future block.
          </p>
        )
      ) : (
        <p className="text-muted-foreground text-xs">
          Pick a future Ethereum mainnet block. The open page will refuse to
          attempt decryption until the chain has mined that block.
        </p>
      )}

      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86_400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86_400).toFixed(1)}d`;
}
