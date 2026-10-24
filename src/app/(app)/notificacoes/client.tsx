"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateAlerts, markRead } from "./actions";

export function NotificationActions() {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message);
      router.refresh();
    });
  return (
    <>
      <Button variant="outline" disabled={pending} onClick={() => run(() => markRead({}))}>
        <CheckCheck /> Marcar todas como lidas
      </Button>
      <Button disabled={pending} onClick={() => run(() => generateAlerts({}))}>
        <BellRing /> Verificar alertas agora
      </Button>
    </>
  );
}

export function MarkReadButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await markRead({ id });
          if (!r.ok) toast.error(r.error);
          router.refresh();
        })
      }
    >
      Marcar como lida
    </Button>
  );
}
