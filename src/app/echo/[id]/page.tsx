import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Gavel } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { OpenEcho } from "@/components/modes/echo/open-echo";
import { getDb, schema } from "@/lib/db/client";

type Params = Promise<{ id: string }>;

const UUID_RX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Public auction page. Anyone with the auction id can see the title,
 * description, countdown, bid roster (sealed), and — after close — the
 * "Reveal all bids" button. We only render the client controller when
 * the auction exists; it owns all the dynamic behaviour from there.
 */
export default async function EchoDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  if (!UUID_RX.test(id)) notFound();

  const db = getDb();
  const rows = await db
    .select({
      id: schema.echoes.id,
      title: schema.echoes.title,
    })
    .from(schema.echoes)
    .where(eq(schema.echoes.id, id))
    .limit(1);
  const echo = rows[0];
  if (!echo) notFound();

  return (
    <>
      <PageHeader
        icon={Gavel}
        eyebrow={`Echo · ${id.slice(0, 8)}…${id.slice(-6)}`}
        title="Sealed-bid auction."
        description="Bids are sealed under a shared drand round. They cannot be read by anyone — including the auctioneer — until the close time arrives. Then anyone visiting this page can reveal them all at once."
      />
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <OpenEcho auctionId={echo.id} />
      </div>
    </>
  );
}
