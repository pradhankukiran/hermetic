"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Shuffle } from "lucide-react";

const ALL_MODES = [
  "/drop",
  "/capsule",
  "/switch",
  "/pact",
  "/halo",
  "/beacon",
  "/echo",
  "/sleeper",
  "/mirror",
  "/sigil",
] as const;

export function RandomSealButton() {
  const router = useRouter();

  function go() {
    const target = ALL_MODES[Math.floor(Math.random() * ALL_MODES.length)];
    router.push(target);
  }

  return (
    <button
      type="button"
      onClick={go}
      className="bg-foreground text-background inline-flex h-10 cursor-pointer items-center gap-2 px-5 text-xs font-bold uppercase tracking-wide transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-foreground/90"
    >
      <Shuffle className="size-3.5" strokeWidth={2.5} />
      Seal something
      <ArrowRight className="size-3.5" strokeWidth={2.5} />
    </button>
  );
}
