import type { Enums } from "@/types/database";

export type Tone = "neutral" | "success" | "warning" | "danger" | "brand" | "info";

export const ROLE_LABELS: Record<Enums<"app_role">, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  recepcionista: "Recepcionista",
  professor: "Professor",
  aluno: "Aluno",
};

export const PERIODICITY_LABELS: Record<Enums<"plan_periodicity">, string> = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
  personalizado: "Personalizado",
};

export const PERIODICITY_MONTHS: Record<Exclude<Enums<"plan_periodicity">, "personalizado">, number> = {
  mensal: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

export const STUDENT_STATUS: Record<Enums<"student_status">, { label: string; tone: Tone }> = {
  ativo: { label: "Ativo", tone: "success" },
  suspenso: { label: "Suspenso", tone: "warning" },
  inativo: { label: "Inativo", tone: "neutral" },
  arquivado: { label: "Arquivado", tone: "neutral" },
};

export const MEMBERSHIP_STATUS: Record<Enums<"membership_status">, { label: string; tone: Tone }> = {
  ativa: { label: "Ativa", tone: "success" },
  suspensa: { label: "Suspensa", tone: "warning" },
  cancelada: { label: "Cancelada", tone: "danger" },
  encerrada: { label: "Encerrada", tone: "neutral" },
};

export type InvoiceDisplayStatus = Enums<"invoice_status"> | "atrasado";
export const INVOICE_STATUS: Record<InvoiceDisplayStatus, { label: string; tone: Tone }> = {
  pendente: { label: "Pendente", tone: "warning" },
  atrasado: { label: "Em atraso", tone: "danger" },
  pago: { label: "Pago", tone: "success" },
  cancelado: { label: "Cancelado", tone: "neutral" },
  renegociado: { label: "Renegociado", tone: "info" },
};

export const PAYMENT_METHOD_LABELS: Record<Enums<"payment_method">, string> = {
  pix: "PIX",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
};

export const TX_STATUS: Record<Enums<"tx_status">, { label: string; tone: Tone }> = {
  pendente: { label: "Pendente", tone: "warning" },
  pago: { label: "Liquidado", tone: "success" },
  cancelado: { label: "Cancelado", tone: "neutral" },
};

export const TX_TYPE_LABELS: Record<Enums<"tx_type">, string> = { receita: "Receita", despesa: "Despesa" };
export const NATURE_LABELS: Record<Enums<"cost_nature">, string> = { fixa: "Fixa", variavel: "Variável" };

export const DRE_GROUP_LABELS: Record<string, string> = {
  receita_operacional: "Receita operacional",
  outras_receitas: "Outras receitas",
  impostos: "Impostos",
  custo_variavel: "Custos variáveis",
  despesa_fixa: "Despesas fixas",
  investimento: "Investimentos",
};

export const INVESTMENT_KIND_LABELS: Record<Enums<"investment_kind">, string> = {
  equipamento: "Equipamentos",
  reforma: "Reforma",
  publicidade: "Publicidade",
  expansao: "Expansão",
  tecnologia: "Tecnologia",
  outro: "Outro",
};

export const INVESTMENT_STATUS: Record<Enums<"investment_status">, { label: string; tone: Tone }> = {
  planejado: { label: "Planejado", tone: "info" },
  executado: { label: "Executado", tone: "success" },
  cancelado: { label: "Cancelado", tone: "neutral" },
};

export const CHECKIN_METHOD_LABELS: Record<Enums<"checkin_method">, string> = {
  recepcao: "Recepção",
  matricula: "Matrícula",
  qrcode: "QR Code",
};

export const EVENT_KIND_LABELS: Record<Enums<"event_kind">, string> = {
  aula: "Aula",
  avaliacao: "Avaliação",
  compromisso: "Compromisso",
};

export const EVENT_STATUS: Record<Enums<"event_status">, { label: string; tone: Tone }> = {
  agendado: { label: "Agendado", tone: "info" },
  concluido: { label: "Concluído", tone: "success" },
  cancelado: { label: "Cancelado", tone: "neutral" },
};

export const MUSCLE_GROUPS: Record<string, string> = {
  peito: "Peito",
  costas: "Costas",
  ombros: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  antebraco: "Antebraço",
  abdomen: "Abdômen",
  quadriceps: "Quadríceps",
  posteriores: "Posteriores de coxa",
  gluteos: "Glúteos",
  panturrilhas: "Panturrilhas",
  corpo_inteiro: "Corpo inteiro",
  cardio: "Cardio",
  mobilidade: "Mobilidade",
};

export const EQUIPMENT: Record<string, string> = {
  barra: "Barra",
  halteres: "Halteres",
  maquina: "Máquina",
  polia: "Polia / cabo",
  peso_corporal: "Peso corporal",
  kettlebell: "Kettlebell",
  elastico: "Elástico",
  banco: "Banco",
  esteira: "Esteira",
  bicicleta: "Bicicleta",
  outro: "Outro",
};

export const GENDER_LABELS: Record<string, string> = {
  feminino: "Feminino",
  masculino: "Masculino",
  outro: "Outro",
  nao_informado: "Prefere não informar",
};

export const WORKOUT_LABELS = ["A", "B", "C", "D", "E"] as const;
