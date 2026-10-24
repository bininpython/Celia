import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireModule } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { MarkReadButton, NotificationActions } from "./client";

export const metadata: Metadata = { title: "Notificações" };

const KINDS: Record<string, { label: string; tone: "danger" | "warning" | "info" | "neutral" }> = {
  atraso: { label: "Atraso", tone: "danger" },
  vencimento: { label: "Vencimento", tone: "warning" },
  ausencia: { label: "Ausência", tone: "info" },
};

export default async function NotificationsPage() {
  await requireModule("notificacoes");
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("*").eq("audience", "staff").order("created_at", { ascending: false }).limit(200);
  return (
    <>
      <PageHeader
        title="Notificações"
        description="Alertas internos de vencimentos, atrasos e ausências. Avisos a alunos só aparecem no portal de quem autorizou."
        actions={<NotificationActions />}
      />
      <Card className="py-0">
        <CardContent className="divide-y px-0">
          {!data?.length && (
            <div className="p-6">
              <EmptyState icon={Bell} title="Nenhuma notificação" description="Use “Verificar alertas agora” ou agende a verificação diária (ver documentação)." />
            </div>
          )}
          {data?.map((n) => (
            <div key={n.id} className={cn("flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center", !n.read_at && "bg-accent/40")}>
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {!n.read_at && <span className="size-2 rounded-full bg-primary" aria-label="Não lida" />}
                  {n.title}
                  <Badge tone={KINDS[n.kind]?.tone ?? "neutral"}>{KINDS[n.kind]?.label ?? n.kind}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {n.link ? (
                    <Link href={n.link} className="hover:text-primary">
                      {n.body}
                    </Link>
                  ) : (
                    n.body
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {formatDateTime(n.created_at)}
                {!n.read_at && <MarkReadButton id={n.id} />}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
