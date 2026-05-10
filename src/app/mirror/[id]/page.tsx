import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { GitCompareArrows, ShieldAlert } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { MirrorUnlockPanel } from "@/components/modes/mirror/unlock-panel";
import { getDb, schema } from "@/lib/db/client";

type Params = Promise<{ id: string }>;

export default async function MirrorDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const db = getDb();
  const rows = await db
    .select({
      id: schema.mirrors.id,
      cid: schema.mirrors.cid,
      status: schema.mirrors.status,
    })
    .from(schema.mirrors)
    .where(eq(schema.mirrors.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) notFound();

  return (
    <>
      <PageHeader
        icon={GitCompareArrows}
        eyebrow={`Mirror · ${id.slice(0, 8)}…${id.slice(-6)}`}
        title={
          row.status === "revoked"
            ? "Mirror revoked."
            : "Mirror is sealed."
        }
        description={
          row.status === "revoked"
            ? "This Mirror has been revoked. The halves you received can no longer unlock anything."
            : "Both holders must paste their halves below at the same time. Neither half on its own can decrypt the contents."
        }
      />
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        {row.status === "active" && row.cid ? (
          <MirrorUnlockPanel cid={row.cid} />
        ) : null}

        {row.status === "revoked" ? <RevokedStatus /> : null}
      </div>
    </>
  );
}

function RevokedStatus() {
  return (
    <div className="border-amber-500/30 bg-amber-500/5 flex gap-3 rounded-xl border p-5">
      <ShieldAlert className="text-amber-500 size-5 shrink-0" strokeWidth={1.75} />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Mirror revoked</p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          The creator disabled this Mirror. The halves you received can no
          longer unlock anything.
        </p>
      </div>
    </div>
  );
}
