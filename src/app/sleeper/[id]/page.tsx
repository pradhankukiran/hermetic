import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Power } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { OpenSleeper } from "@/components/modes/sleeper/open-sleeper";
import { SleeperOwnerPanel } from "@/components/modes/sleeper/owner-panel";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db/client";

type Params = Promise<{ id: string }>;

export default async function SleeperDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const db = getDb();
  const rows = await db
    .select({
      id: schema.sleepers.id,
      ownerId: schema.sleepers.ownerId,
      status: schema.sleepers.status,
      releasedAt: schema.sleepers.releasedAt,
      createdAt: schema.sleepers.createdAt,
    })
    .from(schema.sleepers)
    .where(eq(schema.sleepers.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) notFound();

  const user = await getSessionUser();
  const isOwner = !!user && user.id === row.ownerId;

  const title =
    row.status === "released"
      ? "The seal is open."
      : row.status === "revoked"
        ? "Re-sealed by the owner."
        : "Sealed by command.";

  const description =
    row.status === "released"
      ? "The owner has released this sleeper. Anyone with the URL fragment key can decrypt the contents in their browser."
      : row.status === "revoked"
        ? "The owner has re-sealed this sleeper. New viewers can no longer reach the ciphertext through Hermetic."
        : "This sleeper sits encrypted indefinitely. The owner controls when it becomes readable — there is no timer or auto-unlock.";

  return (
    <>
      <PageHeader
        icon={Power}
        eyebrow={`Sleeper · ${id.slice(0, 8)}…${id.slice(-6)}`}
        title={title}
        description={description}
      />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
        {isOwner ? (
          <SleeperOwnerPanel
            sleeperId={row.id}
            initialStatus={row.status}
            initialReleasedAt={row.releasedAt?.toISOString() ?? null}
          />
        ) : null}

        <OpenSleeper sleeperId={row.id} />
      </div>
    </>
  );
}
