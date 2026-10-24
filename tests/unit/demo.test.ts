import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("modo demonstração", async () => {
  const { buildDemoData } = await import("@/lib/demo/data");
  const { createDemoClient, DEMO_WRITE_MESSAGE } = await import("@/lib/demo/client");
  const db = buildDemoData("2026-10-24");

  it("gera dados coerentes e determinísticos", () => {
    expect(buildDemoData("2026-10-24").students!.length).toBe(db.students!.length);
    expect(db.students!.length).toBe(36);
    // toda mensalidade paga tem pagamento e lançamento correspondente
    const paid = db.invoices!.filter((i) => i.status === "pago");
    expect(paid.length).toBe(db.payments!.length);
    expect(db.transactions!.filter((t) => t.payment_id).length).toBe(db.payments!.length);
  });

  it("simula um negócio saudável (receita supera despesas no ano)", () => {
    const sum = (type: string) =>
      db.transactions!.filter((t) => t.type === type && t.status === "pago" && t.category_id !== db.financial_categories!.at(-1)!.id)
        .reduce((a, t) => a + Number(t.amount), 0);
    expect(sum("receita")).toBeGreaterThan(sum("despesa"));
  });

  it("consulta com relacionamentos, filtros, contagem e ordenação", async () => {
    const client = createDemoClient("admin");
    const { data, count } = await client
      .from("invoices")
      .select("*, students!inner(id, full_name), payments(id, amount)", { count: "exact" })
      .eq("status", "pago")
      .order("due_date", { ascending: false })
      .range(0, 4);
    const rows = data as { students: { full_name: string }; payments: unknown[]; due_date: string }[];
    expect(rows).toHaveLength(5);
    expect(count).toBeGreaterThan(5);
    expect(rows[0]!.students.full_name).toBeTruthy();
    expect(rows[0]!.payments.length).toBe(1);
    expect(rows[0]!.due_date >= rows[4]!.due_date).toBe(true);
  });

  it("aplica a visibilidade do perfil (aluno só vê os próprios dados)", async () => {
    const aluno = createDemoClient("aluno");
    const { data: students } = await aluno.from("students").select("id");
    expect((students as unknown[]).length).toBe(1);
    const { data: tx } = await aluno.from("transactions").select("*");
    expect(tx).toEqual([]);
    const recepcao = createDemoClient("recepcionista");
    const { data: health } = await recepcao.from("student_health").select("*");
    expect(health).toEqual([]);
  });

  it("bloqueia gravações", async () => {
    const client = createDemoClient("admin");
    const { error } = await client.from("students").insert().select("id").single();
    expect((error as { message: string }).message).toBe(DEMO_WRITE_MESSAGE);
    const rpc = await client.rpc("generate_invoices", { p_month: "2026-10-01" });
    expect(rpc.error?.message).toBe(DEMO_WRITE_MESSAGE);
  });

  it("funções agregadas retornam valores", async () => {
    const client = createDemoClient("admin");
    const { data } = await client.rpc("student_counts");
    expect((data as { ativos: number }[])[0]!.ativos).toBe(30);
    const monthly = await client.rpc("fin_monthly", { p_from: "2026-01-01", p_to: "2026-10-31" });
    expect((monthly.data as unknown[]).length).toBe(10);
  });
});
