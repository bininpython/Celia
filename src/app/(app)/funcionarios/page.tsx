import type { Metadata } from "next";
import { UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireModule } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatCurrency, formatPhone } from "@/lib/format";
import { MODULE_ROLES } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { ProfileAccessControls, StaffAccessDialog, StaffDialog } from "./staff-client";

export const metadata: Metadata = { title: "Equipe" };

const MODULE_NAMES: Partial<Record<keyof typeof MODULE_ROLES, string>> = {
  dashboard: "Dashboard",
  alunos: "Alunos (consulta)",
  alunos_editar: "Alunos (cadastro)",
  saude: "Dados de saúde",
  mensalidades: "Mensalidades",
  treinos: "Treinos",
  frequencia: "Frequência",
  financeiro: "Financeiro",
  analises: "Inteligência",
  relatorios: "Relatórios",
  funcionarios: "Equipe",
  configuracoes: "Configurações",
};

export default async function StaffPage() {
  const user = await requireModule("funcionarios");
  const isAdmin = user.role === "admin";
  const supabase = await createClient();
  const [{ data: staff }, { data: profiles }, { data: actions }] = await Promise.all([
    supabase.from("staff").select("*").order("active", { ascending: false }).order("full_name"),
    supabase.from("profiles").select("id, full_name, email, role, active, created_at").order("full_name"),
    supabase.from("audit_logs").select("actor_id, created_at").order("created_at", { ascending: false }).limit(1000),
  ]);
  const lastAction = new Map<string, string>();
  (actions ?? []).forEach((a) => a.actor_id && !lastAction.has(a.actor_id) && lastAction.set(a.actor_id, a.created_at));
  const roles = ["admin", "gerente", "recepcionista", "professor", "aluno"] as const;

  return (
    <>
      <PageHeader title="Equipe e permissões" description="Funcionários, funções, horários, acessos e histórico de ações." actions={<StaffDialog canCreateAdmin={isAdmin} />} />
      <Card className="py-0">
        <CardContent className="px-0">
          {!staff?.length ? (
            <div className="p-6">
              <EmptyState icon={UserCog} title="Nenhum funcionário cadastrado" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead className="hidden lg:table-cell">Horários</TableHead>
                  <TableHead className="hidden md:table-cell">Contato</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Salário</TableHead>
                  <TableHead>Acesso</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((s) => (
                  <TableRow key={s.id} className={s.active ? undefined : "text-muted-foreground"}>
                    <TableCell>
                      <span className="font-medium">{s.full_name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {s.position ?? "—"}
                        {s.hire_date && ` · desde ${formatDate(s.hire_date)}`}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge tone="brand">{ROLE_LABELS[s.role]}</Badge>
                    </TableCell>
                    <TableCell className="hidden max-w-48 truncate lg:table-cell">{(s.schedule as { texto?: string })?.texto ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">{formatPhone(s.phone)}</TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">{s.salary != null ? formatCurrency(Number(s.salary)) : "—"}</TableCell>
                    <TableCell>
                      {s.profile_id ? (
                        <span className="text-xs text-muted-foreground">
                          Com acesso
                          {lastAction.get(s.profile_id) && <span className="block">últ. ação {formatDateTime(lastAction.get(s.profile_id))}</span>}
                        </span>
                      ) : isAdmin ? (
                        <StaffAccessDialog staffId={s.id} email={s.email} />
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem acesso</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {(isAdmin || s.role !== "admin") && (
                        <StaffDialog
                          canCreateAdmin={isAdmin}
                          staff={{
                            id: s.id,
                            full_name: s.full_name,
                            email: s.email ?? "",
                            phone: s.phone ?? "",
                            cpf: s.cpf ?? "",
                            role: s.role as "professor",
                            position: s.position ?? "",
                            hire_date: s.hire_date ?? "",
                            salary: s.salary ?? "",
                            responsibilities: s.responsibilities ?? "",
                            schedule_text: (s.schedule as { texto?: string })?.texto ?? "",
                            active: s.active,
                            notes: s.notes ?? "",
                          }}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card className="pb-0">
          <CardHeader>
            <CardTitle>Usuários do sistema</CardTitle>
            <CardDescription>Perfis de acesso de todos os logins (equipe e alunos). Usuários inativos não conseguem acessar dados.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Última ação</TableHead>
                  <TableHead className="text-right">Perfil / ativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(profiles ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <span className="font-medium">{p.full_name}</span>
                      <span className="block text-xs text-muted-foreground">{p.email}</span>
                    </TableCell>
                    <TableCell>{formatDate(p.created_at)}</TableCell>
                    <TableCell>{formatDateTime(lastAction.get(p.id))}</TableCell>
                    <TableCell>
                      <ProfileAccessControls id={p.id} role={p.role} active={p.active} isSelf={p.id === user.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="pb-0">
        <CardHeader>
          <CardTitle>Matriz de permissões</CardTitle>
          <CardDescription>Aplicada na interface e garantida no banco por Row Level Security.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground uppercase">
                <th className="px-5 py-2 text-left font-medium">Módulo</th>
                {roles.map((r) => (
                  <th key={r} className="px-3 py-2 font-medium">
                    {ROLE_LABELS[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(MODULE_NAMES).map(([m, label]) => (
                <tr key={m} className="border-b last:border-0">
                  <td className="px-5 py-2">{label}</td>
                  {roles.map((r) => (
                    <td key={r} className="px-3 py-2 text-center">
                      {(MODULE_ROLES[m as keyof typeof MODULE_ROLES] as readonly string[]).includes(r) ? (
                        <span className="text-success" aria-label="Permitido">
                          ●
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50" aria-label="Sem acesso">
                          —
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="px-5 py-2">Portal do aluno (somente os próprios dados)</td>
                {roles.map((r) => (
                  <td key={r} className="px-3 py-2 text-center">
                    {r === "aluno" ? <span className="text-success">●</span> : <span className="text-muted-foreground/50">—</span>}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}
