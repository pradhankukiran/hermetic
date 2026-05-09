import type { LucideIcon } from "lucide-react";

export function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon?: LucideIcon;
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="border-b">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-10 sm:px-6">
        {eyebrow ? (
          <div className="text-muted-foreground inline-flex items-center gap-2 text-xs tracking-widest uppercase">
            {Icon ? <Icon className="size-3.5" strokeWidth={1.75} /> : null}
            <span>{eyebrow}</span>
          </div>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {description ? (
          <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
