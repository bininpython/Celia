import type { Metadata } from "next";
import { ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput, SelectFilter } from "@/components/shared/url-filters";
import { requireModule } from "@/lib/auth";
import { EQUIPMENT, MUSCLE_GROUPS } from "@/lib/labels";
import { readString } from "@/lib/period";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch } from "@/lib/utils";
import { ExerciseDialog, ExerciseToggle } from "./exercise-dialog";

export const metadata: Metadata = { title: "Exercícios" };

export default async function ExercisesPage({ searchParams }: PageProps<"/exercicios">) {
  await requireModule("exercicios");
  const sp = await searchParams;
  const q = sanitizeSearch(readString(sp, "q"));
  const grupo = readString(sp, "grupo");
  const equip = readString(sp, "equipamento");
  const supabase = await createClient();
  let query = supabase.from("exercises").select("*").order("muscle_group").order("name");
  if (q) query = query.ilike("name", `%${q}%`);
  if (grupo) query = query.eq("muscle_group", grupo);
  if (equip) query = query.eq("equipment", equip);
  const { data: exercises } = await query;

  return (
    <>
      <PageHeader title="Biblioteca de exercícios" description={`${exercises?.length ?? 0} exercício(s)`} actions={<ExerciseDialog />} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput placeholder="Buscar exercício" />
        <SelectFilter param="grupo" label="Todos os grupos" options={Object.entries(MUSCLE_GROUPS).map(([value, label]) => ({ value, label }))} />
        <SelectFilter param="equipamento" label="Todos os equipamentos" options={Object.entries(EQUIPMENT).map(([value, label]) => ({ value, label }))} />
      </div>
      <Card className="py-0">
        <CardContent className="px-0">
          {!exercises?.length ? (
            <div className="p-6">
              <EmptyState icon={ListChecks} title="Nenhum exercício encontrado" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exercício</TableHead>
                  <TableHead>Grupo muscular</TableHead>
                  <TableHead>Equipamento</TableHead>
                  <TableHead className="text-right">Ativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exercises.map((e) => (
                  <TableRow key={e.id} className={e.active ? undefined : "text-muted-foreground"}>
                    <TableCell>
                      <span className="font-medium">{e.name}</span>
                      {e.instructions && <span className="block max-w-md truncate text-xs text-muted-foreground">{e.instructions}</span>}
                    </TableCell>
                    <TableCell>{MUSCLE_GROUPS[e.muscle_group] ?? e.muscle_group}</TableCell>
                    <TableCell>{EQUIPMENT[e.equipment] ?? e.equipment}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <ExerciseDialog
                          exercise={{
                            id: e.id,
                            name: e.name,
                            muscle_group: e.muscle_group,
                            equipment: e.equipment,
                            instructions: e.instructions ?? "",
                            video_url: e.video_url ?? "",
                          }}
                        />
                        <ExerciseToggle id={e.id} active={e.active} />
                      </div>
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
