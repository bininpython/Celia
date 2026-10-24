"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type DefaultValues, type FieldValues, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

type Result<R> = { ok: true; data: R; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Formulário com React Hook Form + Zod no cliente e Server Action que
 * revalida no servidor. Mostra toasts e erros de campo vindos do servidor.
 */
export function useActionForm<S extends z.ZodType<FieldValues, FieldValues>, R>(opts: {
  schema: S;
  defaultValues: DefaultValues<z.input<S>>;
  action: (values: z.input<S>) => Promise<Result<R>>;
  successMessage?: string;
  onSuccess?: (data: R) => void;
  refresh?: boolean;
  /** Não exibe o toast padrão de sucesso (o chamador exibe o seu). */
  silentSuccess?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<z.input<S>, unknown, z.output<S>>({
    resolver: zodResolver(opts.schema as never),
    defaultValues: opts.defaultValues,
  });

  const submit = form.handleSubmit((_parsed, event) => {
    event?.preventDefault();
    const raw = form.getValues();
    startTransition(async () => {
      const res = await opts.action(raw);
      if (!res.ok) {
        toast.error(res.error);
        Object.entries(res.fieldErrors ?? {}).forEach(([field, msgs]) =>
          form.setError(field as Path<z.input<S>>, { message: msgs[0] }),
        );
        return;
      }
      if (!opts.silentSuccess) toast.success(res.message ?? opts.successMessage ?? "Salvo com sucesso.");
      if (opts.refresh !== false) router.refresh();
      opts.onSuccess?.(res.data);
    });
  });

  const errorOf = (name: string): string | undefined => {
    const parts = name.split(".");
    let cur: unknown = form.formState.errors;
    for (const p of parts) cur = (cur as Record<string, unknown> | undefined)?.[p];
    return (cur as { message?: string } | undefined)?.message;
  };

  return { form, submit, pending, errorOf };
}
