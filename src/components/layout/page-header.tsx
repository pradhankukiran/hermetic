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
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex items-center gap-4">
          {Icon ? (
            <div className="bg-muted flex size-14 shrink-0 items-center justify-center rounded-xl sm:size-16">
              <Icon className="size-7 sm:size-8" strokeWidth={2.5} />
            </div>
          ) : null}
          <div className="flex min-w-0 flex-col">
            {eyebrow ? (
              <p className="text-muted-foreground text-base font-medium tracking-tight">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {title}
            </h1>
          </div>
        </div>
        {description ? (
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
