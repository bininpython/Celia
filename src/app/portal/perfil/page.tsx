import type { Metadata } from "next";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireModule } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatCpf } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Meus dados" };

export default async function MyProfilePage() {
  const user = await requireModule("portal");
  const supabase = await createClient();
  const { data: s } = await supabase.from("students").select("*").eq("id", user.studentId!).single();
  if (!s) return null;
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Meus dados</h1>
      <Card>
        <CardHeader>
          <CardTitle>Cadastro</CardTitle>
          <CardDescription>Para alterar nome, CPF ou data de nascimento, procure a recepção.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Nome</dt>
              <dd>{s.full_name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">CPF</dt>
              <dd>{formatCpf(s.cpf)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Nascimento</dt>
              <dd>{formatDate(s.birth_date)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Matrícula</dt>
              <dd>{s.enrollment_code}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Entrada</dt>
              <dd>{formatDate(s.start_date)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Dia de vencimento</dt>
              <dd>{s.due_day}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Contato e preferências</CardTitle>
        </CardHeader>
        <CardContent>
          <ContactForm
            initial={{
              phone: s.phone ?? "",
              email: s.email ?? "",
              address: s.address ?? "",
              emergency_contact_name: s.emergency_contact_name ?? "",
              emergency_contact_phone: s.emergency_contact_phone ?? "",
              notifications_opt_in: s.notifications_opt_in,
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Privacidade (LGPD)</CardTitle>
          <CardDescription>
            Consentimento registrado em {formatDateTime(s.lgpd_consent_at)}. Você pode solicitar acesso, correção, portabilidade ou eliminação dos seus dados à
            academia. Registros financeiros são mantidos pelo prazo legal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <a href="/api/portal/meus-dados">
              <Download /> Baixar meus dados (JSON)
            </a>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
