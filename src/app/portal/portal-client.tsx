"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LogDialog } from "@/components/training/log-dialog";
import { getCheckinToken, logMyWorkout, readMyNotifications, toggleClass } from "./actions";

/** QR Code de check-in assinado e renovado automaticamente. */
export function CheckinQr() {
  const [src, setSrc] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const expires = useRef(0);
  const loading = useRef(false);

  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      const r = await getCheckinToken({});
      if (!r.ok) return setError(r.error);
      setError(null);
      expires.current = r.data.expiresAt;
      setSrc(await QRCode.toDataURL(r.data.token, { margin: 1, width: 240, color: { dark: "#1f2328", light: "#ffffff" } }));
    } finally {
      loading.current = false;
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const timer = setInterval(() => {
      const remaining = expires.current - Date.now();
      setLeft(Math.max(0, Math.round(remaining / 1000)));
      if (expires.current && remaining < 10_000) void load();
    }, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  return (
    <div className="flex flex-col items-center gap-2">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="QR Code de check-in" className="size-52 rounded-lg border bg-white p-2" />
      ) : (
        <div className="flex size-52 items-center justify-center rounded-lg border">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      )}
      <p className="text-xs text-muted-foreground">Válido por {left}s · renovação automática</p>
      <Button size="sm" variant="ghost" onClick={() => void load()}>
        <RefreshCw /> Gerar novo
      </Button>
    </div>
  );
}

export function MyLogButton({ item }: { item: { id: string; name: string; sets: number; reps: string; load_kg: number | null } }) {
  return <LogDialog item={item} action={logMyWorkout} />;
}

export function ClassToggle({ eventId, joined, full }: { eventId: string; joined: boolean; full: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant={joined ? "outline" : "default"}
      disabled={pending || (!joined && full)}
      onClick={() =>
        start(async () => {
          const r = await toggleClass({ event_id: eventId, join: !joined });
          if (!r.ok) return void toast.error(r.error);
          toast.success(r.message);
          router.refresh();
        })
      }
    >
      {joined ? "Cancelar inscrição" : full ? "Lotada" : "Inscrever-se"}
    </Button>
  );
}

export function ReadNoticesButton() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await readMyNotifications({});
          router.refresh();
        })
      }
    >
      Marcar como lidos
    </Button>
  );
}
