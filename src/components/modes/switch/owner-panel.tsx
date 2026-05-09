"use client";

import { useEffect, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function SwitchOwnerPanel({
  switchId,
  initialDeadline,
}: {
  switchId: string;
  initialDeadline: string;
}) {
  const [deadline, setDeadline] = useState(initialDeadline);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const deadlineDate = new Date(deadline);
  const remainingMs = deadlineDate.getTime() - now;
  const isOverdue = remainingMs <= 0;

  async function checkin() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/switches/${switchId}/checkin`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { deadline: string };
      setDeadline(data.deadline);
      toast.success("Checked in. Switch reset.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border-border/70 bg-muted/30 flex flex-col gap-4 rounded-xl border p-5">
      <div className="flex items-center gap-3">
        <ShieldCheck className="size-5" strokeWidth={1.75} />
        <h2 className="text-lg font-semibold">You own this switch.</h2>
      </div>

      <div className="grid gap-2 text-sm">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-muted-foreground">Will trigger</span>
          <span className="font-medium">{format(deadlineDate, "PPpp")}</span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-muted-foreground">In</span>
          <span
            className={
              isOverdue
                ? "text-destructive font-mono font-medium"
                : "font-mono font-medium"
            }
          >
            {isOverdue
              ? "now overdue"
              : formatDistanceToNow(deadlineDate, { addSuffix: false })}
          </span>
        </div>
      </div>

      <Button onClick={checkin} disabled={submitting} className="self-start gap-2">
        {submitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ShieldCheck className="size-4" />
        )}
        I&apos;m alive — check in
      </Button>

      <p className="text-muted-foreground text-xs leading-relaxed">
        Each check-in resets the timer. Bookmark this page or set a reminder so
        you don&apos;t miss it.
      </p>
    </div>
  );
}
