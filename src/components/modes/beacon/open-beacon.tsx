"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Download,
  FileLock2,
  KeyRound,
  Loader2,
  Radio,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { utf8Decode } from "@/lib/crypto";
import {
  fetchBeaconHeader,
  getCurrentBlockHeight,
  openBeacon,
  type BeaconHeader,
  type OpenedBeacon,
} from "@/lib/modes/beacon";
import { formatBytes } from "@/lib/utils/format";

type Phase =
  | { kind: "loading-header" }
  | {
      kind: "waiting";
      header: BeaconHeader;
      currentHeight: bigint | null;
    }
  | {
      kind: "ready-to-unlock";
      header: BeaconHeader;
      currentHeight: bigint;
    }
  | {
      kind: "decrypting";
      header: BeaconHeader;
      currentHeight: bigint;
    }
  | {
      kind: "open";
      header: BeaconHeader;
      beacon: OpenedBeacon;
    }
  | { kind: "error"; message: string };

const POLL_INTERVAL_MS = 12_000; // ~one mainnet block

export function OpenBeacon({ cid }: { cid: string }) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading-header" });
  const [passphrase, setPassphrase] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // Fetch envelope header on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const header = await fetchBeaconHeader(cid);
        if (cancelled) return;
        setPhase({ kind: "waiting", header, currentHeight: null });
      } catch (err) {
        if (cancelled) return;
        setPhase({
          kind: "error",
          message:
            err instanceof Error ? err.message : "Failed to fetch beacon",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cid]);

  // Poll the chain head while we are waiting.
  const waitingTarget =
    phase.kind === "waiting" ? phase.header.targetHeight : null;
  useEffect(() => {
    if (waitingTarget == null) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const h = await getCurrentBlockHeight();
        if (cancelled) return;
        setPhase((p) => {
          if (p.kind !== "waiting") return p;
          if (h >= p.header.targetHeight) {
            return { kind: "ready-to-unlock", header: p.header, currentHeight: h };
          }
          return { ...p, currentHeight: h };
        });
      } catch (err) {
        // Don't blow up the page on a transient RPC hiccup; the next tick
        // will retry. We do still surface the latest error string.
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setPhase((p) =>
          p.kind === "waiting" ? p : p, // type-narrow no-op
        );
        // eslint-disable-next-line no-console
        console.warn("beacon poll failed:", msg);
      }
    };

    void tick();
    const id = setInterval(() => void tick(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [waitingTarget]);

  async function unlock() {
    if (phase.kind !== "ready-to-unlock") return;
    if (passphrase.length < 1) {
      setUnlockError("Enter the owner passphrase to unlock.");
      return;
    }
    setUnlockError(null);
    setPhase({
      kind: "decrypting",
      header: phase.header,
      currentHeight: phase.currentHeight,
    });
    try {
      const beacon = await openBeacon(cid, passphrase);
      setPhase((p) =>
        p.kind === "decrypting" ? { kind: "open", header: p.header, beacon } : p,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Decryption failed";
      setUnlockError(msg);
      // Drop back to ready so the user can retry with another passphrase.
      setPhase((p) =>
        p.kind === "decrypting"
          ? { kind: "ready-to-unlock", header: p.header, currentHeight: p.currentHeight }
          : p,
      );
    }
  }

  if (phase.kind === "loading-header") {
    return (
      <div className="border-border/60 bg-muted/20 flex items-center gap-3 rounded-xl border border-dashed p-10">
        <Loader2 className="size-5 animate-spin" />
        <p className="text-muted-foreground text-sm">
          Fetching beacon envelope from IPFS…
        </p>
      </div>
    );
  }

  if (phase.kind === "error") {
    return (
      <div className="border-destructive/30 bg-destructive/5 flex flex-col gap-2 rounded-xl border p-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-destructive size-4" />
          <p className="text-sm font-medium">Couldn&apos;t open beacon</p>
        </div>
        <p className="text-muted-foreground text-sm">{phase.message}</p>
      </div>
    );
  }

  if (phase.kind === "waiting") {
    return <Countdown header={phase.header} currentHeight={phase.currentHeight} />;
  }

  if (phase.kind === "ready-to-unlock" || phase.kind === "decrypting") {
    return (
      <UnlockPanel
        header={phase.header}
        currentHeight={phase.currentHeight}
        passphrase={passphrase}
        onPassphraseChange={setPassphrase}
        onUnlock={unlock}
        decrypting={phase.kind === "decrypting"}
        error={unlockError}
      />
    );
  }

  return <BeaconContent header={phase.header} beacon={phase.beacon} />;
}

function Countdown({
  header,
  currentHeight,
}: {
  header: BeaconHeader;
  currentHeight: bigint | null;
}) {
  const blocksRemaining =
    currentHeight != null && header.targetHeight > currentHeight
      ? header.targetHeight - currentHeight
      : null;

  return (
    <div className="border-border/70 bg-muted/30 flex flex-col gap-5 rounded-xl border p-6">
      <div className="flex items-center gap-3">
        <Radio className="size-5" strokeWidth={1.75} />
        <h2 className="text-lg font-semibold">Sealed until block</h2>
      </div>

      <p className="font-mono text-3xl font-medium tracking-tight tabular-nums sm:text-4xl">
        {header.targetHeight.toString()}
      </p>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat
          label="Current block"
          value={currentHeight != null ? currentHeight.toString() : "…"}
        />
        <Stat label="Target" value={header.targetHeight.toString()} />
        <Stat
          label="Blocks remaining"
          value={blocksRemaining != null ? blocksRemaining.toString() : "…"}
        />
      </div>

      <div className="text-muted-foreground grid gap-1 text-xs">
        <p>
          Chain id:{" "}
          <span className="text-foreground font-mono">{header.chainId}</span>{" "}
          (Ethereum mainnet)
        </p>
        <p>
          Filename:{" "}
          <span className="text-foreground font-mono">{header.filename}</span>{" "}
          · {formatBytes(header.size)}
        </p>
      </div>

      <p className="text-muted-foreground inline-flex items-center gap-2 text-xs leading-relaxed">
        <RefreshCw className="size-3" /> Polling chain head every 12 seconds.
        When the target block is mined, this page will switch to an unlock
        prompt — you&apos;ll need the owner passphrase to actually decrypt.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background flex flex-col gap-0.5 rounded-lg border p-3">
      <p className="font-mono text-base font-semibold tabular-nums truncate">
        {value}
      </p>
      <p className="text-muted-foreground text-[10px] tracking-widest uppercase">
        {label}
      </p>
    </div>
  );
}

function UnlockPanel({
  header,
  currentHeight,
  passphrase,
  onPassphraseChange,
  onUnlock,
  decrypting,
  error,
}: {
  header: BeaconHeader;
  currentHeight: bigint;
  passphrase: string;
  onPassphraseChange: (s: string) => void;
  onUnlock: () => void;
  decrypting: boolean;
  error: string | null;
}) {
  const overshoot = currentHeight - header.targetHeight;

  return (
    <div className="flex flex-col gap-5">
      <div className="border-border/70 bg-muted/30 flex flex-col gap-3 rounded-xl border p-5">
        <div className="flex items-center gap-3">
          <Radio className="size-5" strokeWidth={1.75} />
          <h2 className="text-lg font-semibold">
            Block target reached — provide passphrase
          </h2>
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          The chain has mined block{" "}
          <span className="text-foreground font-mono">
            {currentHeight.toString()}
          </span>
          {" "}({overshoot.toString()} past the target of{" "}
          <span className="text-foreground font-mono">
            {header.targetHeight.toString()}
          </span>
          ). The UI gate is now open. To actually decrypt the contents, enter
          the owner passphrase. A wrong passphrase fails the AEAD tag check
          and rejects the input — the contents stay sealed.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            type="password"
            placeholder="Owner passphrase"
            value={passphrase}
            onChange={(e) => onPassphraseChange(e.target.value)}
            disabled={decrypting}
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === "Enter") onUnlock();
            }}
          />
          <Button
            onClick={onUnlock}
            disabled={decrypting || passphrase.length === 0}
            className="gap-2"
          >
            {decrypting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <KeyRound className="size-4" />
            )}
            {decrypting ? "Decrypting…" : "Unlock"}
          </Button>
        </div>
        {error ? <p className="text-destructive text-xs">{error}</p> : null}
      </div>
    </div>
  );
}

function BeaconContent({
  header,
  beacon,
}: {
  header: BeaconHeader;
  beacon: OpenedBeacon;
}) {
  const isText = beacon.mimeType.startsWith("text/");
  const text = isText ? utf8Decode(beacon.bytes) : null;

  function download() {
    const buffer = new ArrayBuffer(beacon.bytes.byteLength);
    new Uint8Array(buffer).set(beacon.bytes);
    const blob = new Blob([buffer], { type: beacon.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = beacon.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="border-border/70 bg-muted/30 flex items-center justify-between gap-4 rounded-xl border p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="bg-background flex size-10 shrink-0 items-center justify-center rounded-lg border">
            <FileLock2 className="size-4" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{beacon.filename}</p>
            <p className="text-muted-foreground text-xs">
              {formatBytes(beacon.bytes.byteLength)} · {beacon.mimeType} ·
              unlocked at block{" "}
              <span className="font-mono">
                {header.targetHeight.toString()}
              </span>
            </p>
          </div>
        </div>
        <Button onClick={download} size="sm" className="gap-2">
          <Download className="size-4" /> Download
        </Button>
      </div>

      {text != null ? (
        <div className="border-border/70 bg-muted/30 rounded-xl border p-5">
          <p className="text-muted-foreground mb-2 text-xs tracking-widest uppercase">
            Decrypted message
          </p>
          <pre className="bg-background overflow-auto rounded-md border p-4 text-sm whitespace-pre-wrap">
            {text}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
