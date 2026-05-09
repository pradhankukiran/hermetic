import { Send } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { OpenDrop } from "@/components/modes/drop/open-drop";

type Params = Promise<{ cid: string }>;

export default async function DropReceivePage({ params }: { params: Params }) {
  const { cid } = await params;
  return (
    <>
      <PageHeader
        icon={Send}
        eyebrow={`Drop · ${cid.slice(0, 12)}…${cid.slice(-6)}`}
        title="Opening sealed drop."
        description="Fetching encrypted content from IPFS and decrypting in your browser. The decryption key in this URL fragment is never sent to a server."
      />
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <OpenDrop cid={cid} />
      </div>
    </>
  );
}
