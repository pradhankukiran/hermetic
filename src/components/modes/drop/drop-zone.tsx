"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { FileUp, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils/format";

const MAX_BYTES = 100 * 1024 * 1024;

export function DropZone({
  file,
  onFileChange,
  disabled,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const [hovering, setHovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = useCallback((f: File) => {
    if (f.size > MAX_BYTES) {
      setError(
        `File is ${formatBytes(f.size)} — max is ${formatBytes(MAX_BYTES)}.`,
      );
      return false;
    }
    setError(null);
    return true;
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setHovering(false);
      if (disabled) return;
      const f = e.dataTransfer.files?.[0];
      if (f && validate(f)) onFileChange(f);
    },
    [disabled, onFileChange, validate],
  );

  if (file) {
    return (
      <div className="border-2 border-foreground bg-background flex items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="bg-foreground text-background flex size-10 shrink-0 items-center justify-center">
            <FileUp className="size-4" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold uppercase tracking-tight">
              {file.name}
            </p>
            <p className="text-muted-foreground text-xs font-mono">
              {formatBytes(file.size)} · {file.type || "application/octet-stream"}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Remove file"
          disabled={disabled}
          onClick={() => onFileChange(null)}
        >
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setHovering(true);
        }}
        onDragLeave={() => setHovering(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            if (e.key === " ") e.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        className={`flex cursor-pointer flex-col items-center justify-center gap-4 border-[3px] border-dashed border-foreground p-10 text-center transition-colors ${
          hovering
            ? "bg-foreground text-background"
            : "bg-background hover:bg-muted"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        <div
          className={`flex size-14 items-center justify-center border-2 ${
            hovering
              ? "border-background bg-foreground"
              : "border-foreground bg-foreground text-background"
          }`}
        >
          <Upload className="size-6" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-base font-bold uppercase tracking-wide">
            Drop a file or click to browse
          </p>
          <p
            className={`text-xs font-mono ${
              hovering ? "text-background/80" : "text-muted-foreground"
            }`}
          >
            Up to {formatBytes(MAX_BYTES)}. Encrypted in your browser before upload.
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && validate(f)) onFileChange(f);
        }}
      />
      {error ? (
        <p className="text-foreground text-xs font-bold uppercase tracking-wide">
          {error}
        </p>
      ) : null}
    </div>
  );
}
