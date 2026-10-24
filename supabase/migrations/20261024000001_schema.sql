-- =====================================================================
-- Studio Personal Célia Barbosa — Plataforma de gestão
-- Migration 1: tipos, tabelas e índices
-- =====================================================================


-- ---------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------
create type public.app_role as enum ('admin', 'gerente', 'recepcionista', 'professor', 'aluno');
create type public.plan_periodicity as enum ('mensal', 'trimestral', 'semestral', 'anual', 'personalizado');
create type public.student_status as enum ('ativo', 'suspenso', 'inativo', 'arquivado');
create type public.membership_status as enum ('ativa', 'suspensa', 'cancelada', 'encerrada');
create type public.invoice_status as enum ('pendente', 'pago', 'cancelado', 'renegociado');
create type public.payment_method as enum ('pix', 'cartao_credito', 'cartao_debito', 'dinheiro', 'transferencia');
create type public.tx_type as enum ('receita', 'despesa');
create type public.tx_status as enum ('pendente', 'pago', 'cancelado');
create type public.cost_nature as enum ('fixa', 'variavel');
create type public.investment_kind as enum ('equipamento', 'reforma', 'publicidade', 'expansao', 'tecnologia', 'outro');
create type public.investment_status as enum ('planejado', 'executado', 'cancelado');
create type public.checkin_method as enum ('recepcao', 'matricula', 'qrcode');
create type public.event_kind as enum ('aula', 'avaliacao', 'compromisso');
create type public.event_status as enum ('agendado', 'concluido', 'cancelado');

-- ---------------------------------------------------------------------
-- Academias
-- ---------------------------------------------------------------------
create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  cnpj text,
  email text,
  phone text,
  whatsapp text,
  address text,
  city text,
  state text,
  zip_code text,
  logo_path text,
  primary_color text not null default '#FF651C',
  timezone text not null default 'America/Sao_Paulo',
  opening_hours jsonb not null default '{}'::jsonb,
  default_due_day smallint not null default 10 check (default_due_day between 1 and 28),
  late_fee_percent numeric(5,2) not null default 2 check (late_fee_percent >= 0),
  monthly_interest_percent numeric(5,2) not null default 1 check (monthly_interest_percent >= 0),
  due_alert_days smallint not null default 3 check (due_alert_days between 0 and 30),
  absence_alert_days smallint not null default 10 check (absence_alert_days between 1 and 90),
  opening_balance numeric(12,2) not null default 0,
  opening_balance_date date not null default current_date,
  data_retention_months smallint not null default 60 check (data_retention_months >= 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Perfis de usuário (1:1 com auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  gym_id uuid not null references public.gyms (id) on delete restrict,
  full_name text not null default '',
  email text,
  role public.app_role not null default 'aluno',
  active boolean not null default true,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_gym_idx on public.profiles (gym_id);

-- Funções auxiliares usadas como DEFAULT e nas políticas RLS.
-- SECURITY DEFINER para evitar recursão de RLS em profiles.
create or replace function public.current_gym_id()
returns uuid
language sql stable security definer set search_path = public
as $$ select gym_id from public.profiles where id = auth.uid() and active $$;

create or replace function public.auth_role()
returns public.app_role
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() and active $$;

create or replace function public.has_any_role(roles public.app_role[])
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce((select role = any (roles) from public.profiles where id = auth.uid() and active), false) $$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.has_any_role(array['admin','gerente','recepcionista','professor']::public.app_role[]) $$;

-- ---------------------------------------------------------------------
-- Funcionários
-- ---------------------------------------------------------------------
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null default public.current_gym_id() references public.gyms (id) on delete restrict,
  profile_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  cpf text,
  role public.app_role not null check (role <> 'aluno'),
  position text,
  hire_date date,
  salary numeric(10,2) check (salary is null or salary >= 0),
  responsibilities text,
  schedule jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index staff_gym_idx on public.staff (gym_id);

-- ---------------------------------------------------------------------
-- Planos
-- ---------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null default public.current_gym_id() references public.gyms (id) on delete restrict,
  name text not null,
  periodicity public.plan_periodicity not null,
  duration_months smallint not null check (duration_months between 1 and 36),
  price numeric(10,2) not null check (price >= 0),
  description text,
  weekly_frequency smallint check (weekly_frequency is null or weekly_frequency between 1 and 7),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gym_id, name)
);

-- ---------------------------------------------------------------------
-- Alunos
-- ---------------------------------------------------------------------
create sequence public.student_code_seq start 1;

create table public.students (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null default public.current_gym_id() references public.gyms (id) on delete restrict,
  user_id uuid unique references auth.users (id) on delete set null,
  enrollment_code text not null default ('CB' || lpad(nextval('public.student_code_seq')::text, 5, '0')),
  full_name text not null,
  cpf text,
  email text,
  phone text,
  birth_date date,
  gender text check (gender is null or gender in ('feminino', 'masculino', 'outro', 'nao_informado')),
  address text,
  photo_path text,
  objective text,
  start_date date not null default current_date,
  due_day smallint not null default 10 check (due_day between 1 and 28),
  status public.student_status not null default 'ativo',
  emergency_contact_name text,
  emergency_contact_phone text,
  lgpd_consent_at timestamptz,
  health_consent_at timestamptz,
  notifications_opt_in boolean not null default false,
  notes text,
  archived_at timestamptz,
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gym_id, enrollment_code)
);
create unique index students_gym_cpf_uidx on public.students (gym_id, cpf) where cpf is not null;
create index students_gym_status_idx on public.students (gym_id, status);
create index students_name_idx on public.students using gin (to_tsvector('simple', full_name));

-- Dados de saúde (dado pessoal sensível — LGPD art. 11) ficam isolados
-- com política de acesso mais restrita.
create table public.student_health (
  student_id uuid primary key references public.students (id) on delete cascade,
  gym_id uuid not null default public.current_gym_id() references public.gyms (id) on delete restrict,
  medical_conditions text,
  medications text,
  injuries text,
  restrictions text,
  physician_clearance boolean not null default false,
  updated_at timestamptz not null default now()
);

create or replace function public.current_student_id()
returns uuid
language sql stable security definer set search_path = public
as $$ select id from public.students where user_id = auth.uid() $$;

-- ---------------------------------------------------------------------
-- Matrículas (vínculo aluno x plano)
-- ---------------------------------------------------------------------
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null default public.current_gym_id() references public.gyms (id) on delete restrict,
  student_id uuid not null references public.students (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete restrict,
  start_date date not null,
  end_date date,
  price numeric(10,2) not null check (price >= 0),
  discount numeric(10,2) not null default 0 check (discount >= 0),
  status public.membership_status not null default 'ativa',
  auto_renew boolean not null default true,
  canceled_at timestamptz,
  cancel_reason text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount <= price),
  check (end_date is null or end_date >= start_date)
);
create index memberships_student_idx on public.memberships (student_id);
create index memberships_gym_status_idx on public.memberships (gym_id, status);
-- No máximo uma matrícula ativa por aluno
create unique index memberships_one_active_uidx on public.memberships (student_id) where status = 'ativa';

-- ---------------------------------------------------------------------
-- Mensalidades / cobranças
-- ---------------------------------------------------------------------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null default public.current_gym_id() references public.gyms (id) on delete restrict,
  student_id uuid not null references public.students (id) on delete restrict,
  membership_id uuid references public.memberships (id) on delete set null,
  description text not null,
  reference_month date not null check (extract(day from reference_month) = 1),
  due_date date not null,
  amount numeric(10,2) not null check (amount >= 0),
  discount numeric(10,2) not null default 0 check (discount >= 0),
  fine numeric(10,2) not null default 0 check (fine >= 0),
  interest numeric(10,2) not null default 0 check (interest >= 0),
  status public.invoice_status not null default 'pendente',
  paid_at timestamptz,
  renegotiated_from uuid references public.invoices (id) on delete set null,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount <= amount + fine + interest)
);
create index invoices_gym_due_idx on public.invoices (gym_id, due_date);
create index invoices_student_idx on public.invoices (student_id);
create index invoices_status_idx on public.invoices (gym_id, status);
-- Impede gerar duas cobranças da mesma matrícula para a mesma competência
create unique index invoices_membership_month_uidx on public.invoices (membership_id, reference_month)
  where membership_id is not null and status in ('pendente', 'pago');

-- ---------------------------------------------------------------------
-- Pagamentos
-- ---------------------------------------------------------------------
create sequence public.receipt_number_seq start 1000;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null default public.current_gym_id() references public.gyms (id) on delete restrict,
  invoice_id uuid references public.invoices (id) on delete restrict,
  student_id uuid references public.students (id) on delete restrict,
  amount numeric(10,2) not null check (amount > 0),
  method public.payment_method not null,
  paid_at timestamptz not null default now(),
  receipt_number bigint not null default nextval('public.receipt_number_seq') unique,
  received_by uuid default auth.uid(),
  notes text,
  -- Preparação para integração futura com gateway (não implementada)
  gateway text,
  gateway_reference text,
  reversed_at timestamptz,
  reversal_reason text,
  created_at timestamptz not null default now()
);
create index payments_gym_paid_idx on public.payments (gym_id, paid_at);
create index payments_invoice_idx on public.payments (invoice_id);
create index payments_student_idx on public.payments (student_id);

-- ---------------------------------------------------------------------
-- Financeiro
-- ---------------------------------------------------------------------
create table public.financial_categories (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null default public.current_gym_id() references public.gyms (id) on delete restrict,
  name text not null,
  type public.tx_type not null,
  nature public.cost_nature not null default 'variavel',
  -- Agrupamento usado no DRE gerencial
  dre_group text not null default 'despesa_fixa' check (dre_group in
    ('receita_operacional', 'outras_receitas', 'impostos', 'custo_variavel', 'despesa_fixa', 'investimento')),
  color text,
  is_system boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (gym_id, type, name)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null default public.current_gym_id() references public.gyms (id) on delete restrict,
  name text not null,
  document text,
  email text,
  phone text,
  category text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.investments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null default public.current_gym_id() references public.gyms (id) on delete restrict,
  name text not null,
  kind public.investment_kind not null,
  amount numeric(12,2) not null check (amount > 0),
  invested_at date,
  expected_monthly_return numeric(12,2) not null default 0,
  expected_monthly_cost numeric(12,2) not null default 0,
  useful_life_months smallint check (useful_life_months is null or useful_life_months > 0),
  status public.investment_status not null default 'planejado',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null default public.current_gym_id() references public.gyms (id) on delete restrict,
  type public.tx_type not null,
  category_id uuid not null references public.financial_categories (id) on delete restrict,
  supplier_id uuid references public.suppliers (id) on delete set null,
  student_id uuid references public.students (id) on delete set null,
  payment_id uuid unique references public.payments (id) on delete cascade,
  investment_id uuid references public.investments (id) on delete set null,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  competence_date date not null,
  due_date date not null,
  paid_date date,
  status public.tx_status not null default 'pendente',
  nature public.cost_nature,
  payment_method public.payment_method,
  document_number text,
  recurrence_group uuid,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'pago') = (paid_date is not null))
);
create index transactions_gym_due_idx on public.transactions (gym_id, due_date);
create index transactions_gym_paid_idx on public.transactions (gym_id, paid_date) where status = 'pago';
create index transactions_category_idx on public.transactions (category_id);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null default public.current_gym_id() references public.gyms (id) on delete restrict,
  category_id uuid not null references public.financial_categories (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (gym_id, category_id, month)
);

-- ---------------------------------------------------------------------
-- Treinos
-- ---------------------------------------------------------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null default public.current_gym_id() references public.gyms (id) on delete restrict,
  name text not null,
  muscle_group text not null,
  equipment text not null,
  instructions text,
  video_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (gym_id, name)
);

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null default public.current_gym_id() references public.gyms (id) on delete restrict,
  student_id uuid not null references public.students (id) on delete cascade,
  teacher_id uuid references public.staff (id) on delete set null,
  title text not null,
  goal text,
  start_date date not null default current_date,
  end_date date,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workout_plans_student_idx on public.workout_plans (student_id);

create table public.workout_divisions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null default public.current_gym_id() references public.gyms (id) on delete restrict,
  plan_id uuid not null references public.workout_plans (id) on delete cascade,
  label text not null,
  name text,
  position smallint not null default 0
);
create index workout_divisions_plan_idx on public.workout_divisions (plan_id);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null default public.current_gym_id() references public.gyms (id) on delete restrict,
  division_id uuid not null references public.workout_divisions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position smallint not null default 0,
  sets smallint not null check (sets between 1 and 20),
  reps text not null,
  load_kg numeric(6,2) check (load_kg is null or load_kg >= 0),
  rest_seconds smallint check (rest_seconds is null or rest_seconds between 0 and 900),
  notes text
);
create index workout_exercises_division_idx on public.workout_exercises (division_id);

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null default public.current_gym_id() references public.gyms (id) on delete restrict,
  student_id uuid not null references public.students (id) on delete cascade,
  workout_exercise_id uuid references public.workout_exercises (id) on delete set null,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  performed_on date not null default current_date,
  sets_done smallint check (sets_done is null or sets_done between 0 and 50),
  reps_done text,
  load_kg numeric(6,2) check (load_kg is null or load_kg >= 0),
  notes text,
  created_at timestamptz not null default now()
);
create index workout_logs_student_idx on public.workout_logs (student_id, performed_on);

-- ---------------------------------------------------------------------
-- Frequência
-- ---------------------------------------------------------------------
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null default public.current_gym_id() references public.gyms (id) on delete restrict,
  student_id uuid not null references public.students (id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  method public.checkin_method not null,
  registered_by uuid default auth.uid(),
  notes text
);
create index checkins_gym_time_idx on public.checkins (gym_id, checked_in_at);
create index checkins_student_idx on public.checkins (student_id, checked_in_at);

-- ---------------------------------------------------------------------
-- Agenda
-- ---------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null default public.current_gym_id() references public.gyms (id) on delete restrict,
  title text not null,
  kind public.event_kind not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  staff_id uuid references public.staff (id) on delete set null,
  student_id uuid references public.students (id) on delete cascade,
  location text,
  capacity smallint check (capacity is null or capacity > 0),
  description text,
  status public.event_status not null default 'agendado',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index events_gym_time_idx on public.events (gym_id, starts_at);

create table public.event_attendees (
  event_id uuid not null references public.events (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  gym_id uuid not null default public.current_gym_id() references public.gyms (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (event_id, student_id)
);

-- ---------------------------------------------------------------------
-- Notificações internas (sem envio externo)
-- ---------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  audience text not null check (audience in ('staff', 'student')),
  student_id uuid references public.students (id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (audience = 'staff' or student_id is not null)
);
create unique index notifications_dedupe_uidx on public.notifications (gym_id, dedupe_key) where dedupe_key is not null;
create index notifications_gym_idx on public.notifications (gym_id, created_at desc);

-- ---------------------------------------------------------------------
-- Auditoria e relatórios
-- ---------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  gym_id uuid,
  actor_id uuid,
  actor_role public.app_role,
  action text not null,
  table_name text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_gym_idx on public.audit_logs (gym_id, created_at desc);

create table public.report_exports (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null default public.current_gym_id() references public.gyms (id) on delete cascade,
  report_type text not null,
  format text not null check (format in ('pdf', 'xlsx', 'csv')),
  params jsonb not null default '{}'::jsonb,
  generated_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
