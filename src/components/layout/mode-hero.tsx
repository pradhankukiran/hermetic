import type { LucideIcon } from "lucide-react";

/**
 * Mode-page hero — mirrors the landing hero's visual language at a smaller scale.
 *  - Big bold icon (rounded square, thick stroke)
 *  - Big bold mode title (e.g. "Drop")
 *  - Medium tagline ("Sealed by link")
 *  - Description paragraph
 *
 * Sits in the left column of the mode page's two-column app shell layout.
 */
export function ModeHero({
  icon: Icon,
  title,
  tagline,
  description,
}: {
  icon: LucideIcon;
  title: string;
  tagline: string;
  description: string;
}) {
  return (
    <section className="flex flex-col items-start justify-center gap-6">
      <div className="flex items-center gap-4 sm:gap-5">
        <div className="bg-foreground text-background flex size-14 shrink-0 items-center justify-center sm:size-16">
          <Icon className="size-7 sm:size-8" strokeWidth={2.5} />
        </div>
        <h1 className="text-5xl font-black tracking-tighter uppercase sm:text-6xl">
          {title}
        </h1>
      </div>

      <p className="text-2xl font-bold uppercase tracking-tight sm:text-3xl">
        Sealed
        <span className="text-muted-foreground"> {tagline.replace(/^Sealed /, "")}</span>
      </p>

      <p className="text-muted-foreground max-w-md text-base leading-relaxed sm:text-lg">
        {description}
      </p>
    </section>
  );
}
