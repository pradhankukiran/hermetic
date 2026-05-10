import { Fingerprint } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { OpenHalo } from "@/components/modes/halo/open-halo";

type Params = Promise<{ cid: string }>;

export default async function HaloUnlockPage({ params }: { params: Params }) {
  const { cid } = await params;
  return (
    <>
      <PageHeader
        icon={Fingerprint}
        eyebrow={`Halo · ${cid.slice(0, 12)}…${cid.slice(-6)}`}
        title="Unlocking sealed halo."
        description="Fetching the encrypted envelope from IPFS. Unlock requires the passkey that originally sealed this halo — your authenticator's PRF output never leaves the device."
      />
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <OpenHalo cid={cid} />
      </div>
    </>
  );
}
