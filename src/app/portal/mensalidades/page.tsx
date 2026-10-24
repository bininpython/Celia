import type { Metadata } from "next";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireModule } from "@/lib/auth";
import { formatDate, formatDateTime, todayISO } from "@/lib/dates";
import { displayStatus, invoiceTotal } from "@/lib/finance/invoice";
import { formatCurrency } from "@/lib/format";
import { INVOICE_STATUS, PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Minhas mensalidades" };

export default async function MyInvoicesPage() {
  const user = await requireModule("portal");
  const supabase = await createClient();
  const today = todayISO();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, payments(id, amount, method, paid_at, receipt_number, reversed_at)")
    .eq("student_id", user.studentId!)
    .neq("status", "cancelado")
    .order("due_date", { ascending: false });
  const open = (invoices ?? []).filter((i) => i.status === "pendente");
  const payments = (invoices ?? []).flatMap((i) => i.payments.filter((p) => !p.reversed_at).map((p) => ({ ...p, description: i.description }))).sort((a, b) => b.paid_at.localeCompare(a.paid_at));

  return (
    <>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Mensalidades</h1>
        <p className="text-sm text-muted-foreground">
          {open.length ? `${open.length} em aberto · ${formatCurrency(open.reduce((a, i) => a + invoiceTotal(i), 0))}` : "Tudo em dia."} Pagamentos são registrados pela recepção.
        </p>
      </div>
      <Card className="pb-0">
        <CardHeader>
          <CardTitle>Cobranças</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {!invoices?.length ? (
            <div className="px-5 pb-5">
              <EmptyState icon={Wallet} title="Nenhuma cobrança" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="max-w-56 truncate">{i.description}</TableCell>
                    <TableCell>{formatDate(i.due_date)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(invoiceTotal(i))}</TableCell>
                    <TableCell>
                      <StatusBadge map={INVOICE_STATUS} value={displayStatus(i, today)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card className="pb-0">
        <CardHeader>
          <CardTitle>Pagamentos e recibos</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {!payments.length ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Referente a</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDateTime(p.paid_at)}</TableCell>
                    <TableCell className="max-w-48 truncate">{p.description}</TableCell>
                    <TableCell>{PAYMENT_METHOD_LABELS[p.method]}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(Number(p.amount))}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/portal/mensalidades/recibo/${p.id}`} className="text-primary hover:underline">
                        Recibo nº {p.receipt_number}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
