import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FieldProps = {
  id: string;
  label: string;
  /** Teks bantuan yang selalu terlihat, bukan placeholder. */
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn("space-y-2.5", className)}>
      <label htmlFor={id} className="block text-meta font-medium text-foreground">
        {label}
        {required ? (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {children}

      {hint && !error ? (
        <p className="text-meta text-muted-foreground">{hint}</p>
      ) : null}

      {/* Ikon menemani warna supaya error tidak hanya dibawa warna merah */}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-meta font-medium text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
