import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Handshake, ShieldAlert } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { PactUnlockPanel } from "@/components/modes/pact/unlock-panel";
import { getDb, schema } from "@/lib/db/client";

type Params = Promise<{ id: string }>;

/**
 * Public Pact unlock page.
 *
 * Pacts have no timer — they are openable from creation when every party's
 * share is present. Status flips to "revoked" only when the owner
 * explicitly disables the pact, in which case the CID is suppressed.
 */
export default async function PactDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const db = getDb();
  const rows = await db
    .select({
      id: schema.pacts.id,
      cid: schema.pacts.cid,
      partyCountN: schema.pacts.partyCountN,
      status: schema.pacts.status,
    })
    .from(schema.pacts)
    .where(eq(schema.pacts.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) notFound();

  return (
    <>
      <PageHeader
        icon={Handshake}
        eyebrow={`Pact · ${id.slice(0, 8)}…${id.slice(-6)}`}
        title={
          row.status === "revoked"
            ? "Pact revoked."
            : `Gather all ${row.partyCountN} parties to unlock.`
        }
        description={
          row.status === "revoked"
            ? "The owner explicitly disabled this pact. The shares that were issued can no longer unlock anything."
            : "Every party brings their share. When all are present here at the same time, the browser combines them and decrypts the contents. Shares never leave this page."
        }
      />
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        {row.status === "active" ? (
          <PactUnlockPanel cid={row.cid} partyCountN={row.partyCountN} />
        ) : (
          <RevokedStatus />
        )}
      </div>
    </>
  );
}

function RevokedStatus() {
  return (
    <div className="border-amber-500/30 bg-amber-500/5 flex gap-3 rounded-xl border p-5">
      <ShieldAlert
        className="text-amber-500 size-5 shrink-0"
        strokeWidth={1.75}
      />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Pact revoked</p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          The owner intentionally disabled this pact. The shares you received
          can no longer unlock anything.
        </p>
      </div>
    </div>
  );
}
