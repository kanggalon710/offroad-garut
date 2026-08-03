"use client";

import { id as localeId } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";

import "react-day-picker/style.css";

import { cn } from "@/lib/utils";

/**
 * Kalender berbahasa Indonesia. Setiap sel tanggal berukuran 44px
 * supaya memenuhi target sentuh minimum di layar sentuh.
 */
export function Calendar({ className, classNames, ...props }: DayPickerProps) {
  return (
    <DayPicker
      locale={localeId}
      showOutsideDays
      className={cn("text-meta", className)}
      classNames={{
        months: "flex flex-col",
        month: "space-y-3",
        month_caption: "flex h-10 items-center justify-center",
        caption_label: "text-body font-bold capitalize",
        nav: "absolute inset-x-0 top-0 flex h-10 items-center justify-between px-1",
        button_previous:
          "inline-flex size-9 items-center justify-center rounded-[var(--radius-control)] text-foreground hover:bg-muted disabled:opacity-30",
        button_next:
          "inline-flex size-9 items-center justify-center rounded-[var(--radius-control)] text-foreground hover:bg-muted disabled:opacity-30",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-11 text-legal font-semibold uppercase text-muted-foreground",
        week: "flex w-full",
        day: "size-11 p-0",
        day_button:
          "size-11 rounded-[var(--radius-control)] font-medium transition-colors duration-150 hover:bg-muted",
        selected:
          "[&>button]:bg-primary [&>button]:text-on-primary [&>button]:hover:bg-primary-hover",
        today: "[&>button]:font-bold [&>button]:text-primary",
        outside: "[&>button]:text-muted-foreground/40",
        disabled: "[&>button]:cursor-not-allowed [&>button]:opacity-30 [&>button]:hover:bg-transparent",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" {...rest} />
          ) : (
            <ChevronRight className="size-4" {...rest} />
          ),
      }}
      {...props}
    />
  );
}
