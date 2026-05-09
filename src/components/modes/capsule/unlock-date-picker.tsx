"use client";

import { useMemo } from "react";
import { addDays, addMonths, addYears, format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Date+time picker for capsule unlocks. Quick presets + a calendar fallback.
 * The picked Date is always in the user's local timezone — drand rounds are
 * UTC-based, so the conversion to round happens once we have a Date.
 */

type Preset = { label: string; value: () => Date };

const PRESETS: Preset[] = [
  { label: "1 day", value: () => addDays(new Date(), 1) },
  { label: "1 week", value: () => addDays(new Date(), 7) },
  { label: "1 month", value: () => addMonths(new Date(), 1) },
  { label: "1 year", value: () => addYears(new Date(), 1) },
];

export function UnlockDatePicker({
  value,
  onChange,
  disabled,
}: {
  value: Date | null;
  onChange: (d: Date) => void;
  disabled?: boolean;
}) {
  const minDate = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now;
  }, []);

  const dateString = value ? format(value, "yyyy-MM-dd") : "";
  const timeString = value ? format(value, "HH:mm") : "12:00";

  function setDatePart(dateStr: string) {
    const next = value ? new Date(value) : new Date();
    const [y, m, d] = dateStr.split("-").map(Number);
    next.setFullYear(y, (m ?? 1) - 1, d ?? 1);
    onChange(next);
  }

  function setTimePart(timeStr: string) {
    const next = value ? new Date(value) : new Date();
    const [h, mi] = timeStr.split(":").map(Number);
    next.setHours(h ?? 0, mi ?? 0, 0, 0);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p.label}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onChange(p.value())}
            className="rounded-full"
          >
            {p.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Popover>
          <PopoverTrigger
            disabled={disabled}
            className="border-input hover:bg-muted disabled:pointer-events-none disabled:opacity-50 flex h-9 flex-1 items-center justify-start gap-2 rounded-md border bg-transparent px-3 text-sm font-normal transition-colors"
          >
            <CalendarIcon className="size-4" />
            {value ? format(value, "PPP") : "Pick a date"}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value ?? undefined}
              onSelect={(d) => {
                if (d) {
                  setDatePart(format(d, "yyyy-MM-dd"));
                }
              }}
              disabled={(d) => d < minDate}
              autoFocus
            />
          </PopoverContent>
        </Popover>

        <Input
          type="time"
          value={timeString}
          disabled={disabled}
          onChange={(e) => setTimePart(e.target.value)}
          className="w-full sm:w-32"
          aria-label="Unlock time"
        />
      </div>

      {value ? (
        <p className="text-muted-foreground text-xs">
          Will unlock on{" "}
          <span className="text-foreground font-medium">
            {format(value, "PPpp")}
          </span>
          . Drand quicknet rounds emit every 3 seconds, so unlock may be a few
          seconds later than the chosen instant.
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          Pick a future moment. Even Hermetic itself cannot decrypt this capsule
          before then.
        </p>
      )}

      {value && value <= minDate ? (
        <p className="text-destructive text-xs">
          Pick a date at least 5 minutes in the future.
        </p>
      ) : null}

      <input
        type="text"
        value={dateString}
        onChange={(e) => setDatePart(e.target.value)}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
      />
    </div>
  );
}
