import { LogoBadge } from "@/components/brand/logo";
import { PrintButton } from "@/components/shared/print-button";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatCpf, formatCurrency } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";

export function Receipt({
  p,
  gym,
}: {
  p: {
    receipt_number: number;
    amount: number;
    method: keyof typeof PAYMENT_METHOD_LABELS;
    paid_at: string;
    reversed_at: string | null;
    invoices: { description: string; due_date: string } | null;
    students: { full_name: string; cpf: string | null; enrollment_code: string } | null;
  };
  gym: { name: string; legal_name: string | null; cnpj: string | null; address: string | null; city: string | null; state: string | null; phone: string | null } | null;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="no-print flex justify-end">
        <PrintButton />
      </div>
      <article className="rounded-xl border bg-card p-8 print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-4 border-b pb-6">
          <div className="flex items-center gap-3">
            <LogoBadge className="size-11" />
            <div>
              <p className="font-semibold">{gym?.legal_name ?? gym?.name}</p>
              {gym?.cnpj && <p className="text-xs text-muted-foreground">CNPJ {gym.cnpj}</p>}
              {gym?.address && (
                <p className="text-xs text-muted-foreground">
                  {gym.address}
                  {gym.city && ` · ${gym.city}`}
                  {gym.state && `/${gym.state}`}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs tracking-wider text-muted-foreground uppercase">Recibo</p>
            <p className="text-xl font-semibold">nº {p.receipt_number}</p>
          </div>
        </header>
        {p.reversed_at && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">Pagamento ESTORNADO em {formatDateTime(p.reversed_at)}</p>
        )}
        <div className="space-y-4 py-6 text-sm leading-relaxed">
          <p>
            Recebemos de <strong>{p.students?.full_name}</strong>
            {p.students?.cpf && <> (CPF {formatCpf(p.students.cpf)})</>}, matrícula {p.students?.enrollment_code}, a importância de{" "}
            <strong>{formatCurrency(p.amount)}</strong>
            {p.invoices && (
              <>
                {" "}
                referente a <strong>{p.invoices.description}</strong> (vencimento {formatDate(p.invoices.due_date)})
              </>
            )}
            .
          </p>
          <dl className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-4">
            <div>
              <dt className="text-xs text-muted-foreground">Forma de pagamento</dt>
              <dd className="font-medium">{PAYMENT_METHOD_LABELS[p.method]}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Data do pagamento</dt>
              <dd className="font-medium">{formatDateTime(p.paid_at)}</dd>
            </div>
          </dl>
        </div>
        <footer className="mt-10 grid gap-2 border-t pt-4 text-center text-xs text-muted-foreground">
          <p>{gym?.name}</p>
          <p>Documento gerado eletronicamente pela plataforma de gestão.</p>
        </footer>
      </article>
    </div>
  );
}
