"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LogoSymbol } from "@/components/brand/logo";
import { FormField } from "@/components/shared/form-field";
import { useActionForm } from "@/components/shared/use-action-form";
import { gymSettingsSchema, type GymSettingsInput } from "@/lib/validators/admin";
import { saveBrandColor, saveGymSettings, uploadLogo } from "./actions";

export function SettingsForm({ initial }: { initial: GymSettingsInput }) {
  const { form, submit, pending, errorOf } = useActionForm({ schema: gymSettingsSchema, defaultValues: initial, action: saveGymSettings });
  const r = form.register;
  const f = (name: keyof GymSettingsInput, label: string, props: React.ComponentProps<"input"> = {}, hint?: string) => (
    <FormField label={label} htmlFor={name} error={errorOf(name)} hint={hint}>
      <Input id={name} {...props} {...r(name)} />
    </FormField>
  );
  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Dados da academia</CardTitle>
          <CardDescription>Usados em recibos, relatórios e no portal do aluno.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {f("name", "Nome fantasia")}
          {f("legal_name", "Razão social")}
          {f("cnpj", "CNPJ")}
          {f("email", "E-mail", { type: "email" })}
          {f("phone", "Telefone")}
          {f("whatsapp", "WhatsApp")}
          {f("address", "Endereço")}
          {f("city", "Cidade")}
          <div className="grid grid-cols-2 gap-3">
            {f("state", "UF", { maxLength: 2 })}
            {f("zip_code", "CEP")}
          </div>
          <FormField label="Horários de funcionamento" htmlFor="opening_hours_text" error={errorOf("opening_hours_text")} hint="Uma linha por dia, ex.: seg: 06:00-22:00" className="sm:col-span-2 lg:col-span-3">
            <Textarea id="opening_hours_text" rows={4} {...r("opening_hours_text")} />
          </FormField>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Cobrança e alertas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {f("default_due_day", "Vencimento padrão (dia)", { type: "number", min: 1, max: 28 })}
          {f("late_fee_percent", "Multa por atraso (%)", { type: "number", step: "0.01", min: 0 }, "Limite usual: 2%")}
          {f("monthly_interest_percent", "Juros ao mês (%)", { type: "number", step: "0.01", min: 0 }, "Pro rata die")}
          {f("due_alert_days", "Avisar vencimento com (dias)", { type: "number", min: 0, max: 30 })}
          {f("absence_alert_days", "Alertar ausência após (dias)", { type: "number", min: 1, max: 90 })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Financeiro e dados</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {f("opening_balance", "Saldo inicial de caixa (R$)", { type: "number", step: "0.01" })}
          {f("opening_balance_date", "Data do saldo inicial", { type: "date" })}
          {f("data_retention_months", "Retenção de dados (meses)", { type: "number", min: 12 }, "Prazo de guarda após o desligamento (LGPD)")}
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} Salvar configurações
        </Button>
      </div>
    </form>
  );
}

export function BrandSettings({ color, logoUrl }: { color: string; logoUrl: string | null }) {
  const [value, setValue] = useState(color);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const done = (r: { ok: boolean; error?: string; message?: string }) => {
    if (!r.ok) return void toast.error(r.error);
    toast.success(r.message);
    router.refresh();
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Identidade visual</CardTitle>
        <CardDescription>Cor principal da marca: #FF651C (laranja oficial). Alterações afetam botões e destaques.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <Label htmlFor="brand_color">Cor principal</Label>
          <div className="flex items-center gap-2">
            <input id="brand_color" type="color" value={value} onChange={(e) => setValue(e.target.value)} className="h-9 w-12 cursor-pointer rounded border" />
            <Input value={value} onChange={(e) => setValue(e.target.value)} className="w-32 font-mono" aria-label="Código da cor" />
            <Button variant="outline" disabled={pending} onClick={() => start(async () => done(await saveBrandColor({ color: value })))}>
              Aplicar
            </Button>
            <Button variant="ghost" disabled={pending} onClick={() => start(async () => done(await saveBrandColor({ color: "#FF651C" })))}>
              Restaurar
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          <Label>Logo para documentos</Label>
          <div className="flex items-center gap-4">
            <span className="flex size-16 items-center justify-center overflow-hidden rounded-lg bg-primary text-white">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo atual" className="size-full object-contain" />
              ) : (
                <LogoSymbol className="size-10" />
              )}
            </span>
            <input
              ref={ref}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="sr-only"
              aria-label="Enviar logo"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const fd = new FormData();
                fd.set("logo", file);
                start(async () => done(await uploadLogo(fd)));
                e.target.value = "";
              }}
            />
            <Button variant="outline" disabled={pending} onClick={() => ref.current?.click()}>
              {pending ? <Loader2 className="animate-spin" /> : <Upload />} Enviar logo
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Sem logo enviada, o sistema usa o símbolo vetorial da marca.</p>
        </div>
      </CardContent>
    </Card>
  );
}
