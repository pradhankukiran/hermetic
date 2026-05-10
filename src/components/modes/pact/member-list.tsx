"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MIN_MEMBERS = 2;
const MAX_MEMBERS = 10;

export type PactMember = { email: string };

export function PactMemberList({
  members,
  onChange,
  disabled,
}: {
  members: PactMember[];
  onChange: (next: PactMember[]) => void;
  disabled?: boolean;
}) {
  function update(i: number, value: string) {
    const next = members.slice();
    next[i] = { email: value };
    onChange(next);
  }
  function remove(i: number) {
    if (members.length <= MIN_MEMBERS) return;
    onChange(members.filter((_, idx) => idx !== i));
  }
  function add() {
    if (members.length >= MAX_MEMBERS) return;
    onChange([...members, { email: "" }]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {members.map((m, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-muted-foreground bg-muted flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
              {i + 1}
            </span>
            <Input
              type="email"
              placeholder={`party${i + 1}@example.com`}
              value={m.email}
              onChange={(e) => update(i, e.target.value)}
              disabled={disabled}
              autoComplete="off"
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove party ${i + 1}`}
              disabled={disabled || members.length <= MIN_MEMBERS}
              onClick={() => remove(i)}
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || members.length >= MAX_MEMBERS}
        onClick={add}
        className="self-start gap-2"
      >
        <Plus className="size-3.5" /> Add party
      </Button>
    </div>
  );
}

export { MAX_MEMBERS, MIN_MEMBERS };
