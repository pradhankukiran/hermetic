import Link from "next/link";
import { AlertTriangle } from "lucide-react";

type Search = Promise<{ reason?: string }>;

const REASONS: Record<string, string> = {
  "missing-token": "No token in the URL. The link may have been truncated.",
  "invalid-or-expired":
    "Link is invalid, already used, or expired. Magic links last 15 minutes.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const { reason } = await searchParams;
  const message = (reason && REASONS[reason]) ?? "Something went wrong.";

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center sm:px-6">
      <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full">
        <AlertTriangle className="size-5" strokeWidth={1.75} />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Sign-in failed</h1>
        <p className="text-muted-foreground">{message}</p>
      </div>
      <Link
        href="/auth/signin"
        className="hover:bg-muted inline-flex h-9 items-center rounded-full border px-4 text-sm transition-colors"
      >
        Try again
      </Link>
    </div>
  );
}
