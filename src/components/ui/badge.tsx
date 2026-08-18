import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  // whitespace-nowrap: teks yang membungkus merusak bentuk pil-nya.
  // Lencana memang untuk label pendek, jadi induknya yang harus flex-wrap.
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-legal font-semibold",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-muted-foreground",
        forest: "bg-primary/10 text-primary",
        accent: "bg-accent text-white",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        danger: "bg-destructive-soft text-destructive",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

/** Dipakai peta status di src/lib/constants.ts supaya tone tidak jadi string longgar. */
export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
