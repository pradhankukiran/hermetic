import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t mt-auto">
      <div className="text-muted-foreground mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-6 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          Hermetic — sealed envelopes for the internet. End-to-end encrypted,
          zero-knowledge, decentralized.
        </p>
        <div className="flex items-center gap-4">
          <Link href="/about" className="hover:text-foreground transition-colors">
            About
          </Link>
          <Link href="/threat-model" className="hover:text-foreground transition-colors">
            Threat model
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Source
          </a>
        </div>
      </div>
    </footer>
  );
}
