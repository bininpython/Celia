import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { readPeriod } from "@/lib/period";
import { isReportKey, REPORTS } from "@/lib/reports/definitions";
import { toCsv, toPdf, toXlsx } from "@/lib/reports/render";
import { createClient } from "@/lib/supabase/server";

const TYPES = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv; charset=utf-8",
} as const;

export async function GET(request: NextRequest, ctx: RouteContext<"/api/relatorios/[tipo]">) {
  const { tipo } = await ctx.params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isReportKey(tipo)) return NextResponse.json({ error: "Relatório inexistente" }, { status: 404 });
  const def = REPORTS[tipo];
  if (!canAccess(user.role, def.module)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const sp = Object.fromEntries(request.nextUrl.searchParams);
  const format = (sp.formato ?? "pdf") as keyof typeof TYPES;
  if (!(format in TYPES)) return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  const { from, to } = readPeriod(sp);

  const supabase = await createClient();
  try {
    const report = await def.build({ supabase, from, to });
    const body = format === "csv" ? toCsv(report) : format === "xlsx" ? await toXlsx(report, user.gymName) : toPdf(report, user.gymName);
    await supabase.from("report_exports").insert({ report_type: tipo, format, params: def.usesPeriod ? { from, to } : {} });
    const filename = `${tipo}-${def.usesPeriod ? `${from}_${to}` : new Date().toISOString().slice(0, 10)}.${format}`;
    return new NextResponse(new Uint8Array(typeof body === "string" ? Buffer.from(body, "utf8") : body), {
      headers: {
        "Content-Type": TYPES[format],
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[relatorio]", e);
    return NextResponse.json({ error: "Falha ao gerar o relatório" }, { status: 500 });
  }
}
