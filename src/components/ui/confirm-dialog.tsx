"use client";

import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ConfirmDialogProps = {
  title: string;
  /** Sebutkan akibatnya, bukan cuma bertanya "yakin?". */
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  pending?: boolean;
  onConfirm: () => void;
  /** Tombol pemicu. Dipasang lewat asChild jadi gayanya milik pemanggil. */
  children: ReactNode;
};

/**
 * Pengganti confirm() bawaan browser. Menyimpan state terbukanya sendiri
 * supaya pemanggil tidak perlu menambah useState di tiap tempat.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "Batal",
  tone = "default",
  pending = false,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            variant={tone === "danger" ? "destructive" : "primary"}
            className="w-full sm:flex-1"
            disabled={pending}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            {confirmLabel}
          </Button>
          <Button
            variant="outline"
            className="w-full sm:flex-1"
            onClick={() => setOpen(false)}
          >
            {cancelLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
