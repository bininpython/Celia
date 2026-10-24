-- Testes de políticas RLS e regras de negócio.
-- Executado por scripts/test-db.sh em banco descartável.
\set ON_ERROR_STOP 1

-- Usuários (o primeiro vira admin automaticamente)
insert into auth.users (id, email, raw_user_meta_data) values
  ('10000000-0000-4000-8000-000000000001', 'admin@studio.test', '{"full_name":"Admin"}');
insert into auth.users (id, email, raw_app_meta_data) values
  ('10000000-0000-4000-8000-000000000002', 'recepcao@studio.test', '{"role":"recepcionista"}'),
  ('10000000-0000-4000-8000-000000000003', 'prof@studio.test', '{"role":"professor"}'),
  ('10000000-0000-4000-8000-000000000004', 'gerente@studio.test', '{"role":"gerente"}');

do $$ begin
  assert (select role from public.profiles where id = '10000000-0000-4000-8000-000000000001') = 'admin',
    'primeiro usuário deve ser admin';
  assert (select role from public.profiles where id = '10000000-0000-4000-8000-000000000002') = 'recepcionista',
    'papel vindo de app_metadata';
  assert (select count(*) from public.financial_categories) = 17, 'categorias padrão criadas';
end $$;

select id as aluguel_id from public.financial_categories where name = 'Aluguel' \gset

-- ------------------------------------------------------------------ recepção
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', false);

insert into public.students (id, full_name, cpf, due_day, start_date) values
  ('20000000-0000-4000-8000-00000000000a', 'Ana Souza', '11111111111', 5, date_trunc('month', current_date)::date - interval '2 months'),
  ('20000000-0000-4000-8000-00000000000b', 'Bruno Lima', '22222222222', 10, current_date - 40);

do $$ begin
  assert (select count(*) from public.students) = 2, 'recepção vê alunos';
  assert (select enrollment_code from public.students where full_name = 'Ana Souza') like 'CB%', 'código de matrícula';
  assert (select count(*) from public.transactions) = 0, 'recepção não vê financeiro';
  assert (select count(*) from public.student_health) = 0, 'recepção não vê saúde';
end $$;

select set_config('test.aluguel', :'aluguel_id', false);
do $$ begin
  insert into public.transactions (type, category_id, description, amount, competence_date, due_date)
  values ('despesa', current_setting('test.aluguel')::uuid, 'x', 10, current_date, current_date);
  raise exception 'recepção não deveria lançar despesas';
exception when insufficient_privilege then null;
end $$;

insert into public.memberships (student_id, plan_id, start_date, price, discount)
select '20000000-0000-4000-8000-00000000000a', id, date_trunc('month', current_date)::date - interval '2 months', 150, 10
  from public.plans where name = 'Mensal';
insert into public.memberships (student_id, plan_id, start_date, price)
select '20000000-0000-4000-8000-00000000000b', id, date_trunc('month', current_date)::date, 400
  from public.plans where name = 'Trimestral';

do $$ declare n int; begin
  n := public.generate_invoices(current_date);
  assert n = 2, format('esperava 2 mensalidades no mês, obteve %s', n);
  n := public.generate_invoices(current_date);
  assert n = 0, 'geração é idempotente';
  n := public.generate_invoices((current_date + interval '1 month')::date);
  assert n = 1, 'trimestral não cobra no mês seguinte';
  n := public.generate_invoices((current_date + interval '3 month')::date);
  assert n = 2, 'trimestral cobra 3 meses depois';
end $$;

do $$ begin
  assert (select amount - discount from public.invoices i
           where student_id = '20000000-0000-4000-8000-00000000000a'
             and reference_month = date_trunc('month', current_date)) = 140, 'valor com desconto';
end $$;

-- Pagamento quita mensalidade e gera receita no livro-caixa
insert into public.payments (invoice_id, amount, method)
select id, 140, 'pix' from public.invoices
 where student_id = '20000000-0000-4000-8000-00000000000a' and reference_month = date_trunc('month', current_date);

do $$ begin
  assert (select status from public.invoices where student_id = '20000000-0000-4000-8000-00000000000a'
           and reference_month = date_trunc('month', current_date)) = 'pago', 'mensalidade quitada';
  assert (select student_id from public.payments limit 1) = '20000000-0000-4000-8000-00000000000a',
    'aluno do pagamento preenchido pela mensalidade';
end $$;

do $$ begin
  insert into public.payments (invoice_id, amount, method)
  select id, 140, 'pix' from public.invoices
   where student_id = '20000000-0000-4000-8000-00000000000a' and reference_month = date_trunc('month', current_date);
  raise exception 'não deveria pagar mensalidade já quitada';
exception when raise_exception then
  if sqlerrm like 'não deveria%' then raise; end if;
end $$;

update public.students set notifications_opt_in = true where id = '20000000-0000-4000-8000-00000000000a';

-- Check-in e duplicidade
insert into public.checkins (student_id, method) values ('20000000-0000-4000-8000-00000000000a', 'recepcao');
do $$ begin
  insert into public.checkins (student_id, method) values ('20000000-0000-4000-8000-00000000000a', 'qrcode');
  raise exception 'check-in duplicado aceito';
exception when raise_exception then
  if sqlerrm not like 'Check-in já registrado%' then raise; end if;
end $$;

do $$ begin
  perform public.anonymize_student('20000000-0000-4000-8000-00000000000a');
  raise exception 'recepção não pode anonimizar';
exception when insufficient_privilege then null;
end $$;

-- ------------------------------------------------------------------ admin
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);

do $$ begin
  assert (select count(*) from public.transactions where type = 'receita' and status = 'pago') = 1,
    'receita gerada pelo pagamento';
  assert (select income_paid from public.fin_monthly(current_date, current_date)) = 140, 'fin_monthly receita';
  assert (select ativos from public.student_counts()) = 2, 'contagem de ativos';
  assert (select count(*) from public.audit_logs where table_name = 'payments') = 1, 'auditoria de pagamentos';
end $$;

-- Estorno reabre a mensalidade e cancela a receita
update public.payments set reversed_at = now(), reversal_reason = 'teste';
do $$ begin
  assert (select status from public.invoices where student_id = '20000000-0000-4000-8000-00000000000a'
           and reference_month = date_trunc('month', current_date)) = 'pendente', 'estorno reabre';
  assert (select status from public.transactions where payment_id is not null) = 'cancelado', 'estorno cancela receita';
end $$;

-- Renegociação
do $$ declare ids uuid[]; n int; begin
  select array_agg(id) into ids from public.invoices
   where student_id = '20000000-0000-4000-8000-00000000000a' and status = 'pendente';
  select count(*) into n from public.renegotiate_invoices(ids, 3, current_date + 2, 300);
  assert n = 3, 'três parcelas';
  assert (select sum(amount) from public.invoices where renegotiated_from is not null) = 300, 'soma das parcelas';
  assert (select count(*) from public.invoices where id = any (ids) and status = 'renegociado') = array_length(ids, 1),
    'originais marcadas como renegociadas';
end $$;

-- Lançamento de despesa pelo admin
insert into public.transactions (type, category_id, description, amount, competence_date, due_date, paid_date, status)
select 'despesa', id, 'Aluguel', 2000, current_date, current_date, current_date, 'pago'
  from public.financial_categories where name = 'Aluguel';
do $$ begin
  assert (select expense_paid from public.fin_monthly(current_date, current_date)) = 2000, 'despesa paga';
end $$;

do $$ declare n int; begin
  n := public.generate_notifications();
  assert n >= 1, 'gera notificações';
  assert public.generate_notifications() = 0, 'notificações deduplicadas';
end $$;

-- Usuário do aluno vinculado ao cadastro
reset role;
insert into auth.users (id, email, raw_app_meta_data) values
  ('10000000-0000-4000-8000-0000000000aa', 'ana@aluno.test',
   '{"role":"aluno","student_id":"20000000-0000-4000-8000-00000000000a"}');

-- ------------------------------------------------------------------ professor
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', false);
insert into public.student_health (student_id, injuries) values ('20000000-0000-4000-8000-00000000000a', 'Joelho');
insert into public.student_health (student_id, injuries) values ('20000000-0000-4000-8000-00000000000b', 'Ombro');

do $$ declare v_plan uuid; v_div uuid; begin
  assert (select count(*) from public.invoices) = 0, 'professor não vê mensalidades';
  insert into public.workout_plans (student_id, title) values ('20000000-0000-4000-8000-00000000000a', 'Hipertrofia')
    returning id into v_plan;
  insert into public.workout_divisions (plan_id, label, name) values (v_plan, 'A', 'Peito') returning id into v_div;
  insert into public.workout_exercises (division_id, exercise_id, sets, reps, load_kg)
  select v_div, id, 4, '10', 20 from public.exercises where name = 'Supino reto com barra';
end $$;

do $$ begin
  update public.students set status = 'suspenso' where id = '20000000-0000-4000-8000-00000000000b';
  assert not found, 'professor não altera cadastro';
end $$;

-- ------------------------------------------------------------------ aluno
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-0000000000aa', false);
do $$ begin
  assert (select count(*) from public.students) = 1, 'aluno vê apenas o próprio cadastro';
  assert (select count(*) from public.student_health) = 1, 'aluno vê apenas a própria saúde';
  assert (select count(*) from public.invoices where student_id <> public.current_student_id()) = 0,
    'aluno não vê mensalidades de outros';
  assert (select count(*) from public.workout_exercises) = 1, 'aluno vê a própria ficha';
  assert (select count(*) from public.transactions) = 0, 'aluno não vê financeiro';
  assert (select count(*) from public.audit_logs) = 0, 'aluno não vê auditoria';
  assert (select count(*) from public.staff) = 0, 'aluno não vê funcionários';
  assert (select count(*) from public.notifications) >= 1, 'aluno vê notificações próprias autorizadas';
end $$;

insert into public.workout_logs (student_id, exercise_id, load_kg, reps_done)
select public.current_student_id(), id, 22.5, '10' from public.exercises where name = 'Supino reto com barra';

do $$ begin
  insert into public.workout_logs (student_id, exercise_id, load_kg)
  select '20000000-0000-4000-8000-00000000000b', id, 10 from public.exercises limit 1;
  raise exception 'aluno registrou treino de outro aluno';
exception when insufficient_privilege then null;
end $$;

do $$ begin
  insert into public.checkins (student_id, method) values (public.current_student_id(), 'qrcode');
  raise exception 'aluno não deveria registrar check-in diretamente';
exception when insufficient_privilege then null;
end $$;

do $$ begin
  update public.profiles set role = 'admin' where id = auth.uid();
  raise exception 'aluno elevou o próprio papel';
exception when insufficient_privilege then null;
end $$;

select public.update_my_contact('11999990000', 'ana@aluno.test', null, null, null, false);
do $$ begin
  assert (select phone from public.students) = '11999990000', 'aluno atualiza contato';
end $$;

-- ------------------------------------------------------------------ gerente
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', false);
do $$ begin
  insert into public.staff (full_name, role) values ('Novo admin', 'admin');
  raise exception 'gerente criou administrador';
exception when insufficient_privilege then null;
end $$;
insert into public.staff (full_name, role) values ('Professor Carlos', 'professor');

-- ------------------------------------------------------------------ anonimização (admin)
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select public.anonymize_student('20000000-0000-4000-8000-00000000000a');
do $$ begin
  assert (select cpf from public.students where id = '20000000-0000-4000-8000-00000000000a') is null, 'cpf removido';
  assert (select count(*) from public.student_health where student_id = '20000000-0000-4000-8000-00000000000a') = 0,
    'saúde removida';
  assert (select count(*) from public.payments) = 1, 'pagamentos preservados';
end $$;

-- ------------------------------------------------------------------ anônimo
reset role;
set role anon;
do $$ begin
  assert (select count(*) from public.students) = 0, 'anônimo não vê alunos';
  assert (select count(*) from public.gyms) = 0, 'anônimo não vê academia';
end $$;
reset role;

-- ------------------------------------------------------------------ agregações do dashboard
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
do $$ declare r record; begin
  select * into r from public.fin_totals(date_trunc('month', current_date)::date, current_date + 400);
  assert r.expense_paid = 2000, format('despesa paga no período: %s', r.expense_paid);
  assert r.tuition_received = 0, 'pagamento estornado não conta como recebido';
  assert public.cash_balance() = -2000, format('saldo de caixa: %s', public.cash_balance());
  assert (select actual from public.budget_vs_actual(current_date) where category_name = 'Aluguel') = 2000, 'realizado do orçamento';
end $$;
reset role;
