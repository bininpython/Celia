"use client";
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Result = { ok: true; message?: string } | { ok: false; error: string };

/** Botão com confirmação que executa uma Server Action. */
export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel = "Confirmar",
  destructive,
  onConfirm,
  successMessage,
  redirectTo,
}: {
  trigger: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<Result>;
  successMessage?: string;
  redirectTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            destructive={destructive}
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              start(async () => {
                const res = await onConfirm();
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success(res.message ?? successMessage ?? "Operação concluída.");
                setOpen(false);
                if (redirectTo) router.push(redirectTo);
                else router.refresh();
              });
            }}
          >
            {pending ? "Processando…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
