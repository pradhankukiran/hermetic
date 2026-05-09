import Link from "next/link";
import { Hexagon } from "lucide-react";

export function Brand({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}
      aria-label="Hermetic — home"
    >
      <Hexagon
        className="size-5 text-foreground transition-transform group-hover:rotate-30"
        strokeWidth={1.75}
      />
      <span className="text-base">Hermetic</span>
    </Link>
  );
}
