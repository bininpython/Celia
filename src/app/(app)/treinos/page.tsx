import type { Metadata } from "next";
import Link from "next/link";
import { Dumbbell, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination, SearchInput, SelectFilter } from "@/components/shared/url-filters";
import { requireModule } from "@/lib/auth";
import { formatDate, todayISO } from "@/lib/dates";
import { readPage, readString } from "@/lib/period";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch } from "@/lib/utils";

export const metadata: Metadata = { title: "Fichas de treino" };
const PAGE_SIZE = 30;

export default async function WorkoutsPage({ searchParams }: PageProps<"/treinos">) {
  await requireModule("treinos");
  const sp = await searchParams;
  const q = sanitizeSearch(readString(sp, "q"));
  const situacao = readString(sp, "situacao") ?? "ativas";
  const page = readPage(sp);
  const supabase = await createClient();
  const today = todayISO();

  let query = supabase
    .from("workout_plans")
    .select("id, title, goal, start_date, end_date, active, students!inner(id, full_name), workout_divisions(label)", { count: "exact" })
    .order("start_date", { ascending: false });
  if (situacao === "ativas") query = query.eq("active", true);
  if (situacao === "encerradas") query = query.eq("active", false);
  if (situacao === "revisar") query = query.eq("active", true).lte("end_date", today);
  if (q) query = query.ilike("students.full_name", `%${q}%`);
  const { data: plans, count } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  return (
    <>
      <PageHeader
        title="Fichas de treino"
        description="Fichas A, B, C, D, E e personalizadas por aluno."
        actions={
          <Button asChild>
            <Link href="/treinos/nova">
              <Plus /> Nova ficha
            </Link>
          </Button>
        }
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput placeholder="Nome do aluno" />
        <SelectFilter
          param="situacao"
          label="Ativas"
          options={[
            { value: "todas", label: "Todas" },
            { value: "encerradas", label: "Encerradas" },
            { value: "revisar", label: "Revisão vencida" },
          ]}
        />
      </div>
      <Card className="py-0">
        <CardContent className="px-0">
          {!plans?.length ? (
            <div className="p-6">
              <EmptyState icon={Dumbbell} title="Nenhuma ficha encontrada" description="Crie a primeira ficha de treino." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Ficha</TableHead>
                  <TableHead>Divisões</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Revisão</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link href={`/alunos/${p.students.id}`} className="hover:text-primary">
                        {p.students.full_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/treinos/${p.id}`} className="font-medium hover:text-primary">
                        {p.title}
                      </Link>
                      {p.goal && <span className="block text-xs text-muted-foreground">{p.goal}</span>}
                    </TableCell>
                    <TableCell>{p.workout_divisions.map((d) => d.label).join(" · ")}</TableCell>
                    <TableCell>{formatDate(p.start_date)}</TableCell>
                    <TableCell className={p.active && p.end_date && p.end_date <= today ? "text-destructive" : undefined}>{formatDate(p.end_date)}</TableCell>
                    <TableCell>{p.active ? <Badge tone="success">Ativa</Badge> : <Badge>Encerrada</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
    </>
  );
}
