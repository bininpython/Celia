"use client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { useActionForm } from "@/components/shared/use-action-form";
import { contactSchema, type ContactInput } from "@/lib/validators/admin";
import { updateMyContact } from "../actions";

export function ContactForm({ initial }: { initial: ContactInput }) {
  const { form, submit, pending, errorOf } = useActionForm({ schema: contactSchema, defaultValues: initial, action: updateMyContact });
  const r = form.register;
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Telefone" htmlFor="c_phone" error={errorOf("phone")}>
          <Input id="c_phone" type="tel" {...r("phone")} />
        </FormField>
        <FormField label="E-mail de contato" htmlFor="c_email" error={errorOf("email")}>
          <Input id="c_email" type="email" {...r("email")} />
        </FormField>
        <FormField label="Endereço" htmlFor="c_addr" error={errorOf("address")} className="sm:col-span-2">
          <Input id="c_addr" {...r("address")} />
        </FormField>
        <FormField label="Contato de emergência" htmlFor="c_en" error={errorOf("emergency_contact_name")}>
          <Input id="c_en" {...r("emergency_contact_name")} />
        </FormField>
        <FormField label="Telefone de emergência" htmlFor="c_ep" error={errorOf("emergency_contact_phone")}>
          <Input id="c_ep" type="tel" {...r("emergency_contact_phone")} />
        </FormField>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-0.5 size-4 accent-[var(--primary)]" {...r("notifications_opt_in")} />
        Autorizo receber avisos de vencimento e comunicados neste portal. Posso revogar a qualquer momento.
      </label>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} Salvar
        </Button>
      </div>
    </form>
  );
}
