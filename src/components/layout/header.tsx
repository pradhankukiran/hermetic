import Link from "next/link";

import { Brand } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/drop", label: "Drop" },
  { href: "/capsule", label: "Capsule" },
  { href: "/switch", label: "Switch" },
];

export function Header() {
  return (
    <header className="border-b bg-background/70 sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Brand />
        <nav className="hidden items-center gap-1 text-sm sm:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
