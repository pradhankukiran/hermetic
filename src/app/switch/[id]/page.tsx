import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ShieldAlert, KeyRound } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { SwitchOwnerPanel } from "@/components/modes/switch/owner-panel";
import { SwitchUnlockPanel } from "@/components/modes/switch/unlock-panel";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db/client";

type Params = Promise<{ id: string }>;

export default async function SwitchDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const db = getDb();
  const rows = await db
    .select({
      id: schema.switches.id,
      ownerId: schema.switches.ownerId,
      cid: schema.switches.cid,
      thresholdK: schema.switches.thresholdK,
      shareCountN: schema.switches.shareCountN,
      status: schema.switches.status,
      lastCheckinAt: schema.switches.lastCheckinAt,
      inactivitySeconds: schema.switches.inactivitySeconds,
      triggeredAt: schema.switches.triggeredAt,
    })
    .from(schema.switches)
    .where(eq(schema.switches.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) notFound();

  const user = await getSessionUser();
  const isOwner = !!user && user.id === row.ownerId;

  const deadline = new Date(
    row.lastCheckinAt.getTime() + row.inactivitySeconds * 1000,
  );

  return (
    <>
      <PageHeader
        icon={KeyRound}
        eyebrow={`Switch · ${id.slice(0, 8)}…${id.slice(-6)}`}
        title={
          row.status === "triggered"
            ? "Trustees can now unlock."
            : row.status === "revoked"
              ? "Switch revoked."
              : "Switch is active."
        }
        description={
          row.status === "triggered"
            ? "The owner did not check in by the deadline. Combine your trustee shares below to decrypt the contents."
            : row.status === "revoked"
              ? "The owner explicitly disabled this switch. Trustees can no longer unlock it."
              : "Hermetic is monitoring this switch. If the owner stops checking in, trustees will be able to combine their shares here."
        }
      />
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        {row.status === "triggered" && row.cid ? (
          <SwitchUnlockPanel cid={row.cid} thresholdK={row.thresholdK} />
        ) : null}

        {row.status === "active" ? (
          isOwner ? (
            <SwitchOwnerPanel
              switchId={row.id}
              initialDeadline={deadline.toISOString()}
            />
          ) : (
            <ActiveStatus
              thresholdK={row.thresholdK}
              shareCountN={row.shareCountN}
            />
          )
        ) : null}

        {row.status === "revoked" ? <RevokedStatus /> : null}
      </div>
    </>
  );
}

function ActiveStatus({
  thresholdK,
  shareCountN,
}: {
  thresholdK: number;
  shareCountN: number;
}) {
  return (
    <div className="border-border/70 bg-muted/30 flex flex-col gap-3 rounded-xl border p-5">
      <h2 className="text-lg font-semibold">This switch is active.</h2>
      <p className="text-muted-foreground text-sm leading-relaxed">
        The owner is checking in regularly. If they go silent past the
        configured threshold, you will be emailed a notification — return here
        and combine your share with at least{" "}
        <span className="text-foreground font-medium">
          {thresholdK - 1} other trustee{thresholdK - 1 === 1 ? "" : "s"}
        </span>{" "}
        (out of {shareCountN}) to unlock the contents.
      </p>
      <p className="text-muted-foreground text-xs">
        For now, keep your share safe in your password manager. Don&apos;t share
        it with anyone, including other trustees, until the switch fires.
      </p>
    </div>
  );
}

function RevokedStatus() {
  return (
    <div className="border-amber-500/30 bg-amber-500/5 flex gap-3 rounded-xl border p-5">
      <ShieldAlert className="text-amber-500 size-5 shrink-0" strokeWidth={1.75} />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Switch revoked</p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          The owner intentionally disabled this switch. The shares you received
          can no longer unlock anything.
        </p>
      </div>
    </div>
  );
}
