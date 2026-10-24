import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Receipt } from "@/components/billing/receipt";
import { requireModule } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Recibo" };

export default async function MyReceiptPage({ params }: PageProps<"/portal/mensalidades/recibo/[id]">) {
  await requireModule("portal");
  const { id } = await params;
  const supabase = await createClient();
  // RLS garante que o aluno só acesse os próprios pagamentos
  const { data: p } = await supabase
    .from("payments")
    .select("*, invoices(description, due_date, reference_month), students(full_name, cpf, enrollment_code)")
    .eq("id", id)
    .maybeSingle();
  if (!p) notFound();
  const { data: gym } = await supabase.from("gyms").select("name, legal_name, cnpj, address, city, state, phone").single();
  return <Receipt p={p} gym={gym} />;
}
