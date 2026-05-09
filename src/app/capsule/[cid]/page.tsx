import { Hourglass } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { OpenCapsule } from "@/components/modes/capsule/open-capsule";

type Params = Promise<{ cid: string }>;

export default async function CapsuleOpenPage({ params }: { params: Params }) {
  const { cid } = await params;
  return (
    <>
      <PageHeader
        icon={Hourglass}
        eyebrow={`Capsule · ${cid.slice(0, 12)}…${cid.slice(-6)}`}
        title="Sealed capsule."
        description="If the unlock time has arrived, this page will fetch the drand beacon signature and decrypt the capsule in your browser. Until then, you'll see a countdown."
      />
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <OpenCapsule cid={cid} />
      </div>
    </>
  );
}
