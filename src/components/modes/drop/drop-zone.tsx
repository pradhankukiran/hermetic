"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { FileUp, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const MAX_BYTES = 100 * 1024 * 1024;

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

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
      <div className="border-border bg-muted/40 flex items-center justify-between gap-4 rounded-xl border p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="bg-background flex size-10 shrink-0 items-center justify-center rounded-lg border">
            <FileUp className="size-4" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-muted-foreground text-xs">
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
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 text-center transition-colors ${
          hovering
            ? "border-foreground bg-muted/40"
            : "border-border/60 bg-muted/20 hover:bg-muted/30"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        <div className="bg-background flex size-12 items-center justify-center rounded-full border">
          <Upload className="size-5" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-sm font-medium">Drop a file or click to browse</p>
          <p className="text-muted-foreground text-xs">
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
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
