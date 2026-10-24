import "server-only";
import { addDays, addMonths, isoDateInGymTz, localDateTimeToISO, startOfMonth, todayISO } from "@/lib/dates";
import type { Tables } from "@/types/database";

/**
 * Dados FICTÍCIOS para o modo demonstração. Gerados de forma determinística
 * (mesma semente) e relativos à data atual, para que os indicadores façam sentido.
 */

export const DEMO_GYM_ID = "00000000-0000-4000-8000-000000000001";
const id = (prefix: number, n: number) => `d${String(prefix).padStart(7, "0")}-0000-4000-8000-${String(n).padStart(12, "0")}`;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Row = Record<string, unknown>;
export type DemoDB = Record<string, Row[]> & { __today: string };

const NAMES = [
  "Ana Paula Ribeiro", "Bruno Carvalho", "Camila Nogueira", "Daniel Martins", "Eduarda Lima", "Felipe Araújo",
  "Gabriela Rocha", "Henrique Souza", "Isabela Moreira", "João Pedro Alves", "Karina Duarte", "Lucas Ferreira",
  "Mariana Costa", "Natália Pires", "Otávio Mendes", "Patrícia Gomes", "Rafaela Teixeira", "Rodrigo Barbosa",
  "Sabrina Freitas", "Thiago Monteiro", "Vanessa Cardoso", "Wesley Ramos", "Yasmin Batista", "Aline Fernandes",
  "Beatriz Correia", "Carlos Eduardo Dias", "Débora Azevedo", "Elisa Campos", "Fernanda Vieira", "Gustavo Pinto",
  "Helena Castro", "Igor Machado", "Juliana Prado", "Larissa Melo", "Marcelo Nunes", "Priscila Andrade",
];

const EXERCISES: [string, string, string][] = [
  ["Supino reto com barra", "peito", "barra"], ["Supino inclinado com halteres", "peito", "halteres"],
  ["Crucifixo na máquina", "peito", "maquina"], ["Crossover na polia", "peito", "polia"], ["Flexão de braços", "peito", "peso_corporal"],
  ["Puxada frontal", "costas", "polia"], ["Remada curvada com barra", "costas", "barra"], ["Remada baixa", "costas", "polia"],
  ["Remada unilateral com halter", "costas", "halteres"], ["Barra fixa", "costas", "peso_corporal"],
  ["Desenvolvimento com halteres", "ombros", "halteres"], ["Elevação lateral", "ombros", "halteres"], ["Elevação frontal", "ombros", "halteres"],
  ["Crucifixo invertido", "ombros", "maquina"], ["Rosca direta", "biceps", "barra"], ["Rosca alternada", "biceps", "halteres"],
  ["Rosca martelo", "biceps", "halteres"], ["Tríceps na polia", "triceps", "polia"], ["Tríceps francês", "triceps", "halteres"],
  ["Mergulho no banco", "triceps", "banco"], ["Agachamento livre", "quadriceps", "barra"], ["Leg press 45°", "quadriceps", "maquina"],
  ["Cadeira extensora", "quadriceps", "maquina"], ["Afundo com halteres", "quadriceps", "halteres"], ["Mesa flexora", "posteriores", "maquina"],
  ["Stiff com barra", "posteriores", "barra"], ["Cadeira flexora", "posteriores", "maquina"], ["Elevação pélvica", "gluteos", "barra"],
  ["Cadeira abdutora", "gluteos", "maquina"], ["Glúteo na polia", "gluteos", "polia"], ["Panturrilha em pé", "panturrilhas", "maquina"],
  ["Panturrilha sentado", "panturrilhas", "maquina"], ["Abdominal supra", "abdomen", "peso_corporal"], ["Prancha isométrica", "abdomen", "peso_corporal"],
  ["Abdominal na polia", "abdomen", "polia"], ["Kettlebell swing", "corpo_inteiro", "kettlebell"], ["Burpee", "corpo_inteiro", "peso_corporal"],
  ["Esteira", "cardio", "esteira"], ["Bicicleta ergométrica", "cardio", "bicicleta"], ["Mobilidade de quadril", "mobilidade", "peso_corporal"],
];

const CATEGORIES: [string, "receita" | "despesa", "fixa" | "variavel", string, boolean, string][] = [
  ["Mensalidades", "receita", "fixa", "receita_operacional", true, "#FF651C"],
  ["Avaliações e serviços", "receita", "variavel", "receita_operacional", false, "#F59E0B"],
  ["Venda de produtos", "receita", "variavel", "outras_receitas", false, "#10B981"],
  ["Outras receitas", "receita", "variavel", "outras_receitas", false, "#6366F1"],
  ["Aluguel", "despesa", "fixa", "despesa_fixa", false, "#334155"],
  ["Salários e encargos", "despesa", "fixa", "despesa_fixa", false, "#475569"],
  ["Energia elétrica", "despesa", "variavel", "custo_variavel", false, "#EAB308"],
  ["Água", "despesa", "variavel", "custo_variavel", false, "#0EA5E9"],
  ["Internet e telefone", "despesa", "fixa", "despesa_fixa", false, "#64748B"],
  ["Manutenção de equipamentos", "despesa", "variavel", "custo_variavel", false, "#A855F7"],
  ["Limpeza e materiais", "despesa", "variavel", "custo_variavel", false, "#14B8A6"],
  ["Marketing e publicidade", "despesa", "variavel", "custo_variavel", false, "#EC4899"],
  ["Sistemas e softwares", "despesa", "fixa", "despesa_fixa", false, "#8B5CF6"],
  ["Contabilidade", "despesa", "fixa", "despesa_fixa", false, "#78716C"],
  ["Taxas bancárias e de cartão", "despesa", "variavel", "custo_variavel", false, "#F97316"],
  ["Impostos", "despesa", "variavel", "impostos", true, "#DC2626"],
  ["Investimentos", "despesa", "variavel", "investimento", true, "#0F766E"],
];

const ts = (date: string, hh: number, mm = 0) => localDateTimeToISO(`${date}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
const round2 = (n: number) => Math.round(n * 100) / 100;

export function buildDemoData(today = todayISO()): DemoDB {
  const rnd = mulberry32(20261024);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;
  const created = ts(addMonths(today, -14), 9);
  const som = startOfMonth(today);
  const gym = DEMO_GYM_ID;

  const gyms: Partial<Tables<"gyms">>[] = [
    {
      id: gym, name: "Studio Personal Célia Barbosa", legal_name: "Studio Personal Célia Barbosa (demonstração)", cnpj: "00.000.000/0001-00",
      email: "contato@exemplo.com.br", phone: "(00) 0000-0000", whatsapp: "(00) 90000-0000", address: "Endereço fictício, 100", city: "Cidade",
      state: "UF", zip_code: "00000-000", logo_path: null, primary_color: "#FF651C", timezone: "America/Sao_Paulo",
      opening_hours: { seg: "06:00-22:00", ter: "06:00-22:00", qua: "06:00-22:00", qui: "06:00-22:00", sex: "06:00-21:00", sab: "08:00-12:00", dom: "fechado" },
      default_due_day: 10, late_fee_percent: 2, monthly_interest_percent: 1, due_alert_days: 3, absence_alert_days: 10,
      opening_balance: 12000, opening_balance_date: addMonths(som, -13), data_retention_months: 60, created_at: created, updated_at: created,
    },
  ];

  const categories = CATEGORIES.map(([name, type, nature, dre_group, is_system, color], i) => ({
    id: id(1, i + 1), gym_id: gym, name, type, nature, dre_group, is_system, color, active: true, created_at: created,
  }));
  const cat = (name: string) => categories.find((c) => c.name === name)!.id;

  const plans = [
    { name: "Mensal", periodicity: "mensal", duration_months: 1, price: 290, description: "Treino acompanhado, cobrança mensal.", weekly_frequency: null },
    { name: "Trimestral", periodicity: "trimestral", duration_months: 3, price: 810, description: "3 meses com desconto.", weekly_frequency: null },
    { name: "Semestral", periodicity: "semestral", duration_months: 6, price: 1500, description: "6 meses com desconto.", weekly_frequency: null },
    { name: "Anual", periodicity: "anual", duration_months: 12, price: 2760, description: "12 meses — melhor valor.", weekly_frequency: null },
    { name: "Personal 2x semana", periodicity: "personalizado", duration_months: 1, price: 680, description: "Acompanhamento individual.", weekly_frequency: 2 },
  ].map((p, i) => ({ id: id(2, i + 1), gym_id: gym, active: true, created_at: created, updated_at: created, ...p }));

  const staff = [
    ["Célia Barbosa", "admin", "Proprietária e personal trainer"],
    ["Marcos Teixeira", "gerente", "Gerente administrativo"],
    ["Juliana Alves", "recepcionista", "Recepção"],
    ["Rafael Lima", "professor", "Professor de musculação"],
    ["Bruna Martins", "professor", "Professora de funcional"],
  ].map(([full_name, role, position], i) => ({
    id: id(3, i + 1), gym_id: gym, profile_id: id(4, i + 1), full_name, email: `${full_name!.split(" ")[0]!.toLowerCase()}@exemplo.com.br`,
    phone: `0090000000${i}`, cpf: null, role, position, hire_date: addMonths(today, -24 + i * 3), salary: [0, 4200, 2300, 3100, 2900][i],
    responsibilities: ["Gestão geral e treinos personalizados", "Financeiro e equipe", "Atendimento, matrículas e cobranças", "Fichas de treino e avaliações", "Aulas coletivas e funcional"][i],
    schedule: { texto: ["Seg a Sex 06h–14h", "Seg a Sex 09h–18h", "Seg a Sex 06h–15h", "Seg a Sex 14h–22h", "Ter, Qui e Sáb 07h–13h"][i] },
    active: true, notes: null, created_at: created, updated_at: created,
  }));

  const exercises = EXERCISES.map(([name, muscle_group, equipment], i) => ({
    id: id(5, i + 1), gym_id: gym, name, muscle_group, equipment, instructions: null, video_url: null, active: true, created_at: created,
  }));

  // Alunos -----------------------------------------------------------------
  const students: Row[] = [];
  const memberships: Row[] = [];
  const invoices: Row[] = [];
  const payments: Row[] = [];
  const transactions: Row[] = [];
  const health: Row[] = [];
  let receipt = 1000;
  let txn = 1;
  const methods = ["pix", "pix", "pix", "cartao_credito", "cartao_debito", "dinheiro", "transferencia"] as const;

  NAMES.forEach((full_name, i) => {
    const sid = id(6, i + 1);
    const status = i < 30 ? "ativo" : i < 32 ? "suspenso" : i < 35 ? "inativo" : "arquivado";
    const monthsAgo = i === 0 ? 10 : Math.floor(rnd() * 17);
    const start = addDays(addMonths(today, -monthsAgo), -Math.floor(rnd() * 25));
    const due_day = pick([5, 10, 10, 15, 20]);
    const female = /a$|e$|Beatriz|Isabel|Helena|Yasmin|Rafaela/.test(full_name.split(" ")[0]!);
    students.push({
      id: sid, gym_id: gym, user_id: i === 0 ? id(4, 9) : null, enrollment_code: `CB${String(i + 1).padStart(5, "0")}`, full_name,
      cpf: null, email: `${full_name.split(" ")[0]!.toLowerCase()}.${i + 1}@exemplo.com.br`, phone: `119${String(80000000 + i * 7919).slice(0, 8)}`,
      birth_date: `${1975 + Math.floor(rnd() * 30)}-${String(1 + Math.floor(rnd() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rnd() * 27)).padStart(2, "0")}`,
      gender: female ? "feminino" : "masculino", address: null, photo_path: null,
      objective: pick(["Hipertrofia", "Emagrecimento", "Condicionamento", "Saúde e qualidade de vida", "Reabilitação"]),
      start_date: start, due_day, status, emergency_contact_name: null, emergency_contact_phone: null,
      lgpd_consent_at: ts(start, 10), health_consent_at: i % 3 === 0 ? ts(start, 10) : null, notifications_opt_in: i % 2 === 0,
      notes: null, archived_at: status === "arquivado" ? ts(addMonths(today, -2), 10) : null, anonymized_at: null, created_at: ts(start, 10), updated_at: ts(start, 10),
    });
    if (i % 3 === 0)
      health.push({
        student_id: sid, gym_id: gym, medical_conditions: i % 6 === 0 ? "Hipertensão controlada" : null, medications: null,
        injuries: i % 9 === 0 ? "Tendinite no ombro direito (2023)" : null, restrictions: i % 6 === 0 ? "Evitar apneia em cargas altas" : null,
        physician_clearance: true, updated_at: ts(start, 10),
      });

    const r = rnd();
    const plan = i === 0 ? plans[0]! : r < 0.55 ? plans[0]! : r < 0.72 ? plans[1]! : r < 0.82 ? plans[2]! : r < 0.9 ? plans[3]! : plans[4]!;
    const discount = plan.duration_months >= 6 ? 0 : i % 7 === 0 ? 20 : 0;
    const mid = id(7, i + 1);
    const canceled = status === "inativo" || status === "arquivado";
    const cancelDate = canceled ? addMonths(today, -1 - (i % 3)) : null;
    memberships.push({
      id: mid, gym_id: gym, student_id: sid, plan_id: plan.id, start_date: start, end_date: cancelDate, price: plan.price, discount,
      status: canceled ? "cancelada" : status === "suspenso" ? "suspensa" : "ativa", auto_renew: true,
      canceled_at: cancelDate ? ts(cancelDate, 11) : null, cancel_reason: canceled ? pick(["Mudança de cidade", "Questões financeiras", "Falta de tempo"]) : null,
      created_by: null, created_at: ts(start, 10), updated_at: ts(start, 10),
    });

    // Cobranças por ciclo nos últimos 12 meses
    const late = i === 3 || i === 12 || i === 21;
    for (let k = 0; ; k += plan.duration_months) {
      const ref = addMonths(startOfMonth(start), k);
      if (ref > som) break;
      if (cancelDate && ref > cancelDate) break;
      if (ref < addMonths(som, -12)) continue;
      const due = `${ref.slice(0, 8)}${String(due_day).padStart(2, "0")}`;
      const dueDate = k === 0 ? start : due;
      const isCurrent = ref === som;
      const overdue = (late && ref >= addMonths(som, -1) && dueDate < today) || (status === "suspenso" && ref >= addMonths(som, -1));
      const paid = !overdue && dueDate <= today && (!isCurrent || rnd() < 0.85);
      const iid = id(8, invoices.length + 1);
      invoices.push({
        id: iid, gym_id: gym, student_id: sid, membership_id: mid, description: `Plano ${plan.name} — ${ref.slice(5, 7)}/${ref.slice(0, 4)}`,
        reference_month: ref, due_date: dueDate, amount: plan.price, discount, fine: 0, interest: 0, status: paid ? "pago" : "pendente",
        paid_at: null, renegotiated_from: null, notes: null, created_by: null, created_at: ts(ref, 8), updated_at: ts(ref, 8),
      });
      if (paid) {
        const payDay = addDays(dueDate, Math.floor(rnd() * 6) - 3);
        const paidDate = payDay > today ? today : payDay < start ? start : payDay;
        const paidAt = ts(paidDate, 8 + Math.floor(rnd() * 11), Math.floor(rnd() * 60));
        const pid = id(9, payments.length + 1);
        const method = pick(methods);
        const amount = round2(plan.price - discount);
        invoices.at(-1)!.paid_at = paidAt;
        payments.push({
          id: pid, gym_id: gym, invoice_id: iid, student_id: sid, amount, method, paid_at: paidAt, receipt_number: receipt++,
          received_by: id(4, 3), notes: null, gateway: null, gateway_reference: null, reversed_at: null, reversal_reason: null, created_at: paidAt,
        });
        transactions.push({
          id: id(10, txn++), gym_id: gym, type: "receita", category_id: cat("Mensalidades"), supplier_id: null, student_id: sid, payment_id: pid,
          investment_id: null, description: `Recebimento ${full_name} — recibo nº ${receipt - 1}`, amount, competence_date: ref, due_date: paidDate,
          paid_date: paidDate, status: "pago", nature: "fixa", payment_method: method, document_number: String(receipt - 1), recurrence_group: null,
          notes: null, created_by: null, created_at: paidAt, updated_at: paidAt,
        });
      }
    }
  });

  // Fornecedores e despesas -----------------------------------------------
  const suppliers = [
    ["Imobiliária Exemplo", "Aluguel"], ["Distribuidora de Energia", "Energia"], ["Fibra Net", "Internet"],
    ["Escritório Contábil Exemplo", "Contabilidade"], ["TecFit Manutenção", "Manutenção"],
  ].map(([name, category], i) => ({ id: id(11, i + 1), gym_id: gym, name, document: null, email: null, phone: null, category, notes: null, active: true, created_at: created, updated_at: created }));
  const sup = (n: number) => suppliers[n]!.id;

  const expense = (month: string, day: number, name: string, desc: string, amount: number, supplier: string | null, paidOverride?: boolean) => {
    const due = addDays(month, day - 1);
    const paid = paidOverride ?? due <= today;
    transactions.push({
      id: id(10, txn++), gym_id: gym, type: "despesa", category_id: cat(name), supplier_id: supplier, student_id: null, payment_id: null,
      investment_id: null, description: desc, amount: round2(amount), competence_date: month, due_date: due, paid_date: paid ? due : null,
      status: paid ? "pago" : "pendente", nature: CATEGORIES.find((c) => c[0] === name)![2], payment_method: paid ? "transferencia" : null,
      document_number: null, recurrence_group: null, notes: null, created_by: null, created_at: ts(month, 9), updated_at: ts(month, 9),
    });
  };
  for (let m = -12; m <= 1; m++) {
    const month = addMonths(som, m);
    const future = m === 1;
    const income = transactions.filter((t) => t.type === "receita" && String(t.paid_date ?? "").startsWith(month.slice(0, 7))).reduce((a, t) => a + Number(t.amount), 0);
    expense(month, 5, "Aluguel", "Aluguel do espaço", 2400, sup(0), future ? false : undefined);
    expense(month, 5, "Salários e encargos", "Folha de pagamento", 2900 + (m > -6 ? 200 : 0), null, future ? false : undefined);
    expense(month, 12, "Internet e telefone", "Internet fibra", 149.9, sup(2), future ? false : undefined);
    expense(month, 10, "Contabilidade", "Honorários contábeis", 380, sup(3), future ? false : undefined);
    expense(month, 15, "Sistemas e softwares", "Assinaturas de software", 99, null, future ? false : undefined);
    if (future) continue;
    expense(month, 18, "Energia elétrica", "Conta de energia", 430 + rnd() * 220 + (m === -1 ? 330 : 0), sup(1));
    expense(month, 18, "Água", "Conta de água", 110 + rnd() * 60, null);
    expense(month, 8, "Limpeza e materiais", "Materiais de limpeza", 120 + rnd() * 110, null);
    if (m % 2 === 0) expense(month, 20, "Marketing e publicidade", "Anúncios em redes sociais", 250 + rnd() * 300, null);
    if (m % 4 === 0) expense(month, 22, "Manutenção de equipamentos", "Manutenção preventiva", 300 + rnd() * 400, sup(4));
    expense(month, 25, "Taxas bancárias e de cartão", "Taxas de maquininha e tarifas", income * 0.018 + 39, null);
    expense(month, 20, "Impostos", "Simples Nacional", income * 0.06, null);
    {
      const d = addDays(month, 14);
      if (d <= today)
        transactions.push({
          id: id(10, txn++), gym_id: gym, type: "receita", category_id: cat("Avaliações e serviços"), supplier_id: null, student_id: null, payment_id: null,
          investment_id: null, description: "Avaliações físicas avulsas", amount: 240 + 120 * Math.floor(rnd() * 3), competence_date: month, due_date: d, paid_date: d, status: "pago",
          nature: "variavel", payment_method: "pix", document_number: null, recurrence_group: null, notes: null, created_by: null, created_at: ts(d, 9), updated_at: ts(d, 9),
        });
    }
  }

  // Investimentos -----------------------------------------------------------
  const investments = [
    { name: "Nova esteira profissional", kind: "equipamento", amount: 9800, invested_at: addMonths(som, -6), expected_monthly_return: 870, expected_monthly_cost: 60, useful_life_months: 60, status: "executado" },
    { name: "Campanha de inverno (Instagram)", kind: "publicidade", amount: 2400, invested_at: addMonths(som, -2), expected_monthly_return: 720, expected_monthly_cost: 0, useful_life_months: 6, status: "executado" },
    { name: "Reforma do vestiário", kind: "reforma", amount: 26000, invested_at: null, expected_monthly_return: 900, expected_monthly_cost: 80, useful_life_months: 96, status: "planejado" },
  ].map((v, i) => ({ id: id(12, i + 1), gym_id: gym, notes: null, created_at: created, updated_at: created, ...v }));
  investments
    .filter((v) => v.status === "executado")
    .forEach((v) =>
      transactions.push({
        id: id(10, txn++), gym_id: gym, type: "despesa", category_id: cat("Investimentos"), supplier_id: null, student_id: null, payment_id: null,
        investment_id: v.id, description: `Investimento: ${v.name}`, amount: v.amount, competence_date: v.invested_at, due_date: v.invested_at,
        paid_date: v.invested_at, status: "pago", nature: "variavel", payment_method: "transferencia", document_number: null, recurrence_group: null,
        notes: null, created_by: null, created_at: ts(v.invested_at!, 9), updated_at: ts(v.invested_at!, 9),
      }),
    );

  const budgets = [
    ["Mensalidades", 9500], ["Aluguel", 2400], ["Salários e encargos", 3100], ["Energia elétrica", 600], ["Água", 160],
    ["Marketing e publicidade", 400], ["Limpeza e materiais", 200], ["Impostos", 570],
  ].map(([name, amount], i) => ({ id: id(13, i + 1), gym_id: gym, category_id: cat(name as string), month: som, amount, created_at: created }));

  // Treinos ----------------------------------------------------------------
  const ex = (name: string) => exercises.find((e) => e.name === name)!.id;
  const templates: [string, string, string[]][] = [
    ["A", "Peito, ombros e tríceps", ["Supino reto com barra", "Supino inclinado com halteres", "Desenvolvimento com halteres", "Elevação lateral", "Tríceps na polia"]],
    ["B", "Costas e bíceps", ["Puxada frontal", "Remada baixa", "Remada unilateral com halter", "Rosca direta", "Rosca martelo"]],
    ["C", "Pernas e abdômen", ["Agachamento livre", "Leg press 45°", "Cadeira extensora", "Mesa flexora", "Panturrilha em pé", "Prancha isométrica"]],
  ];
  const baseLoad: Record<string, number> = {
    "Supino reto com barra": 30, "Supino inclinado com halteres": 12, "Desenvolvimento com halteres": 10, "Elevação lateral": 6, "Tríceps na polia": 20,
    "Puxada frontal": 35, "Remada baixa": 35, "Remada unilateral com halter": 14, "Rosca direta": 16, "Rosca martelo": 10,
    "Agachamento livre": 40, "Leg press 45°": 100, "Cadeira extensora": 35, "Mesa flexora": 30, "Panturrilha em pé": 40,
  };
  const workout_plans: Row[] = [];
  const workout_divisions: Row[] = [];
  const workout_exercises: Row[] = [];
  const workout_logs: Row[] = [];
  students.filter((s) => s.status === "ativo").slice(0, 24).forEach((s, i) => {
    const pid = id(14, i + 1);
    const start = addDays(today, -40 - (i % 5) * 9);
    workout_plans.push({
      id: pid, gym_id: gym, student_id: s.id, teacher_id: staff[i % 2 === 0 ? 3 : 4]!.id, title: i % 3 === 0 ? "Hipertrofia — fase 2" : "Condicionamento ABC",
      goal: s.objective, start_date: start, end_date: addDays(start, 75), active: true, notes: "Aquecer 10 minutos antes. Hidratação constante.",
      created_at: ts(start, 10), updated_at: ts(start, 10),
    });
    templates.forEach(([label, name, list], d) => {
      const did = id(15, i * 10 + d + 1);
      workout_divisions.push({ id: did, gym_id: gym, plan_id: pid, label, name, position: d });
      list.forEach((exName, p) => {
        const weid = id(16, (i * 10 + d) * 10 + p + 1);
        const load = baseLoad[exName] ?? null;
        workout_exercises.push({
          id: weid, gym_id: gym, division_id: did, exercise_id: ex(exName), position: p, sets: exName === "Prancha isométrica" ? 3 : 4,
          reps: exName === "Prancha isométrica" ? "40s" : p < 2 ? "8-10" : "10-12", load_kg: load != null ? Math.round(load * (0.8 + (i % 4) * 0.1)) : null,
          rest_seconds: p < 2 ? 90 : 60, notes: p === 0 ? "Cadência controlada na descida" : null,
        });
        if (i < 6 && load != null && p < 3) {
          for (let w = 9; w >= 0; w--) {
            const day = addDays(today, -w * 7 - d * 2 - 1);
            if (day < start) continue;
            workout_logs.push({
              id: id(17, workout_logs.length + 1), gym_id: gym, student_id: s.id, workout_exercise_id: weid, exercise_id: ex(exName), performed_on: day,
              sets_done: 4, reps_done: p < 2 ? "10" : "12", load_kg: Math.round((load * (0.8 + (i % 4) * 0.1) + (9 - w) * load * 0.025) * 2) / 2,
              notes: w === 0 && p === 0 ? "Boa execução, aumentar carga" : null, created_at: ts(day, 19),
            });
          }
        }
      });
    });
  });

  // Frequência -------------------------------------------------------------
  const checkins: Row[] = [];
  const hours = [6, 6, 7, 7, 7, 8, 9, 10, 12, 12, 17, 18, 18, 18, 19, 19, 19, 20, 20, 21];
  students.forEach((s, i) => {
    if (s.status === "arquivado") return;
    const freq = 0.25 + (i % 5) * 0.09;
    const stopAgo = s.status !== "ativo" ? 45 : i === 5 || i === 17 || i === 26 ? 14 + i : 0;
    const prefHour = hours[i % hours.length]!;
    for (let dd = 180; dd >= 0; dd--) {
      const day = addDays(today, -dd);
      if (day < String(s.start_date) || dd < stopAgo) continue;
      const dow = new Date(`${day}T12:00:00Z`).getUTCDay();
      if (dow === 0 || (dow === 6 && rnd() < 0.7)) continue;
      if (rnd() > freq) continue;
      if (dd === 0 && prefHour > 10) continue;
      const h = rnd() < 0.75 ? prefHour : pick(hours);
      checkins.push({
        id: id(18, checkins.length + 1), gym_id: gym, student_id: s.id, checked_in_at: ts(day, h, Math.floor(rnd() * 50)),
        method: pick(["qrcode", "qrcode", "matricula", "recepcao"]), registered_by: id(4, 3), notes: null,
      });
    }
  });

  // Agenda -----------------------------------------------------------------
  const events: Row[] = [];
  const event_attendees: Row[] = [];
  const dowToday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const monday = addDays(today, -((dowToday + 6) % 7));
  for (let w = 0; w < 2; w++) {
    for (const [offset, h, title, staffIdx, cap] of [[0, 7, "Funcional", 4, 12], [2, 7, "Funcional", 4, 12], [4, 7, "Funcional", 4, 12], [1, 19, "Alongamento e mobilidade", 4, 10], [3, 19, "Alongamento e mobilidade", 4, 10]] as const) {
      const day = addDays(monday, w * 7 + offset);
      const eid = id(19, events.length + 1);
      events.push({
        id: eid, gym_id: gym, title, kind: "aula", starts_at: ts(day, h), ends_at: ts(day, h + 1), staff_id: staff[staffIdx]!.id, student_id: null,
        location: "Sala 1", capacity: cap, description: "Aula coletiva incluída nos planos.", status: day < today ? "concluido" : "agendado",
        created_by: null, created_at: created, updated_at: created,
      });
      students.filter((s) => s.status === "ativo").slice(events.length % 5, (events.length % 5) + 4 + (events.length % 4)).forEach((s) =>
        event_attendees.push({ event_id: eid, student_id: s.id, gym_id: gym, created_at: created }),
      );
    }
  }
  [[1, 10, 2], [2, 16, 9], [3, 9, 0]].forEach(([offset, h, si]) => {
    const day = addDays(today, offset!);
    events.push({
      id: id(19, events.length + 1), gym_id: gym, title: "Avaliação física", kind: "avaliacao", starts_at: ts(day, h!), ends_at: ts(day, h! + 1),
      staff_id: staff[3]!.id, student_id: students[si!]!.id, location: "Sala de avaliação", capacity: null, description: null, status: "agendado",
      created_by: null, created_at: created, updated_at: created,
    });
  });
  events.push({
    id: id(19, events.length + 1), gym_id: gym, title: "Reunião de equipe", kind: "compromisso", starts_at: ts(addDays(today, 2), 14), ends_at: ts(addDays(today, 2), 15),
    staff_id: staff[1]!.id, student_id: null, location: "Recepção", capacity: null, description: "Planejamento do mês", status: "agendado",
    created_by: null, created_at: created, updated_at: created,
  });

  // Perfis, notificações, auditoria ---------------------------------------
  const profiles = [
    ...staff.map((s) => ({ id: s.profile_id, gym_id: gym, full_name: s.full_name, email: s.email, role: s.role, active: true, avatar_path: null, created_at: created, updated_at: created })),
    { id: id(4, 9), gym_id: gym, full_name: "Ana Paula Ribeiro", email: "ana.1@exemplo.com.br", role: "aluno", active: true, avatar_path: null, created_at: created, updated_at: created },
  ];

  const notifications: Row[] = [];
  invoices
    .filter((i) => i.status === "pendente" && String(i.due_date) < today)
    .forEach((i) => {
      const s = students.find((x) => x.id === i.student_id)!;
      notifications.push({
        id: id(20, notifications.length + 1), gym_id: gym, audience: "staff", student_id: null, kind: "atraso", title: "Mensalidade em atraso",
        body: `${s.full_name} — venceu em ${String(i.due_date).split("-").reverse().join("/")}`, link: `/alunos/${s.id}`, dedupe_key: null,
        read_at: null, created_at: ts(addDays(String(i.due_date), 1), 7),
      });
    });
  notifications.push(
    { id: id(20, 900), gym_id: gym, audience: "staff", student_id: null, kind: "ausencia", title: "Aluno ausente", body: `${NAMES[5]} sem check-in há mais de 10 dias`, link: `/alunos/${id(6, 6)}`, dedupe_key: null, read_at: ts(addDays(today, -2), 9), created_at: ts(addDays(today, -3), 7) },
    { id: id(20, 901), gym_id: gym, audience: "student", student_id: id(6, 1), kind: "vencimento", title: "Sua mensalidade vence em breve", body: "Confira o vencimento em Mensalidades.", link: "/portal/mensalidades", dedupe_key: null, read_at: null, created_at: ts(addDays(today, -1), 7) },
  );

  const audit_logs: Row[] = [
    ["INSERT", "students", 3, { full_name: NAMES[29] }],
    ["INSERT", "payments", 3, { amount: 290, method: "pix" }],
    ["UPDATE", "plans", 1, { price: 290 }],
    ["INSERT", "transactions", 2, { description: "Conta de energia", amount: 912.4 }],
    ["UPDATE", "students", 3, { status: "suspenso" }],
    ["INSERT", "workout_plans", 4, { title: "Hipertrofia — fase 2" }],
    ["UPDATE", "gyms", 1, { late_fee_percent: 2 }],
  ].map(([action, table_name, actor, data], i) => ({
    id: i + 1, gym_id: gym, actor_id: id(4, actor as number), actor_role: staff[(actor as number) - 1]?.role ?? "admin", action, table_name, record_id: id(99, i),
    old_data: action === "UPDATE" ? Object.fromEntries(Object.keys(data as object).map((k) => [k, k === "status" ? "ativo" : k === "price" ? 270 : 2.5])) : null,
    new_data: data, created_at: ts(addDays(today, -i), 9 + i),
  }));

  const report_exports = [
    { id: id(21, 1), gym_id: gym, report_type: "inadimplencia", format: "pdf", params: {}, generated_by: id(4, 1), created_at: ts(addDays(today, -1), 18) },
    { id: id(21, 2), gym_id: gym, report_type: "lancamentos", format: "xlsx", params: {}, generated_by: id(4, 2), created_at: ts(addDays(today, -6), 11) },
  ];

  const staff_directory = staff.map((s) => ({
    id: s.id, gym_id: gym, full_name: s.full_name, role: s.role, position: s.position, phone: s.phone, email: s.email, active: s.active,
    schedule: s.schedule, responsibilities: s.responsibilities,
  }));

  void isoDateInGymTz;
  return {
    __today: today,
    gyms, profiles, staff, staff_directory, plans, students, student_health: health, memberships, invoices, payments,
    financial_categories: categories, suppliers, transactions, budgets, investments, exercises, workout_plans, workout_divisions,
    workout_exercises, workout_logs, checkins, events, event_attendees, notifications, audit_logs, report_exports,
  } as unknown as DemoDB;
}

const cache: { db?: DemoDB } = {};
export function getDemoData(): DemoDB {
  const today = todayISO();
  if (!cache.db || cache.db.__today !== today) cache.db = buildDemoData(today);
  return cache.db;
}

export const DEMO_STUDENT_ID = id(6, 1);
export const DEMO_PROFILE_IDS = { admin: id(4, 1), gerente: id(4, 2), recepcionista: id(4, 3), professor: id(4, 4), aluno: id(4, 9) } as const;
