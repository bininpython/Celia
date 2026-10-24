"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, CameraOff, CheckCircle2, Hash, Loader2, QrCode, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { checkinByCode, checkinByToken, checkinStudent } from "./actions";

type Result = { ok: true; data: { name: string; overdue: number }; message?: string } | { ok: false; error: string };

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
  }
}

export function CheckinPanel({ students }: { students: { id: string; full_name: string; enrollment_code: string }[] }) {
  const [pending, start] = useTransition();
  const [last, setLast] = useState<{ name: string; overdue: number } | null>(null);
  const [studentId, setStudentId] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const router = useRouter();

  const run = (fn: () => Promise<Result>, reset?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setLast(r.data);
      toast.success(r.message);
      if (r.data.overdue) toast.warning(`${r.data.name} possui ${r.data.overdue} mensalidade(s) em atraso.`);
      reset?.();
      router.refresh();
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar entrada</CardTitle>
        <CardDescription>Por nome, número de matrícula ou QR Code do portal do aluno.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="nome">
          <TabsList className="w-full">
            <TabsTrigger value="nome">
              <UserRound /> Aluno
            </TabsTrigger>
            <TabsTrigger value="matricula">
              <Hash /> Matrícula
            </TabsTrigger>
            <TabsTrigger value="qr">
              <QrCode /> QR Code
            </TabsTrigger>
          </TabsList>
          <TabsContent value="nome">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (studentId) run(() => checkinStudent({ student_id: studentId }), () => setStudentId(""));
              }}
            >
              <NativeSelect aria-label="Aluno" value={studentId} onChange={(e) => setStudentId(e.target.value)} className="flex-1">
                <option value="">Selecione o aluno…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} · {s.enrollment_code}
                  </option>
                ))}
              </NativeSelect>
              <Button type="submit" disabled={pending || !studentId}>
                {pending ? <Loader2 className="animate-spin" /> : "Registrar"}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="matricula">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (code) run(() => checkinByCode({ code }), () => setCode(""));
              }}
            >
              <Input aria-label="Número de matrícula" placeholder="Ex.: CB00012" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />
              <Button type="submit" disabled={pending || !code}>
                {pending ? <Loader2 className="animate-spin" /> : "Registrar"}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="qr" className="space-y-3">
            <QrScanner disabled={pending} onScan={(t) => run(() => checkinByToken({ token: t }))} />
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (token) run(() => checkinByToken({ token }), () => setToken(""));
              }}
            >
              <Input
                aria-label="Código do QR (leitor USB)"
                placeholder="Leitor USB: posicione o cursor aqui e leia o QR"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoComplete="off"
              />
              <Button type="submit" disabled={pending || !token}>
                Validar
              </Button>
            </form>
          </TabsContent>
        </Tabs>
        {last && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 className="size-4" /> Último registro: <strong>{last.name}</strong>
            {last.overdue > 0 && <span className="ml-auto text-destructive">{last.overdue} mensalidade(s) em atraso</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QrScanner({ onScan, disabled }: { onScan: (token: string) => void; disabled: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(true);
  const lastScan = useRef<{ value: string; at: number }>({ value: "", at: 0 });

  useEffect(() => {
    setSupported(typeof window !== "undefined" && !!window.BarcodeDetector && !!navigator.mediaDevices?.getUserMedia);
  }, []);

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const detector = new window.BarcodeDetector!({ formats: ["qr_code"] });
        timer = setInterval(async () => {
          if (!video.current) return;
          const codes = await detector.detect(video.current).catch(() => []);
          const value = codes[0]?.rawValue;
          const now = Date.now();
          if (value && (value !== lastScan.current.value || now - lastScan.current.at > 5000)) {
            lastScan.current = { value, at: now };
            onScan(value);
          }
        }, 500);
      } catch {
        toast.error("Não foi possível acessar a câmera. Verifique a permissão do navegador.");
        setActive(false);
      }
    })();
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [active, onScan]);

  if (!supported)
    return <p className="text-xs text-muted-foreground">Leitura pela câmera indisponível neste navegador. Use um leitor USB no campo abaixo.</p>;
  return (
    <div className="space-y-2">
      {active && <video ref={video} className="aspect-video w-full rounded-lg bg-black object-cover" muted playsInline />}
      <Button type="button" variant="outline" onClick={() => setActive((a) => !a)} disabled={disabled}>
        {active ? (
          <>
            <CameraOff /> Desligar câmera
          </>
        ) : (
          <>
            <Camera /> Ler QR pela câmera
          </>
        )}
      </Button>
    </div>
  );
}
