import {
  BarChart3, Bell, Building2, CalendarDays, ClipboardList, Dumbbell, FileBarChart, FileClock, Landmark,
  LayoutDashboard, ListChecks, Lightbulb, PiggyBank, ScanLine, Settings, Users, UserCog, Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Module } from "@/lib/permissions";

export type NavItem = { href: string; label: string; icon: LucideIcon; module: Module };
export type NavSection = { title: string; items: NavItem[] };

export const NAV: NavSection[] = [
  {
    title: "Visão geral",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" },
      { href: "/notificacoes", label: "Notificações", icon: Bell, module: "notificacoes" },
    ],
  },
  {
    title: "Alunos",
    items: [
      { href: "/alunos", label: "Alunos", icon: Users, module: "alunos" },
      { href: "/planos", label: "Planos", icon: ClipboardList, module: "planos" },
      { href: "/mensalidades", label: "Mensalidades", icon: Wallet, module: "mensalidades" },
      { href: "/frequencia", label: "Frequência", icon: ScanLine, module: "frequencia" },
    ],
  },
  {
    title: "Treinos",
    items: [
      { href: "/treinos", label: "Fichas de treino", icon: Dumbbell, module: "treinos" },
      { href: "/exercicios", label: "Exercícios", icon: ListChecks, module: "exercicios" },
      { href: "/agenda", label: "Agenda", icon: CalendarDays, module: "agenda" },
    ],
  },
  {
    title: "Gestão",
    items: [
      { href: "/financeiro", label: "Financeiro", icon: Landmark, module: "financeiro" },
      { href: "/investimentos", label: "Investimentos", icon: PiggyBank, module: "investimentos" },
      { href: "/analises", label: "Inteligência", icon: Lightbulb, module: "analises" },
      { href: "/relatorios", label: "Relatórios", icon: FileBarChart, module: "relatorios" },
    ],
  },
  {
    title: "Administração",
    items: [
      { href: "/funcionarios", label: "Equipe", icon: UserCog, module: "funcionarios" },
      { href: "/auditoria", label: "Auditoria", icon: FileClock, module: "auditoria" },
      { href: "/configuracoes", label: "Configurações", icon: Settings, module: "configuracoes" },
    ],
  },
];

export const PORTAL_NAV = [
  { href: "/portal", label: "Início", short: "Início", icon: LayoutDashboard },
  { href: "/portal/treinos", label: "Meus treinos", short: "Treinos", icon: Dumbbell },
  { href: "/portal/mensalidades", label: "Mensalidades", short: "Pagamentos", icon: Wallet },
  { href: "/portal/frequencia", label: "Frequência", short: "Frequência", icon: BarChart3 },
  { href: "/portal/agenda", label: "Agenda", short: "Agenda", icon: CalendarDays },
  { href: "/portal/perfil", label: "Meus dados", short: "Perfil", icon: Building2 },
] as const;
