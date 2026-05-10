import { Construction } from "lucide-react";

export function ComingSoon({ mode }: { mode: string }) {
  return (
    <div className="border-2 border-foreground bg-muted flex items-start gap-4 p-6">
      <Construction className="size-6 shrink-0" strokeWidth={2.5} />
      <div className="flex flex-col gap-1">
        <p className="text-base font-bold uppercase tracking-tight">
          {mode} is being built
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          The crypto, UI, and routes for this mode are landing soon. Bookmark
          this page — it will work as expected once deployed.
        </p>
      </div>
    </div>
  );
}
