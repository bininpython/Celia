import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { requireModule } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BrandSettings, SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  await requireModule("configuracoes");
  const supabase = await createClient();
  const { data: g } = await supabase.from("gyms").select("*").single();
  if (!g) throw new Error("Academia não encontrada.");
  const logoUrl = g.logo_path ? supabase.storage.from("gym-assets").getPublicUrl(g.logo_path).data.publicUrl : null;
  const hours = Object.entries((g.opening_hours ?? {}) as Record<string, string>)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  const links = [
    { href: "/planos", label: "Planos e valores" },
    { href: "/financeiro/categorias", label: "Categorias financeiras" },
    { href: "/funcionarios", label: "Equipe e permissões" },
    { href: "/exercicios", label: "Biblioteca de exercícios" },
  ];
  return (
    <>
      <PageHeader title="Configurações" description="Dados da academia, regras de cobrança, identidade visual e atalhos de cadastro." />
      <Card>
        <CardHeader>
          <CardTitle>Cadastros relacionados</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted">
              {l.label} <ArrowRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </CardContent>
      </Card>
      <BrandSettings color={g.primary_color} logoUrl={logoUrl} />
      <SettingsForm
        initial={{
          name: g.name,
          legal_name: g.legal_name ?? "",
          cnpj: g.cnpj ?? "",
          email: g.email ?? "",
          phone: g.phone ?? "",
          whatsapp: g.whatsapp ?? "",
          address: g.address ?? "",
          city: g.city ?? "",
          state: g.state ?? "",
          zip_code: g.zip_code ?? "",
          default_due_day: g.default_due_day,
          late_fee_percent: Number(g.late_fee_percent),
          monthly_interest_percent: Number(g.monthly_interest_percent),
          due_alert_days: g.due_alert_days,
          absence_alert_days: g.absence_alert_days,
          opening_balance: Number(g.opening_balance),
          opening_balance_date: g.opening_balance_date,
          data_retention_months: g.data_retention_months,
          opening_hours_text: hours,
        }}
      />
    </>
  );
}
