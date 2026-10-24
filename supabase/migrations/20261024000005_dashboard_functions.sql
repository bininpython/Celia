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
