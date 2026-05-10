import { Eye } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { OpenSigil } from "@/components/modes/sigil/open-sigil";

type Params = Promise<{ cid: string }>;

export default async function SigilOpenPage({ params }: { params: Params }) {
  const { cid } = await params;
  return (
    <>
      <PageHeader
        icon={Eye}
        eyebrow={`Sigil · ${cid.slice(0, 12)}…${cid.slice(-6)}`}
        title="Sealed sigil."
        description="A riddle guards this content. Type the witness — the answer — to unlock. Argon2id derives the key in your browser; the witness is never sent to a server."
      />
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <OpenSigil cid={cid} />
      </div>
    </>
  );
}
