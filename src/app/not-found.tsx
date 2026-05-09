import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center sm:px-6">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <FileQuestion className="size-6" strokeWidth={1.75} />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Sealed and gone.</h1>
        <p className="text-muted-foreground">
          This page doesn&apos;t exist — or whatever was here has expired, been burned,
          or never had a key.
        </p>
      </div>
      <Link
        href="/"
        className="hover:bg-muted inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" /> Back to home
      </Link>
    </div>
  );
}
