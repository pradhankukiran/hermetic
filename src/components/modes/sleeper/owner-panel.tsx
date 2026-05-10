"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Lock, Power, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Status = "asleep" | "released" | "revoked";

type OwnerState = {
  status: Status;
  releasedAt: string | null;
};

export function SleeperOwnerPanel({
  sleeperId,
  initialStatus,
  initialReleasedAt,
}: {
  sleeperId: string;
  initialStatus: Status;
  initialReleasedAt: string | null;
}) {
  const [state, setState] = useState<OwnerState>({
    status: initialStatus,
    releasedAt: initialReleasedAt,
  });
  const [submitting, setSubmitting] = useState<null | "release" | "revoke">(
    null,
  );

  async function release() {
    setSubmitting("release");
    try {
      const res = await fetch(`/api/sleepers/${sleeperId}/release`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        status: Status;
        releasedAt: string | null;
      };
      setState({ status: data.status, releasedAt: data.releasedAt });
      toast.success("Seal released. Anyone with the URL can now decrypt.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(null);
    }
  }

  async function revoke() {
    setSubmitting("revoke");
    try {
      const res = await fetch(`/api/sleepers/${sleeperId}/revoke`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { status: Status };
      setState({ status: data.status, releasedAt: null });
      toast.success("Sealed again. The CID is hidden from new viewers.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(null);
    }
  }

  const isReleased = state.status === "released";

  return (
    <div className="flex flex-col gap-5">
      <div className="border-2 border-foreground bg-background flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="bg-foreground text-background flex size-10 shrink-0 items-center justify-center">
            <Power className="size-5" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
              You own this sleeper
            </p>
            <h2 className="text-lg font-black uppercase tracking-tight">
              {isReleased ? "Released — public" : "Sealed by command"}
            </h2>
          </div>
        </div>

        <div className="grid gap-2 text-sm">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-muted-foreground">Status</span>
            <span className="font-mono font-medium">
              {state.status.toUpperCase()}
            </span>
          </div>
          {state.releasedAt ? (
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-muted-foreground">Released</span>
              <span className="font-medium">
                {format(new Date(state.releasedAt), "PPpp")}
              </span>
            </div>
          ) : null}
        </div>

        {isReleased ? (
          <Button
            onClick={revoke}
            disabled={submitting !== null}
            variant="outline"
            className="self-start gap-2 border-2"
          >
            {submitting === "revoke" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Undo2 className="size-4" strokeWidth={2.5} />
            )}
            Re-seal (revoke)
          </Button>
        ) : (
          <Button
            onClick={release}
            disabled={submitting !== null}
            className="self-start gap-2 hover:translate-x-0.5 hover:translate-y-0.5"
          >
            {submitting === "release" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Power className="size-4" strokeWidth={2.5} />
            )}
            Release seal
          </Button>
        )}
      </div>

      <div className="border-border/60 bg-muted/20 flex gap-3 rounded-xl border border-dashed p-4">
        <Lock className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <div className="flex flex-col gap-1.5">
          <p className="text-muted-foreground text-xs leading-relaxed">
            {isReleased ? (
              <>
                The CID is now public. Anyone with the share URL (which
                includes the decryption key in its <code>#</code> fragment) can
                decrypt the contents. Re-sealing hides the CID from new
                viewers, but anyone who already grabbed it can still fetch the
                ciphertext from IPFS — they still need the URL fragment to
                decrypt.
              </>
            ) : (
              <>
                The CID is hidden from the public status endpoint. Even if the
                share URL is leaked, the page will show &ldquo;sealed&rdquo;
                until you press <em>Release</em>. We never see the decryption
                key.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
