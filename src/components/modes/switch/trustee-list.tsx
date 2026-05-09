"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MIN_TRUSTEES = 2;
const MAX_TRUSTEES = 10;

export type TrusteeEmail = { email: string };

export function TrusteeList({
  trustees,
  onChange,
  disabled,
}: {
  trustees: TrusteeEmail[];
  onChange: (next: TrusteeEmail[]) => void;
  disabled?: boolean;
}) {
  function update(i: number, value: string) {
    const next = trustees.slice();
    next[i] = { email: value };
    onChange(next);
  }
  function remove(i: number) {
    if (trustees.length <= MIN_TRUSTEES) return;
    onChange(trustees.filter((_, idx) => idx !== i));
  }
  function add() {
    if (trustees.length >= MAX_TRUSTEES) return;
    onChange([...trustees, { email: "" }]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {trustees.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-muted-foreground bg-muted flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
              {i + 1}
            </span>
            <Input
              type="email"
              placeholder={`trustee${i + 1}@example.com`}
              value={t.email}
              onChange={(e) => update(i, e.target.value)}
              disabled={disabled}
              autoComplete="off"
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove trustee ${i + 1}`}
              disabled={disabled || trustees.length <= MIN_TRUSTEES}
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
        disabled={disabled || trustees.length >= MAX_TRUSTEES}
        onClick={add}
        className="self-start gap-2"
      >
        <Plus className="size-3.5" /> Add trustee
      </Button>
    </div>
  );
}

export { MAX_TRUSTEES, MIN_TRUSTEES };
