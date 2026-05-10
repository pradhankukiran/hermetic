import { Radio } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { OpenBeacon } from "@/components/modes/beacon/open-beacon";

type Params = Promise<{ cid: string }>;

export default async function BeaconOpenPage({ params }: { params: Params }) {
  const { cid } = await params;
  return (
    <>
      <PageHeader
        icon={Radio}
        eyebrow={`Beacon · ${cid.slice(0, 12)}…${cid.slice(-6)}`}
        title="Sealed beacon."
        description="The chain block-height anchor decides when this page is allowed to attempt decryption. Once the target block is mined, you'll need the owner passphrase to actually unwrap the contents."
      />
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <OpenBeacon cid={cid} />
      </div>
    </>
  );
}
