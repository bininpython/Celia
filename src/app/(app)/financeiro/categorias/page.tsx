import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { DRE_GROUP_LABELS, NATURE_LABELS, TX_TYPE_LABELS } from "@/lib/labels";
import { requireModule } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CategoryDialog, CategoryToggle } from "./category-dialog";

export const metadata: Metadata = { title: "Categorias financeiras" };

export default async function CategoriesPage() {
  await requireModule("financeiro");
  const supabase = await createClient();
  const { data } = await supabase.from("financial_categories").select("*").order("type", { ascending: false }).order("name");
  return (
    <>
      <PageHeader title="Categorias financeiras" description="Classificação de receitas e despesas, fixas e variáveis." actions={<CategoryDialog />} />
      <Card className="py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Natureza</TableHead>
                <TableHead>Grupo no DRE</TableHead>
                <TableHead className="text-right">Ativa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((c) => (
                <TableRow key={c.id} className={c.active ? undefined : "text-muted-foreground"}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      {c.color && <span className="size-2.5 rounded-full" style={{ background: c.color }} aria-hidden />}
                      {c.name}
                      {c.is_system && <Lock className="size-3 text-muted-foreground" aria-label="Categoria do sistema" />}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge tone={c.type === "receita" ? "success" : "neutral"}>{TX_TYPE_LABELS[c.type]}</Badge>
                  </TableCell>
                  <TableCell>{NATURE_LABELS[c.nature]}</TableCell>
                  <TableCell>{DRE_GROUP_LABELS[c.dre_group]}</TableCell>
                  <TableCell>
                    {!c.is_system && (
                      <div className="flex items-center justify-end gap-1">
                        <CategoryDialog category={{ id: c.id, name: c.name, type: c.type, nature: c.nature, dre_group: c.dre_group as "custo_variavel", color: c.color ?? "" }} />
                        <CategoryToggle id={c.id} active={c.active} />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
