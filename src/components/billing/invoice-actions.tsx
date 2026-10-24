"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, MoreHorizontal, Printer, Undo2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cancelInvoice, reversePayment } from "@/app/(app)/mensalidades/actions";
import { PaymentDialog, type PayableInvoice } from "./payment-dialog";

function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: string;
  onSubmit: (reason: string) => Promise<{ ok: boolean; error?: string; message?: string }>;
}) {
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="reason">Motivo</Label>
          <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            disabled={pending || reason.trim().length < 3}
            onClick={() =>
              start(async () => {
                const r = await onSubmit(reason);
                if (!r.ok) return void toast.error(r.error);
                toast.success(r.message ?? "Concluído.");
                onOpenChange(false);
                router.refresh();
              })
            }
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InvoiceActions({
  invoice,
  status,
  payments,
  finePercent,
  interestPercent,
  canReverse,
}: {
  invoice: PayableInvoice;
  status: string;
  payments: { id: string; receipt_number: number; reversed_at: string | null }[];
  finePercent: number;
  interestPercent: number;
  canReverse: boolean;
}) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reverseId, setReverseId] = useState<string | null>(null);
  const active = payments.filter((p) => !p.reversed_at);
  return (
    <div className="flex items-center justify-end gap-1">
      {status === "pendente" && (
        <PaymentDialog
          invoice={invoice}
          finePercent={finePercent}
          interestPercent={interestPercent}
          trigger={
            <Button size="sm" variant="outline">
              <Wallet /> Receber
            </Button>
          }
        />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" aria-label="Mais ações">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {active.map((p) => (
            <DropdownMenuItem key={p.id} asChild>
              <Link href={`/mensalidades/recibo/${p.id}`} target="_blank">
                <Printer /> Recibo nº {p.receipt_number}
              </Link>
            </DropdownMenuItem>
          ))}
          {canReverse &&
            active.map((p) => (
              <DropdownMenuItem key={`r-${p.id}`} destructive onSelect={() => setReverseId(p.id)}>
                <Undo2 /> Estornar recibo {p.receipt_number}
              </DropdownMenuItem>
            ))}
          {status === "pendente" && active.length === 0 && (
            <DropdownMenuItem destructive onSelect={() => setCancelOpen(true)}>
              <Ban /> Cancelar cobrança
            </DropdownMenuItem>
          )}
          {active.length === 0 && status !== "pendente" && <DropdownMenuItem disabled>Sem ações disponíveis</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
      <ReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar cobrança"
        description="A mensalidade deixará de ser cobrada. Esta ação fica registrada na auditoria."
        onSubmit={(reason) => cancelInvoice({ id: invoice.id, reason })}
      />
      <ReasonDialog
        open={!!reverseId}
        onOpenChange={(o) => !o && setReverseId(null)}
        title="Estornar pagamento"
        description="O recebimento será cancelado no livro-caixa e a mensalidade voltará a ficar pendente."
        onSubmit={(reason) => reversePayment({ payment_id: reverseId!, reason })}
      />
    </div>
  );
}
