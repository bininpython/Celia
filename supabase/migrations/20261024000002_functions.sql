-- =====================================================================
-- Migration 2: funções, gatilhos e regras de negócio no banco
-- =====================================================================

-- ---------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['gyms','profiles','staff','plans','students','memberships','invoices',
                           'suppliers','investments','transactions','workout_plans','events']
  loop
    execute format('create trigger %I_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Dados padrão de cada academia (categorias financeiras de sistema)
-- ---------------------------------------------------------------------
create or replace function public.seed_gym_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.financial_categories (gym_id, name, type, nature, dre_group, is_system, color) values
    (new.id, 'Mensalidades',            'receita', 'fixa',     'receita_operacional', true,  '#FF651C'),
    (new.id, 'Avaliações e serviços',   'receita', 'variavel', 'receita_operacional', false, '#F59E0B'),
    (new.id, 'Venda de produtos',       'receita', 'variavel', 'outras_receitas',     false, '#10B981'),
    (new.id, 'Outras receitas',         'receita', 'variavel', 'outras_receitas',     false, '#6366F1'),
    (new.id, 'Aluguel',                 'despesa', 'fixa',     'despesa_fixa',        false, '#334155'),
    (new.id, 'Salários e encargos',     'despesa', 'fixa',     'despesa_fixa',        false, '#475569'),
    (new.id, 'Energia elétrica',        'despesa', 'variavel', 'custo_variavel',      false, '#EAB308'),
    (new.id, 'Água',                    'despesa', 'variavel', 'custo_variavel',      false, '#0EA5E9'),
    (new.id, 'Internet e telefone',     'despesa', 'fixa',     'despesa_fixa',        false, '#64748B'),
    (new.id, 'Manutenção de equipamentos','despesa','variavel','custo_variavel',      false, '#A855F7'),
    (new.id, 'Limpeza e materiais',     'despesa', 'variavel', 'custo_variavel',      false, '#14B8A6'),
    (new.id, 'Marketing e publicidade', 'despesa', 'variavel', 'custo_variavel',      false, '#EC4899'),
    (new.id, 'Sistemas e softwares',    'despesa', 'fixa',     'despesa_fixa',        false, '#8B5CF6'),
    (new.id, 'Contabilidade',           'despesa', 'fixa',     'despesa_fixa',        false, '#78716C'),
    (new.id, 'Taxas bancárias e de cartão','despesa','variavel','custo_variavel',     false, '#F97316'),
    (new.id, 'Impostos',                'despesa', 'variavel', 'impostos',            true,  '#DC2626'),
    (new.id, 'Investimentos',           'despesa', 'variavel', 'investimento',        true,  '#0F766E');
  return new;
end $$;

create trigger gyms_seed_defaults after insert on public.gyms
  for each row execute function public.seed_gym_defaults();

-- ---------------------------------------------------------------------
-- Criação de perfil a cada novo usuário do Supabase Auth.
-- Papel e academia vêm de raw_app_meta_data (definido apenas pelo
-- servidor com a service role). O primeiro usuário do sistema vira admin.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_gym uuid;
  v_role public.app_role;
  v_student uuid;
begin
  v_gym := nullif(new.raw_app_meta_data ->> 'gym_id', '')::uuid;
  if v_gym is null then
    select id into v_gym from public.gyms order by created_at limit 1;
  end if;
  if v_gym is null then
    raise exception 'Nenhuma academia cadastrada. Execute o seed antes de criar usuários.';
  end if;

  if not exists (select 1 from public.profiles) then
    v_role := 'admin';
  else
    v_role := coalesce(nullif(new.raw_app_meta_data ->> 'role', '')::public.app_role, 'aluno');
  end if;

  insert into public.profiles (id, gym_id, full_name, email, role)
  values (new.id, v_gym,
          coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
          new.email, v_role);

  v_student := nullif(new.raw_app_meta_data ->> 'student_id', '')::uuid;
  if v_role = 'aluno' and v_student is not null then
    update public.students set user_id = new.id where id = v_student and gym_id = v_gym and user_id is null;
  end if;

  if v_role <> 'aluno' and nullif(new.raw_app_meta_data ->> 'staff_id', '') is not null then
    update public.staff set profile_id = new.id
     where id = (new.raw_app_meta_data ->> 'staff_id')::uuid and gym_id = v_gym;
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Usuários comuns não podem alterar o próprio papel, academia ou status.
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.has_any_role(array['admin']::public.app_role[]) then
    if new.role is distinct from old.role or new.gym_id is distinct from old.gym_id
       or new.active is distinct from old.active then
      raise exception 'Apenas administradores podem alterar papel, academia ou status de usuários.'
        using errcode = '42501';
    end if;
  end if;
  if new.id = auth.uid() and old.role = 'admin' and (new.role <> 'admin' or not new.active) then
    if not exists (select 1 from public.profiles
                    where gym_id = old.gym_id and role = 'admin' and active and id <> old.id) then
      raise exception 'A academia precisa de pelo menos um administrador ativo.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ---------------------------------------------------------------------
-- Trilha de auditoria genérica
-- ---------------------------------------------------------------------
create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end;
  v_gym uuid := coalesce((v_new ->> 'gym_id')::uuid, (v_old ->> 'gym_id')::uuid);
  v_id text := coalesce(v_new ->> 'id', v_old ->> 'id', v_new ->> 'student_id', v_old ->> 'student_id');
begin
  -- Dados de saúde: registra apenas que houve alteração, sem o conteúdo (LGPD).
  if tg_table_name = 'student_health' then
    v_old := null; v_new := null;
  end if;
  insert into public.audit_logs (gym_id, actor_id, actor_role, action, table_name, record_id, old_data, new_data)
  values (v_gym, auth.uid(), public.auth_role(), tg_op, tg_table_name, v_id, v_old, v_new);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['gyms','profiles','staff','plans','students','student_health','memberships',
                           'invoices','payments','financial_categories','suppliers','transactions',
                           'budgets','investments','workout_plans','events']
  loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I
                    for each row execute function public.audit_trigger()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Pagamentos -> mensalidade + livro-caixa
-- ---------------------------------------------------------------------
create or replace function public.invoice_total(i public.invoices)
returns numeric language sql immutable as $$
  select round(i.amount - i.discount + i.fine + i.interest, 2)
$$;

create or replace function public.recompute_invoice_status(p_invoice uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_inv public.invoices;
  v_paid numeric;
  v_last timestamptz;
begin
  select * into v_inv from public.invoices where id = p_invoice for update;
  if not found or v_inv.status in ('cancelado', 'renegociado') then
    return;
  end if;
  select coalesce(sum(amount), 0), max(paid_at) into v_paid, v_last
    from public.payments where invoice_id = p_invoice and reversed_at is null;
  if v_paid >= public.invoice_total(v_inv) and v_paid > 0 then
    update public.invoices set status = 'pago', paid_at = v_last where id = p_invoice;
  else
    update public.invoices set status = 'pendente', paid_at = null where id = p_invoice;
  end if;
end $$;

create or replace function public.on_payment_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_cat uuid;
  v_name text;
  v_student uuid;
begin
  if tg_op = 'INSERT' then
    v_student := new.student_id;

    select id into v_cat from public.financial_categories
     where gym_id = new.gym_id and type = 'receita' and name = 'Mensalidades' and is_system limit 1;
    select full_name into v_name from public.students where id = v_student;

    insert into public.transactions (gym_id, type, category_id, student_id, payment_id, description, amount,
                                     competence_date, due_date, paid_date, status, nature, payment_method, document_number,
                                     created_by)
    values (new.gym_id, 'receita', v_cat, v_student, new.id,
            'Recebimento ' || coalesce(v_name, 'avulso') || ' — recibo nº ' || new.receipt_number,
            new.amount,
            coalesce((select reference_month from public.invoices where id = new.invoice_id), (new.paid_at at time zone 'America/Sao_Paulo')::date),
            (new.paid_at at time zone 'America/Sao_Paulo')::date,
            (new.paid_at at time zone 'America/Sao_Paulo')::date,
            'pago', 'fixa', new.method, new.receipt_number::text, new.received_by);

    if new.invoice_id is not null then
      perform public.recompute_invoice_status(new.invoice_id);
    end if;
  elsif tg_op = 'UPDATE' then
    if new.reversed_at is not null and old.reversed_at is null then
      update public.transactions set status = 'cancelado', paid_date = null,
             notes = coalesce(notes || ' | ', '') || 'Estornado: ' || coalesce(new.reversal_reason, '')
       where payment_id = new.id;
      if new.invoice_id is not null then
        perform public.recompute_invoice_status(new.invoice_id);
      end if;
    elsif new.amount is distinct from old.amount or new.method is distinct from old.method
       or new.invoice_id is distinct from old.invoice_id or new.paid_at is distinct from old.paid_at then
      raise exception 'Pagamentos não podem ser editados. Estorne e registre novamente.';
    end if;
  end if;
  return null;
end $$;

create trigger payments_after_change after insert or update on public.payments
  for each row execute function public.on_payment_change();

create or replace function public.before_payment_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_inv public.invoices;
begin
  if new.invoice_id is not null then
    select * into v_inv from public.invoices where id = new.invoice_id;
    if not found or v_inv.gym_id <> new.gym_id then
      raise exception 'Mensalidade não encontrada.';
    end if;
    if v_inv.status <> 'pendente' then
      raise exception 'Esta mensalidade não está pendente (situação: %).', v_inv.status;
    end if;
    if new.student_id is null then
      new.student_id := v_inv.student_id;
    elsif new.student_id <> v_inv.student_id then
      raise exception 'O pagamento não pertence ao aluno da mensalidade.';
    end if;
  end if;
  return new;
end $$;

create trigger payments_before_insert before insert on public.payments
  for each row execute function public.before_payment_insert();

-- ---------------------------------------------------------------------
-- Check-in: valida situação do aluno e evita duplicidade
-- ---------------------------------------------------------------------
create or replace function public.validate_checkin()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_status public.student_status;
begin
  if auth.uid() is not null and not public.is_staff() then
    raise exception 'Check-in deve ser registrado pela equipe.' using errcode = '42501';
  end if;
  select status into v_status from public.students where id = new.student_id and gym_id = new.gym_id;
  if v_status is null then
    raise exception 'Aluno não encontrado.';
  elsif v_status <> 'ativo' then
    raise exception 'Check-in bloqueado: aluno com situação "%".', v_status using errcode = 'P0001';
  end if;
  if exists (select 1 from public.checkins
              where student_id = new.student_id
                and checked_in_at > new.checked_in_at - interval '30 minutes'
                and checked_in_at <= new.checked_in_at + interval '30 minutes') then
    raise exception 'Check-in já registrado para este aluno nos últimos 30 minutos.' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger checkins_validate before insert on public.checkins
  for each row execute function public.validate_checkin();

-- ---------------------------------------------------------------------
-- Geração de mensalidades da competência (respeita RLS do chamador)
-- ---------------------------------------------------------------------
create or replace function public.generate_invoices(p_month date)
returns integer language plpgsql security invoker set search_path = public as $$
declare
  v_month date := date_trunc('month', p_month)::date;
  v_count integer;
begin
  if not public.has_any_role(array['admin','gerente','recepcionista']::public.app_role[]) then
    raise exception 'Sem permissão para gerar mensalidades.' using errcode = '42501';
  end if;

  with eligible as (
    select m.id as membership_id, m.student_id, m.price, m.discount, p.name as plan_name,
           p.duration_months, s.due_day, m.gym_id
      from public.memberships m
      join public.plans p on p.id = m.plan_id
      join public.students s on s.id = m.student_id
     where m.gym_id = public.current_gym_id()
       and m.status = 'ativa'
       and s.status = 'ativo'
       and date_trunc('month', m.start_date) <= v_month
       and (m.end_date is null or m.end_date >= v_month)
       and ((extract(year from age(v_month, date_trunc('month', m.start_date)::date)) * 12
            + extract(month from age(v_month, date_trunc('month', m.start_date)::date)))::int
            % p.duration_months = 0)
  ), ins as (
    insert into public.invoices (gym_id, student_id, membership_id, description, reference_month,
                                 due_date, amount, discount)
    select e.gym_id, e.student_id, e.membership_id,
           'Plano ' || e.plan_name || ' — ' || to_char(v_month, 'MM/YYYY'),
           v_month,
           make_date(extract(year from v_month)::int, extract(month from v_month)::int, e.due_day),
           e.price, e.discount
      from eligible e
     where not exists (select 1 from public.invoices i
                        where i.membership_id = e.membership_id and i.reference_month = v_month
                          and i.status in ('pendente', 'pago', 'renegociado'))
    returning 1
  )
  select count(*) into v_count from ins;
  return v_count;
end $$;

-- ---------------------------------------------------------------------
-- Renegociação: substitui mensalidades em aberto por novas parcelas
-- ---------------------------------------------------------------------
create or replace function public.renegotiate_invoices(
  p_invoice_ids uuid[], p_installments integer, p_first_due date, p_total numeric, p_notes text default null)
returns setof public.invoices language plpgsql security invoker set search_path = public as $$
declare
  v_student uuid;
  v_students integer;
  v_open integer;
  v_part numeric;
  v_last numeric;
  i integer;
  v_origin uuid := p_invoice_ids[1];
begin
  if not public.has_any_role(array['admin','gerente']::public.app_role[]) then
    raise exception 'Somente administradores e gerentes podem renegociar.' using errcode = '42501';
  end if;
  if p_installments < 1 or p_installments > 24 then
    raise exception 'Quantidade de parcelas inválida (1 a 24).';
  end if;
  if p_total <= 0 then
    raise exception 'Valor total inválido.';
  end if;

  select count(distinct student_id), min(student_id::text)::uuid,
         count(*) filter (where status = 'pendente')
    into v_students, v_student, v_open
    from public.invoices where id = any (p_invoice_ids);

  if v_students <> 1 then
    raise exception 'Selecione mensalidades de um único aluno.';
  end if;
  if v_open <> array_length(p_invoice_ids, 1) then
    raise exception 'Apenas mensalidades pendentes podem ser renegociadas.';
  end if;

  update public.invoices set status = 'renegociado',
         notes = coalesce(notes || ' | ', '') || 'Renegociada em ' || to_char(current_date, 'DD/MM/YYYY')
   where id = any (p_invoice_ids);

  v_part := round(p_total / p_installments, 2);
  v_last := p_total - v_part * (p_installments - 1);
  for i in 1 .. p_installments loop
    return query
    insert into public.invoices (student_id, description, reference_month, due_date, amount,
                                 renegotiated_from, notes)
    values (v_student,
            'Renegociação — parcela ' || i || '/' || p_installments,
            date_trunc('month', (p_first_due + make_interval(months => i - 1)))::date,
            (p_first_due + make_interval(months => i - 1))::date,
            case when i = p_installments then v_last else v_part end,
            v_origin, p_notes)
    returning *;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- LGPD: anonimização mantendo registros financeiros obrigatórios
-- ---------------------------------------------------------------------
create or replace function public.anonymize_student(p_student uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_gym uuid;
begin
  if not public.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'Somente administradores podem anonimizar alunos.' using errcode = '42501';
  end if;
  select gym_id into v_gym from public.students where id = p_student;
  if v_gym is distinct from public.current_gym_id() then
    raise exception 'Aluno não encontrado.';
  end if;

  delete from public.student_health where student_id = p_student;
  delete from public.workout_logs where student_id = p_student;
  delete from public.notifications where student_id = p_student;
  update public.students set
    full_name = 'Aluno anonimizado ' || left(id::text, 8),
    cpf = null, email = null, phone = null, birth_date = null, gender = null, address = null,
    photo_path = null, objective = null, emergency_contact_name = null, emergency_contact_phone = null,
    notes = null, user_id = null, notifications_opt_in = false,
    status = 'arquivado', archived_at = coalesce(archived_at, now()), anonymized_at = now()
  where id = p_student;
end $$;

-- ---------------------------------------------------------------------
-- Notificações internas de vencimento, atraso e ausência
-- Pode ser chamada pela equipe ou agendada (pg_cron) — ver docs.
-- ---------------------------------------------------------------------
create or replace function public.generate_notifications(p_gym uuid default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_gym uuid := coalesce(p_gym, public.current_gym_id());
  v_alert smallint;
  v_absence smallint;
  v_count integer := 0;
  v_n integer;
begin
  -- Quando chamada por usuário autenticado, exige perfil da equipe da mesma academia.
  if auth.uid() is not null and (not public.is_staff() or v_gym is distinct from public.current_gym_id()) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  select due_alert_days, absence_alert_days into v_alert, v_absence from public.gyms where id = v_gym;
  if v_alert is null then
    raise exception 'Academia não encontrada.';
  end if;

  -- Vencimentos próximos (equipe)
  insert into public.notifications (gym_id, audience, kind, title, body, link, dedupe_key)
  select v_gym, 'staff', 'vencimento',
         'Mensalidade vence em breve',
         s.full_name || ' — vencimento ' || to_char(i.due_date, 'DD/MM/YYYY'),
         '/alunos/' || s.id, 'due-staff-' || i.id
    from public.invoices i join public.students s on s.id = i.student_id
   where i.gym_id = v_gym and i.status = 'pendente'
     and i.due_date between current_date and current_date + v_alert
  on conflict (gym_id, dedupe_key) where dedupe_key is not null do nothing;
  get diagnostics v_n = row_count; v_count := v_count + v_n;

  -- Vencimentos próximos (aluno, apenas com consentimento)
  insert into public.notifications (gym_id, audience, student_id, kind, title, body, link, dedupe_key)
  select v_gym, 'student', s.id, 'vencimento',
         'Sua mensalidade vence em breve',
         'Vencimento em ' || to_char(i.due_date, 'DD/MM/YYYY'),
         '/portal/mensalidades', 'due-student-' || i.id
    from public.invoices i join public.students s on s.id = i.student_id
   where i.gym_id = v_gym and i.status = 'pendente' and s.notifications_opt_in
     and i.due_date between current_date and current_date + v_alert
  on conflict (gym_id, dedupe_key) where dedupe_key is not null do nothing;
  get diagnostics v_n = row_count; v_count := v_count + v_n;

  -- Mensalidades em atraso (equipe)
  insert into public.notifications (gym_id, audience, kind, title, body, link, dedupe_key)
  select v_gym, 'staff', 'atraso',
         'Mensalidade em atraso',
         s.full_name || ' — venceu em ' || to_char(i.due_date, 'DD/MM/YYYY'),
         '/alunos/' || s.id, 'overdue-staff-' || i.id
    from public.invoices i join public.students s on s.id = i.student_id
   where i.gym_id = v_gym and i.status = 'pendente' and i.due_date < current_date
  on conflict (gym_id, dedupe_key) where dedupe_key is not null do nothing;
  get diagnostics v_n = row_count; v_count := v_count + v_n;

  -- Alunos ativos ausentes (risco de abandono), uma vez por semana
  insert into public.notifications (gym_id, audience, kind, title, body, link, dedupe_key)
  select v_gym, 'staff', 'ausencia',
         'Aluno ausente',
         s.full_name || ' sem check-in há mais de ' || v_absence || ' dias',
         '/alunos/' || s.id, 'absence-' || s.id || '-' || to_char(current_date, 'IYYY-IW')
    from public.students s
   where s.gym_id = v_gym and s.status = 'ativo' and s.start_date < current_date - v_absence
     and not exists (select 1 from public.checkins c where c.student_id = s.id
                      and c.checked_in_at > now() - make_interval(days => v_absence))
  on conflict (gym_id, dedupe_key) where dedupe_key is not null do nothing;
  get diagnostics v_n = row_count; v_count := v_count + v_n;

  return v_count;
end $$;

-- ---------------------------------------------------------------------
-- Funções analíticas (SECURITY INVOKER: respeitam RLS do chamador)
-- ---------------------------------------------------------------------
create or replace function public.fin_monthly(p_from date, p_to date)
returns table (
  month date,
  income_paid numeric, expense_paid numeric,
  income_pending numeric, expense_pending numeric,
  income_competence numeric, expense_competence numeric
) language sql stable security invoker set search_path = public as $$
  with months as (
    select generate_series(date_trunc('month', p_from), date_trunc('month', p_to), interval '1 month')::date as month
  )
  select m.month,
    coalesce((select sum(t.amount) from public.transactions t where t.type = 'receita' and t.status = 'pago'
               and date_trunc('month', t.paid_date) = m.month), 0),
    coalesce((select sum(t.amount) from public.transactions t where t.type = 'despesa' and t.status = 'pago'
               and date_trunc('month', t.paid_date) = m.month), 0),
    coalesce((select sum(t.amount) from public.transactions t where t.type = 'receita' and t.status = 'pendente'
               and date_trunc('month', t.due_date) = m.month), 0)
    + coalesce((select sum(public.invoice_total(i)) from public.invoices i where i.status = 'pendente'
               and date_trunc('month', i.due_date) = m.month), 0),
    coalesce((select sum(t.amount) from public.transactions t where t.type = 'despesa' and t.status = 'pendente'
               and date_trunc('month', t.due_date) = m.month), 0),
    coalesce((select sum(t.amount) from public.transactions t where t.type = 'receita' and t.status <> 'cancelado'
               and date_trunc('month', t.competence_date) = m.month), 0),
    coalesce((select sum(t.amount) from public.transactions t where t.type = 'despesa' and t.status <> 'cancelado'
               and date_trunc('month', t.competence_date) = m.month), 0)
  from months m
  order by m.month
$$;

create or replace function public.fin_by_category(p_from date, p_to date, p_basis text default 'caixa')
returns table (category_id uuid, category_name text, type public.tx_type, nature public.cost_nature,
               dre_group text, color text, total numeric)
language sql stable security invoker set search_path = public as $$
  select c.id, c.name, c.type, c.nature, c.dre_group, c.color, sum(t.amount)
    from public.transactions t
    join public.financial_categories c on c.id = t.category_id
   where case when p_basis = 'competencia'
              then t.status <> 'cancelado' and t.competence_date between p_from and p_to
              else t.status = 'pago' and t.paid_date between p_from and p_to end
   group by c.id, c.name, c.type, c.nature, c.dre_group, c.color
   order by sum(t.amount) desc
$$;

create or replace function public.student_counts()
returns table (ativos bigint, suspensos bigint, inativos bigint, arquivados bigint, inadimplentes bigint)
language sql stable security invoker set search_path = public as $$
  select
    count(*) filter (where status = 'ativo'),
    count(*) filter (where status = 'suspenso'),
    count(*) filter (where status = 'inativo'),
    count(*) filter (where status = 'arquivado'),
    count(*) filter (where status <> 'arquivado' and exists (
      select 1 from public.invoices i where i.student_id = s.id and i.status = 'pendente' and i.due_date < current_date))
  from public.students s
$$;

create or replace function public.active_members_at(p_date date)
returns bigint language sql stable security invoker set search_path = public as $$
  select count(distinct m.student_id) from public.memberships m
   where m.start_date <= p_date
     and (m.end_date is null or m.end_date >= p_date)
     and (m.canceled_at is null or (m.canceled_at at time zone 'America/Sao_Paulo')::date > p_date)
$$;

create or replace function public.enrollments_monthly(p_from date, p_to date)
returns table (month date, new_students bigint, cancellations bigint)
language sql stable security invoker set search_path = public as $$
  with months as (
    select generate_series(date_trunc('month', p_from), date_trunc('month', p_to), interval '1 month')::date as month
  )
  select m.month,
    (select count(*) from public.students s where date_trunc('month', s.start_date) = m.month),
    (select count(*) from public.memberships ms where ms.status = 'cancelada'
       and date_trunc('month', ms.canceled_at at time zone 'America/Sao_Paulo') = m.month)
  from months m order by m.month
$$;

create or replace function public.checkins_daily(p_from date, p_to date)
returns table (day date, total bigint, unique_students bigint)
language sql stable security invoker set search_path = public as $$
  select (c.checked_in_at at time zone 'America/Sao_Paulo')::date as day, count(*), count(distinct c.student_id)
    from public.checkins c
   where (c.checked_in_at at time zone 'America/Sao_Paulo')::date between p_from and p_to
   group by 1 order by 1
$$;

create or replace function public.checkins_heatmap(p_from date, p_to date)
returns table (dow integer, hour integer, total bigint)
language sql stable security invoker set search_path = public as $$
  select extract(dow from c.checked_in_at at time zone 'America/Sao_Paulo')::int,
         extract(hour from c.checked_in_at at time zone 'America/Sao_Paulo')::int,
         count(*)
    from public.checkins c
   where (c.checked_in_at at time zone 'America/Sao_Paulo')::date between p_from and p_to
   group by 1, 2 order by 1, 2
$$;

create or replace function public.student_attendance(p_days integer default 30)
returns table (student_id uuid, full_name text, status public.student_status, phone text,
               last_checkin timestamptz, checkins_period bigint, days_since_last integer)
language sql stable security invoker set search_path = public as $$
  select s.id, s.full_name, s.status, s.phone,
         max(c.checked_in_at),
         count(c.id) filter (where c.checked_in_at > now() - make_interval(days => p_days)),
         (current_date - coalesce(max(c.checked_in_at)::date, s.start_date))::int
    from public.students s
    left join public.checkins c on c.student_id = s.id
   where s.status = 'ativo'
   group by s.id, s.full_name, s.status, s.phone, s.start_date
$$;

create or replace function public.plan_stats(p_from date, p_to date)
returns table (plan_id uuid, plan_name text, periodicity public.plan_periodicity, price numeric,
               duration_months smallint, active_memberships bigint, monthly_recurring numeric, received numeric)
language sql stable security invoker set search_path = public as $$
  select p.id, p.name, p.periodicity, p.price, p.duration_months,
         (select count(*) from public.memberships m where m.plan_id = p.id and m.status = 'ativa'),
         coalesce((select sum((m.price - m.discount) / p.duration_months) from public.memberships m
                    where m.plan_id = p.id and m.status = 'ativa'), 0),
         coalesce((select sum(pay.amount) from public.payments pay
                     join public.invoices i on i.id = pay.invoice_id
                     join public.memberships m on m.id = i.membership_id
                    where m.plan_id = p.id and pay.reversed_at is null
                      and (pay.paid_at at time zone 'America/Sao_Paulo')::date between p_from and p_to), 0)
    from public.plans p
   order by p.price
$$;
