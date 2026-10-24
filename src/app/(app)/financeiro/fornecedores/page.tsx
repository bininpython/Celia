import type { Metadata } from "next";
import { Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { addMonths, todayISO } from "@/lib/dates";
import { formatCurrency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { SupplierDialog } from "./supplier-dialog";

export const metadata: Metadata = { title: "Fornecedores" };

export default async function SuppliersPage() {
  const supabase = await createClient();
  const since = addMonths(todayISO(), -12);
  const [{ data: suppliers }, { data: spend }] = await Promise.all([
    supabase.from("suppliers").select("*").order("name"),
    supabase.from("transactions").select("supplier_id, amount").eq("status", "pago").eq("type", "despesa").gte("paid_date", since).not("supplier_id", "is", null).limit(5000),
  ]);
  const totals = new Map<string, number>();
  (spend ?? []).forEach((s) => totals.set(s.supplier_id!, (totals.get(s.supplier_id!) ?? 0) + Number(s.amount)));
  return (
    <>
      <PageHeader title="Fornecedores" description="Cadastro e gasto dos últimos 12 meses por fornecedor." actions={<SupplierDialog />} />
      <Card className="py-0">
        <CardContent className="px-0">
          {!suppliers?.length ? (
            <div className="p-6">
              <EmptyState icon={Truck} title="Nenhum fornecedor cadastrado" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead className="text-right">Pago (12 meses)</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((s) => (
                  <TableRow key={s.id} className={s.active ? undefined : "text-muted-foreground"}>
                    <TableCell>
                      <span className="font-medium">{s.name}</span>
                      {s.document && <span className="block text-xs text-muted-foreground">{s.document}</span>}
                    </TableCell>
                    <TableCell>{s.category ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{[s.phone, s.email].filter(Boolean).join(" · ") || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(totals.get(s.id) ?? 0)}</TableCell>
                    <TableCell className="text-right">
                      {!s.active && <Badge className="mr-2">Inativo</Badge>}
                      <SupplierDialog
                        supplier={{ id: s.id, name: s.name, document: s.document ?? "", email: s.email ?? "", phone: s.phone ?? "", category: s.category ?? "", notes: s.notes ?? "", active: s.active }}
                      />
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
