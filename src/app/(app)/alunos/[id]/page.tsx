import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Dumbbell, HeartPulse, ScanLine, Wallet } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { InvoiceActions } from "@/components/billing/invoice-actions";
import { SimpleBars } from "@/components/charts/simple-charts";
import { NewInvoiceButton } from "@/app/(app)/mensalidades/toolbar";
import { requireModule } from "@/lib/auth";
import { addDays, ageFrom, formatDate, formatDateTime, formatMonth, monthRange, todayISO, isoDateInGymTz, addMonths, startOfMonth } from "@/lib/dates";
import { displayStatus, invoiceTotal } from "@/lib/finance/invoice";
import { formatCpf, formatCurrency, formatPhone } from "@/lib/format";
import {
  CHECKIN_METHOD_LABELS, GENDER_LABELS, INVOICE_STATUS, MEMBERSHIP_STATUS, PAYMENT_METHOD_LABELS, PERIODICITY_LABELS, STUDENT_STATUS,
} from "@/lib/labels";
import { canAccess } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { initials } from "@/lib/utils";
import {
  AccessDialog, CancelMembershipDialog, HealthForm, NewMembershipDialog, PhotoUpload, RenegotiateDialog, StudentMenu,
} from "./profile-client";

export const metadata: Metadata = { title: "Perfil do aluno" };

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || "—"}</dd>
    </div>
  );
}

export default async function StudentProfilePage({ params }: PageProps<"/alunos/[id]">) {
  const user = await requireModule("alunos");
  const { id } = await params;
  const supabase = await createClient();
  const today = todayISO();
  const can = {
    edit: canAccess(user.role, "alunos_editar"),
    del: canAccess(user.role, "alunos_excluir"),
    billing: canAccess(user.role, "mensalidades"),
    health: canAccess(user.role, "saude"),
    workouts: canAccess(user.role, "treinos"),
    renegotiate: canAccess(user.role, "renegociar"),
    reverse: canAccess(user.role, "estornar"),
  };

  const { data: s } = await supabase.from("students").select("*").eq("id", id).maybeSingle();
  if (!s) notFound();

  const since = addDays(today, -180);
  const [memberships, invoices, health, plans, checkins, workouts, gym, photo] = await Promise.all([
    supabase.from("memberships").select("*, plans(name, periodicity, duration_months)").eq("student_id", id).order("start_date", { ascending: false }),
    can.billing
      ? supabase.from("invoices").select("*, payments(id, amount, method, paid_at, receipt_number, reversed_at)").eq("student_id", id).order("due_date", { ascending: false })
      : Promise.resolve({ data: null }),
    can.health ? supabase.from("student_health").select("*").eq("student_id", id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("plans").select("id, name, price, duration_months, periodicity").eq("active", true).order("price"),
    supabase.from("checkins").select("id, checked_in_at, method").eq("student_id", id).gte("checked_in_at", `${since}T00:00:00-03:00`).order("checked_in_at", { ascending: false }),
    can.workouts
      ? supabase.from("workout_plans").select("id, title, goal, start_date, end_date, active, workout_divisions(label)").eq("student_id", id).order("start_date", { ascending: false })
      : Promise.resolve({ data: null }),
    supabase.from("gyms").select("late_fee_percent, monthly_interest_percent").single(),
    s.photo_path ? supabase.storage.from("student-photos").createSignedUrl(s.photo_path, 3600) : Promise.resolve({ data: null }),
  ]);

  const active = memberships.data?.find((m) => m.status === "ativa" || m.status === "suspensa");
  const pendingInvoices = (invoices.data ?? []).filter((i) => i.status === "pendente");
  const overdue = pendingInvoices.filter((i) => i.due_date < today);
  const payments = (invoices.data ?? []).flatMap((i) => i.payments.map((p) => ({ ...p, description: i.description }))).sort((a, b) => b.paid_at.localeCompare(a.paid_at));

  const months = monthRange(addMonths(startOfMonth(today), -5), today);
  const freq = months.map((m) => ({
    label: formatMonth(m),
    value: (checkins.data ?? []).filter((c) => isoDateInGymTz(c.checked_in_at).startsWith(m.slice(0, 7))).length,
  }));
  const last = checkins.data?.[0];

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="size-16 text-lg">
              {photo.data?.signedUrl && <AvatarImage src={photo.data.signedUrl} alt={`Foto de ${s.full_name}`} />}
              <AvatarFallback className="text-lg">{initials(s.full_name)}</AvatarFallback>
            </Avatar>
            {can.edit && !s.anonymized_at && <PhotoUpload studentId={s.id} />}
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{s.full_name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>Matrícula {s.enrollment_code}</span>
              <StatusBadge map={STUDENT_STATUS} value={s.status} />
              {can.billing && (overdue.length ? <Badge tone="danger">Inadimplente</Badge> : <Badge tone="success">Em dia</Badge>)}
              {s.user_id && <Badge tone="brand">Acesso ao portal</Badge>}
            </div>
          </div>
        </div>
        <StudentMenu id={s.id} status={s.status} canEdit={can.edit} canDelete={can.del} anonymized={!!s.anonymized_at} />
      </div>

      <Tabs defaultValue="resumo">
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          {can.billing && (
            <TabsTrigger value="financeiro">
              <Wallet /> Financeiro
            </TabsTrigger>
          )}
          {workouts.data && (
            <TabsTrigger value="treinos">
              <Dumbbell /> Treinos
            </TabsTrigger>
          )}
          <TabsTrigger value="frequencia">
            <ScanLine /> Frequência
          </TabsTrigger>
          {can.health && (
            <TabsTrigger value="saude">
              <HeartPulse /> Saúde
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="resumo" className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Cadastro</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Info label="CPF" value={formatCpf(s.cpf)} />
                <Info label="Nascimento" value={s.birth_date ? `${formatDate(s.birth_date)} (${ageFrom(s.birth_date, today)} anos)` : null} />
                <Info label="Gênero" value={s.gender ? GENDER_LABELS[s.gender] : null} />
                <Info label="Telefone" value={formatPhone(s.phone)} />
                <Info label="E-mail" value={s.email} />
                <Info label="Endereço" value={s.address} />
                <Info label="Contato de emergência" value={s.emergency_contact_name && `${s.emergency_contact_name} · ${formatPhone(s.emergency_contact_phone)}`} />
                <Info label="Objetivo" value={s.objective} />
                <Info label="Entrada" value={formatDate(s.start_date)} />
                <Info label="Dia de vencimento" value={`Dia ${s.due_day}`} />
                <Info label="Consentimento LGPD" value={formatDateTime(s.lgpd_consent_at)} />
                <Info label="Avisos no portal" value={s.notifications_opt_in ? "Autorizado" : "Não autorizado"} />
              </dl>
              {s.notes && <p className="mt-4 rounded-md bg-muted/60 p-3 text-sm">{s.notes}</p>}
            </CardContent>
          </Card>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Plano atual</CardTitle>
                {can.edit && !active && !s.anonymized_at && (
                  <CardAction>
                    <NewMembershipDialog studentId={s.id} plans={(plans.data ?? []).map((p) => ({ ...p, price: Number(p.price) }))} />
                  </CardAction>
                )}
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {active ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{active.plans?.name}</span>
                      <StatusBadge map={MEMBERSHIP_STATUS} value={active.status} />
                    </div>
                    <dl className="grid grid-cols-2 gap-3">
                      <Info label="Periodicidade" value={active.plans ? PERIODICITY_LABELS[active.plans.periodicity] : null} />
                      <Info label="Valor por ciclo" value={formatCurrency(Number(active.price) - Number(active.discount))} />
                      <Info label="Início" value={formatDate(active.start_date)} />
                      <Info label="Término" value={active.end_date ? formatDate(active.end_date) : "Renovação automática"} />
                    </dl>
                    {can.edit && <CancelMembershipDialog membershipId={active.id} />}
                  </>
                ) : (
                  <p className="text-muted-foreground">Nenhuma matrícula ativa.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Portal do aluno</CardTitle>
                <CardDescription>{s.user_id ? "O aluno já possui acesso." : "Permite ao aluno consultar treinos e mensalidades."}</CardDescription>
              </CardHeader>
              {!s.user_id && can.edit && !s.anonymized_at && (
                <CardContent>
                  <AccessDialog studentId={s.id} email={s.email} />
                </CardContent>
              )}
            </Card>
            {(memberships.data?.length ?? 0) > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de matrículas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {memberships.data!.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-2">
                      <span>
                        {m.plans?.name} <span className="text-muted-foreground">· {formatDate(m.start_date)}</span>
                      </span>
                      <StatusBadge map={MEMBERSHIP_STATUS} value={m.status} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {can.billing && (
          <TabsContent value="financeiro" className="space-y-4">
            <Card className="pb-0">
              <CardHeader>
                <CardTitle>Mensalidades</CardTitle>
                <CardDescription>
                  {pendingInvoices.length} em aberto · {overdue.length} em atraso ({formatCurrency(overdue.reduce((a, i) => a + invoiceTotal(i), 0))})
                </CardDescription>
                <CardAction className="flex gap-2">
                  {can.renegotiate && (
                    <RenegotiateDialog
                      invoices={pendingInvoices.map((i) => ({ id: i.id, label: `${i.description} · ${formatDate(i.due_date)}`, total: invoiceTotal(i) }))}
                    />
                  )}
                  <NewInvoiceButton students={[]} studentId={s.id} />
                </CardAction>
              </CardHeader>
              <CardContent className="px-0">
                {!invoices.data?.length ? (
                  <div className="px-5 pb-5">
                    <EmptyState icon={Wallet} title="Sem cobranças" description="As mensalidades aparecem aqui após a matrícula." />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.data.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell className="max-w-64 truncate">{i.description}</TableCell>
                          <TableCell>{formatDate(i.due_date)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatCurrency(invoiceTotal(i))}</TableCell>
                          <TableCell>
                            <StatusBadge map={INVOICE_STATUS} value={displayStatus(i, today)} />
                          </TableCell>
                          <TableCell>
                            <InvoiceActions
                              invoice={{
                                id: i.id,
                                description: i.description,
                                due_date: i.due_date,
                                amount: Number(i.amount),
                                discount: Number(i.discount),
                                fine: Number(i.fine),
                                interest: Number(i.interest),
                                paid: i.payments.filter((p) => !p.reversed_at).reduce((a, p) => a + Number(p.amount), 0),
                                studentName: s.full_name,
                              }}
                              status={i.status}
                              payments={i.payments}
                              finePercent={Number(gym.data?.late_fee_percent ?? 2)}
                              interestPercent={Number(gym.data?.monthly_interest_percent ?? 1)}
                              canReverse={can.reverse}
                            />
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
                <CardTitle>Histórico de pagamentos</CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                {!payments.length ? (
                  <p className="px-5 pb-5 text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recibo</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Referente a</TableHead>
                        <TableHead>Forma</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow key={p.id} className={p.reversed_at ? "text-muted-foreground line-through" : undefined}>
                          <TableCell>
                            <Link href={`/mensalidades/recibo/${p.id}`} className="hover:text-primary" target="_blank">
                              nº {p.receipt_number}
                            </Link>
                          </TableCell>
                          <TableCell>{formatDateTime(p.paid_at)}</TableCell>
                          <TableCell className="max-w-56 truncate">{p.description}</TableCell>
                          <TableCell>{PAYMENT_METHOD_LABELS[p.method]}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatCurrency(Number(p.amount))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {workouts.data && (
          <TabsContent value="treinos">
            <Card>
              <CardHeader>
                <CardTitle>Fichas de treino</CardTitle>
                {can.workouts && (
                  <CardAction>
                    <Button size="sm" asChild>
                      <Link href={`/treinos/nova?aluno=${s.id}`}>Nova ficha</Link>
                    </Button>
                  </CardAction>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {!workouts.data.length ? (
                  <EmptyState icon={Dumbbell} title="Nenhuma ficha" description="Crie uma ficha de treino para este aluno." />
                ) : (
                  workouts.data.map((w) => (
                    <Link key={w.id} href={`/treinos/${w.id}`} className="flex items-center justify-between rounded-md border px-4 py-3 text-sm hover:bg-muted">
                      <span>
                        <span className="font-medium">{w.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          Divisões {w.workout_divisions.map((d) => d.label).join(", ")} · desde {formatDate(w.start_date)}
                        </span>
                      </span>
                      {w.active ? <Badge tone="success">Ativa</Badge> : <Badge>Encerrada</Badge>}
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="frequencia" className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Check-ins por mês</CardTitle>
              <CardDescription>Últimos 6 meses · último acesso {last ? formatDateTime(last.checked_in_at) : "nunca"}</CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleBars data={freq} name="Check-ins" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Últimos acessos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(checkins.data ?? []).slice(0, 10).map((c) => (
                <div key={c.id} className="flex justify-between">
                  <span>{formatDateTime(c.checked_in_at)}</span>
                  <span className="text-muted-foreground">{CHECKIN_METHOD_LABELS[c.method]}</span>
                </div>
              ))}
              {!checkins.data?.length && <p className="text-muted-foreground">Sem registros nos últimos 6 meses.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {can.health && (
          <TabsContent value="saude">
            <Card>
              <CardHeader>
                <CardTitle>Informações de saúde</CardTitle>
                <CardDescription>Dado pessoal sensível — visível apenas para professores e gestão. Alterações são auditadas sem registrar o conteúdo.</CardDescription>
              </CardHeader>
              <CardContent>
                <HealthForm
                  studentId={s.id}
                  hasConsent={!!s.health_consent_at}
                  initial={{
                    medical_conditions: health.data?.medical_conditions ?? "",
                    medications: health.data?.medications ?? "",
                    injuries: health.data?.injuries ?? "",
                    restrictions: health.data?.restrictions ?? "",
                    physician_clearance: health.data?.physician_clearance ?? false,
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}
