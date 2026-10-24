-- =====================================================================
-- Migration 5: agregações para o dashboard (SECURITY INVOKER / RLS)
-- =====================================================================

create or replace function public.fin_totals(p_from date, p_to date)
returns table (
  income_paid numeric, expense_paid numeric,
  income_pending numeric, expense_pending numeric,
  tuition_received numeric, paying_students bigint,
  billed_amount numeric, overdue_in_period numeric,
  overdue_total numeric, overdue_invoices bigint
) language sql stable security invoker set search_path = public as $$
  select
    coalesce((select sum(amount) from public.transactions where type = 'receita' and status = 'pago'
               and paid_date between p_from and p_to), 0),
    coalesce((select sum(amount) from public.transactions where type = 'despesa' and status = 'pago'
               and paid_date between p_from and p_to), 0),
    coalesce((select sum(amount) from public.transactions where type = 'receita' and status = 'pendente'
               and due_date between p_from and p_to), 0)
      + coalesce((select sum(public.invoice_total(i)) from public.invoices i where i.status = 'pendente'
               and i.due_date between p_from and p_to), 0),
    coalesce((select sum(amount) from public.transactions where type = 'despesa' and status = 'pendente'
               and due_date between p_from and p_to), 0),
    coalesce((select sum(amount) from public.payments where reversed_at is null
               and (paid_at at time zone 'America/Sao_Paulo')::date between p_from and p_to), 0),
    (select count(distinct student_id) from public.payments where reversed_at is null
               and (paid_at at time zone 'America/Sao_Paulo')::date between p_from and p_to),
    coalesce((select sum(public.invoice_total(i)) from public.invoices i where i.status in ('pendente', 'pago')
               and i.due_date between p_from and p_to), 0),
    coalesce((select sum(public.invoice_total(i)) from public.invoices i where i.status = 'pendente'
               and i.due_date between p_from and least(p_to, current_date - 1)), 0),
    coalesce((select sum(public.invoice_total(i)) from public.invoices i where i.status = 'pendente'
               and i.due_date < current_date), 0),
    (select count(*) from public.invoices i where i.status = 'pendente' and i.due_date < current_date)
$$;

-- Saldo de caixa em uma data: saldo inicial + entradas − saídas liquidadas
create or replace function public.cash_balance(p_at date default current_date)
returns numeric language sql stable security invoker set search_path = public as $$
  select g.opening_balance
    + coalesce((select sum(case when t.type = 'receita' then t.amount else -t.amount end)
                  from public.transactions t
                 where t.status = 'pago' and t.paid_date >= g.opening_balance_date and t.paid_date <= p_at), 0)
  from public.gyms g where g.id = public.current_gym_id()
$$;

-- Previsto x realizado por categoria em um mês
create or replace function public.budget_vs_actual(p_month date)
returns table (category_id uuid, category_name text, type public.tx_type, budget numeric, actual numeric)
language sql stable security invoker set search_path = public as $$
  select c.id, c.name, c.type,
         coalesce(b.amount, 0),
         coalesce((select sum(t.amount) from public.transactions t
                    where t.category_id = c.id and t.status <> 'cancelado'
                      and date_trunc('month', t.competence_date) = date_trunc('month', p_month)), 0)
    from public.financial_categories c
    left join public.budgets b on b.category_id = c.id and b.month = date_trunc('month', p_month)::date
   where c.active
   order by c.type, c.name
$$;

revoke execute on function public.fin_totals(date, date) from anon;
revoke execute on function public.cash_balance(date) from anon;
revoke execute on function public.budget_vs_actual(date) from anon;

-- Registro do consentimento específico para dados de saúde (LGPD art. 11)
create or replace function public.record_health_consent(p_student uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_trainer() then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  update public.students set health_consent_at = now()
   where id = p_student and gym_id = public.current_gym_id() and health_consent_at is null;
end $$;
revoke execute on function public.record_health_consent(uuid) from public, anon;

-- Salva ficha de treino completa (plano + divisões + exercícios) em uma transação
create or replace function public.save_workout_plan(p_id uuid, p_data jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid := p_id;
  v_div jsonb;
  v_item jsonb;
  v_div_id uuid;
  v_pos int := 0;
  v_ipos int;
begin
  if not public.is_trainer() then
    raise exception 'Sem permissão para editar fichas.' using errcode = '42501';
  end if;
  if v_id is null then
    update public.workout_plans set active = false, end_date = coalesce(end_date, current_date)
     where student_id = (p_data ->> 'student_id')::uuid and active;
    insert into public.workout_plans (student_id, teacher_id, title, goal, start_date, end_date, notes)
    values ((p_data ->> 'student_id')::uuid, nullif(p_data ->> 'teacher_id', '')::uuid, p_data ->> 'title',
            p_data ->> 'goal', (p_data ->> 'start_date')::date, nullif(p_data ->> 'end_date', '')::date, p_data ->> 'notes')
    returning id into v_id;
  else
    update public.workout_plans set
      teacher_id = nullif(p_data ->> 'teacher_id', '')::uuid, title = p_data ->> 'title', goal = p_data ->> 'goal',
      start_date = (p_data ->> 'start_date')::date, end_date = nullif(p_data ->> 'end_date', '')::date, notes = p_data ->> 'notes'
    where id = v_id;
    if not found then raise exception 'Ficha não encontrada.'; end if;
    delete from public.workout_divisions where plan_id = v_id;
  end if;

  for v_div in select * from jsonb_array_elements(p_data -> 'divisions') loop
    insert into public.workout_divisions (plan_id, label, name, position)
    values (v_id, v_div ->> 'label', v_div ->> 'name', v_pos) returning id into v_div_id;
    v_pos := v_pos + 1;
    v_ipos := 0;
    for v_item in select * from jsonb_array_elements(v_div -> 'items') loop
      insert into public.workout_exercises (division_id, exercise_id, position, sets, reps, load_kg, rest_seconds, notes)
      values (v_div_id, (v_item ->> 'exercise_id')::uuid, v_ipos, (v_item ->> 'sets')::smallint, v_item ->> 'reps',
              nullif(v_item ->> 'load_kg', '')::numeric, nullif(v_item ->> 'rest_seconds', '')::smallint, v_item ->> 'notes');
      v_ipos := v_ipos + 1;
    end loop;
  end loop;
  return v_id;
end $$;
revoke execute on function public.save_workout_plan(uuid, jsonb) from anon;
