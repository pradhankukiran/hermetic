import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { ArrowRight, Hexagon, Hourglass, Plus, KeyRound } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

import { PageHeader } from "@/components/layout/page-header";
import { SignOutButton } from "@/components/auth/signout-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db/client";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/signin");

  const db = getDb();
  const switches = await db
    .select({
      id: schema.switches.id,
      cid: schema.switches.cid,
      thresholdK: schema.switches.thresholdK,
      shareCountN: schema.switches.shareCountN,
      status: schema.switches.status,
      lastCheckinAt: schema.switches.lastCheckinAt,
      inactivitySeconds: schema.switches.inactivitySeconds,
      triggeredAt: schema.switches.triggeredAt,
      createdAt: schema.switches.createdAt,
    })
    .from(schema.switches)
    .where(eq(schema.switches.ownerId, user.id))
    .orderBy(desc(schema.switches.createdAt));

  return (
    <>
      <PageHeader
        icon={Hexagon}
        eyebrow="Your dashboard"
        title="What you've sealed."
        description="Switches require an account because Hermetic checks in with you on a schedule. Drops and Capsules are not listed here — they live entirely as URLs you control."
      />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Switches</h2>
          <Link
            href="/switch"
            className={buttonVariants({ variant: "default", size: "default" }) + " gap-2"}
          >
            <Plus className="size-4" /> New switch
          </Link>
        </div>

        {switches.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-3">
            {switches.map((sw) => {
              const deadline = new Date(
                sw.lastCheckinAt.getTime() + sw.inactivitySeconds * 1000,
              );
              return (
                <Link
                  key={sw.id}
                  href={`/switch/${sw.id}`}
                  className="group border-border hover:border-foreground/40 flex flex-col gap-3 rounded-xl border p-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
                        <KeyRound className="size-4" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {sw.thresholdK}-of-{sw.shareCountN} switch
                        </p>
                        <p className="text-muted-foreground truncate font-mono text-xs">
                          {sw.id.slice(0, 8)}…{sw.id.slice(-6)}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={sw.status} />
                  </div>
                  <div className="text-muted-foreground grid gap-1 text-xs sm:grid-cols-3">
                    <div>
                      Created{" "}
                      <span className="text-foreground">
                        {format(sw.createdAt, "PP")}
                      </span>
                    </div>
                    {sw.status === "active" ? (
                      <div>
                        Triggers in{" "}
                        <span className="text-foreground font-medium">
                          {formatDistanceToNow(deadline)}
                        </span>
                      </div>
                    ) : sw.status === "triggered" && sw.triggeredAt ? (
                      <div>
                        Triggered{" "}
                        <span className="text-foreground">
                          {formatDistanceToNow(sw.triggeredAt, { addSuffix: true })}
                        </span>
                      </div>
                    ) : null}
                    <div className="hidden sm:flex sm:items-center sm:justify-end">
                      <ArrowRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="border-t pt-6">
          <SignOutButton />
        </div>
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <div className="border-border/60 bg-muted/20 flex flex-col items-start gap-3 rounded-xl border border-dashed p-8">
      <div className="bg-background flex size-10 items-center justify-center rounded-lg border">
        <KeyRound className="size-4" strokeWidth={1.75} />
      </div>
      <p className="text-sm font-medium">No switches yet.</p>
      <p className="text-muted-foreground text-sm">
        Create your first dead-man&apos;s switch — choose your trustees and how
        long without a check-in before it triggers.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link
          href="/switch"
          className={buttonVariants({ variant: "default", size: "default" }) + " gap-2"}
        >
          <KeyRound className="size-4" /> New Switch
        </Link>
        <Link
          href="/capsule"
          className={
            buttonVariants({ variant: "outline", size: "default" }) + " gap-2"
          }
        >
          <Hourglass className="size-4" /> Try Capsule instead
        </Link>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <Badge variant="secondary" className="gap-1.5">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        active
      </Badge>
    );
  }
  if (status === "triggered") {
    return (
      <Badge variant="secondary" className="gap-1.5">
        <span className="size-1.5 rounded-full bg-amber-500" />
        triggered
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1.5">
      <span className="size-1.5 rounded-full bg-zinc-400" />
      {status}
    </Badge>
  );
}
