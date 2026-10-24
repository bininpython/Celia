"use client";
import Link from "next/link";
import { Pencil, Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { LogDialog } from "@/components/training/log-dialog";
import { deleteWorkoutPlan, logWorkoutAsTrainer, setWorkoutActive } from "../actions";

export function TrainerLogButton({ studentId, item }: { studentId: string; item: { id: string; name: string; sets: number; reps: string; load_kg: number | null } }) {
  return <LogDialog item={item} action={(v) => logWorkoutAsTrainer({ ...v, student_id: studentId })} />;
}

export function WorkoutActions({ id, active }: { id: string; active: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" asChild>
        <Link href={`/treinos/${id}/imprimir`} target="_blank">
          <Printer /> Imprimir
        </Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href={`/treinos/${id}/editar`}>
          <Pencil /> Editar
        </Link>
      </Button>
      <ConfirmAction
        trigger={<Button variant="outline">{active ? "Encerrar" : "Reativar"}</Button>}
        title={active ? "Encerrar ficha?" : "Reativar ficha?"}
        description={active ? "A ficha deixa de aparecer como atual para o aluno." : "A ficha voltará a ser exibida ao aluno."}
        onConfirm={() => setWorkoutActive({ id, active: !active })}
      />
      <ConfirmAction
        trigger={
          <Button variant="ghost" size="icon" aria-label="Excluir ficha">
            <Trash2 />
          </Button>
        }
        title="Excluir ficha?"
        description="A ficha e suas divisões serão removidas. Os registros de execução do aluno são mantidos."
        destructive
        confirmLabel="Excluir"
        onConfirm={() => deleteWorkoutPlan({ id })}
        redirectTo="/treinos"
      />
    </div>
  );
}
