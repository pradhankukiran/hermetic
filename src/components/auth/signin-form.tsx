"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Phase = "idle" | "sending" | "sent" | "error";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPhase("sending");
    setError(null);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      setPhase("sent");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed";
      setError(message);
      setPhase("error");
      toast.error(message);
    }
  }

  if (phase === "sent") {
    return (
      <div className="border-border/70 bg-muted/30 flex flex-col gap-2 rounded-xl border p-6 text-center">
        <p className="text-lg font-medium">Check your inbox.</p>
        <p className="text-muted-foreground text-sm">
          We sent a sign-in link to{" "}
          <span className="text-foreground font-medium">{email}</span>. The link
          expires in 15 minutes.
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          Didn&apos;t arrive? Check spam, then try again.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={phase === "sending"}
        />
      </div>
      <Button type="submit" disabled={phase === "sending" || !email} className="gap-2">
        {phase === "sending" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        {phase === "sending" ? "Sending…" : "Send magic link"}
      </Button>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
        By signing in, you agree that you are the only person checking in to your
        Switches. If your email is compromised, your trustees should be notified
        through another channel.
      </p>
    </form>
  );
}
