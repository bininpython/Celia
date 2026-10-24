-- =====================================================================
-- Migration 3: Row Level Security
-- Matriz de acesso:
--   admin ........ tudo na própria academia
--   gerente ...... tudo, exceto configurações da academia e anonimização
--   recepcionista  alunos (sem saúde), matrículas, mensalidades, pagamentos, frequência, agenda
--   professor .... alunos (leitura + saúde), treinos, exercícios, frequência, agenda
--   aluno ........ somente os próprios dados (portal)
-- =====================================================================

-- Atalhos de papéis
create or replace function public.is_mgmt() returns boolean
language sql stable security definer set search_path = public
as $$ select public.has_any_role(array['admin','gerente']::public.app_role[]) $$;

create or replace function public.is_front() returns boolean
language sql stable security definer set search_path = public
as $$ select public.has_any_role(array['admin','gerente','recepcionista']::public.app_role[]) $$;

create or replace function public.is_trainer() returns boolean
language sql stable security definer set search_path = public
as $$ select public.has_any_role(array['admin','gerente','professor']::public.app_role[]) $$;

-- Funções internas não devem ser chamadas via API
revoke execute on function public.recompute_invoice_status(uuid) from public, anon, authenticated;
revoke execute on function public.seed_gym_defaults() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.generate_notifications(uuid) from public, anon;
revoke execute on function public.anonymize_student(uuid) from public, anon;

do $$
declare t text;
begin
  foreach t in array array['gyms','profiles','staff','plans','students','student_health','memberships',
                           'invoices','payments','financial_categories','suppliers','investments',
                           'transactions','budgets','exercises','workout_plans','workout_divisions',
                           'workout_exercises','workout_logs','checkins','events','event_attendees',
                           'notifications','audit_logs','report_exports']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- gyms ------------------------------------------------------------------
create policy gyms_select on public.gyms for select to authenticated
  using (id = public.current_gym_id());
create policy gyms_update on public.gyms for update to authenticated
  using (id = public.current_gym_id() and public.has_any_role(array['admin']::public.app_role[]))
  with check (id = public.current_gym_id());

-- profiles --------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or (gym_id = public.current_gym_id() and public.is_mgmt()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or (gym_id = public.current_gym_id() and public.has_any_role(array['admin']::public.app_role[])))
  with check (gym_id = public.current_gym_id());

-- staff -----------------------------------------------------------------
create policy staff_select on public.staff for select to authenticated
  using (gym_id = public.current_gym_id() and (public.is_mgmt() or profile_id = auth.uid()));
create policy staff_insert on public.staff for insert to authenticated
  with check (gym_id = public.current_gym_id() and public.is_mgmt()
              and (role <> 'admin' or public.has_any_role(array['admin']::public.app_role[])));
create policy staff_update on public.staff for update to authenticated
  using (gym_id = public.current_gym_id() and public.is_mgmt())
  with check (gym_id = public.current_gym_id()
              and (role <> 'admin' or public.has_any_role(array['admin']::public.app_role[])));
create policy staff_delete on public.staff for delete to authenticated
  using (gym_id = public.current_gym_id() and public.has_any_role(array['admin']::public.app_role[]));

-- Diretório da equipe (sem salário/CPF) visível para toda a equipe
create view public.staff_directory with (security_barrier = true) as
  select id, gym_id, full_name, role, position, phone, email, active, schedule, responsibilities
    from public.staff
   where gym_id = public.current_gym_id() and public.is_staff();
grant select on public.staff_directory to authenticated;

-- plans -----------------------------------------------------------------
create policy plans_select on public.plans for select to authenticated
  using (gym_id = public.current_gym_id());
create policy plans_write on public.plans for all to authenticated
  using (gym_id = public.current_gym_id() and public.is_mgmt())
  with check (gym_id = public.current_gym_id() and public.is_mgmt());

-- students --------------------------------------------------------------
create policy students_select on public.students for select to authenticated
  using (gym_id = public.current_gym_id() and (public.is_staff() or user_id = auth.uid()));
create policy students_insert on public.students for insert to authenticated
  with check (gym_id = public.current_gym_id() and public.is_front());
create policy students_update on public.students for update to authenticated
  using (gym_id = public.current_gym_id() and public.is_front())
  with check (gym_id = public.current_gym_id() and public.is_front());
create policy students_delete on public.students for delete to authenticated
  using (gym_id = public.current_gym_id() and public.has_any_role(array['admin']::public.app_role[]));

-- Aluno atualiza apenas contatos e preferências próprias
create or replace function public.update_my_contact(
  p_phone text, p_email text, p_address text,
  p_emergency_name text, p_emergency_phone text, p_notifications boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.students set phone = p_phone, email = p_email, address = p_address,
         emergency_contact_name = p_emergency_name, emergency_contact_phone = p_emergency_phone,
         notifications_opt_in = p_notifications
   where user_id = auth.uid();
  if not found then
    raise exception 'Cadastro de aluno não encontrado.';
  end if;
end $$;
revoke execute on function public.update_my_contact(text, text, text, text, text, boolean) from public, anon;

-- student_health (dado sensível) ----------------------------------------
create policy health_select on public.student_health for select to authenticated
  using (gym_id = public.current_gym_id()
         and (public.is_trainer() or student_id = public.current_student_id()));
create policy health_write on public.student_health for all to authenticated
  using (gym_id = public.current_gym_id() and public.is_trainer())
  with check (gym_id = public.current_gym_id() and public.is_trainer());

-- memberships -----------------------------------------------------------
create policy memberships_select on public.memberships for select to authenticated
  using (gym_id = public.current_gym_id() and (public.is_staff() or student_id = public.current_student_id()));
create policy memberships_write on public.memberships for all to authenticated
  using (gym_id = public.current_gym_id() and public.is_front())
  with check (gym_id = public.current_gym_id() and public.is_front());

-- invoices --------------------------------------------------------------
create policy invoices_select on public.invoices for select to authenticated
  using (gym_id = public.current_gym_id() and (public.is_front() or student_id = public.current_student_id()));
create policy invoices_insert on public.invoices for insert to authenticated
  with check (gym_id = public.current_gym_id() and public.is_front());
create policy invoices_update on public.invoices for update to authenticated
  using (gym_id = public.current_gym_id() and public.is_front())
  with check (gym_id = public.current_gym_id() and public.is_front());
create policy invoices_delete on public.invoices for delete to authenticated
  using (gym_id = public.current_gym_id() and public.is_mgmt() and status = 'pendente');

-- payments --------------------------------------------------------------
create policy payments_select on public.payments for select to authenticated
  using (gym_id = public.current_gym_id() and (public.is_front() or student_id = public.current_student_id()));
create policy payments_insert on public.payments for insert to authenticated
  with check (gym_id = public.current_gym_id() and public.is_front() and reversed_at is null);
create policy payments_update on public.payments for update to authenticated
  using (gym_id = public.current_gym_id() and public.is_mgmt())
  with check (gym_id = public.current_gym_id() and public.is_mgmt());

-- Financeiro (somente gestão) --------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['financial_categories','suppliers','investments','transactions','budgets']
  loop
    execute format('create policy %I_mgmt on public.%I for all to authenticated
                    using (gym_id = public.current_gym_id() and public.is_mgmt())
                    with check (gym_id = public.current_gym_id() and public.is_mgmt())', t, t);
  end loop;
end $$;

-- Exercícios ------------------------------------------------------------
create policy exercises_select on public.exercises for select to authenticated
  using (gym_id = public.current_gym_id());
create policy exercises_write on public.exercises for all to authenticated
  using (gym_id = public.current_gym_id() and public.is_trainer())
  with check (gym_id = public.current_gym_id() and public.is_trainer());

-- Fichas de treino ------------------------------------------------------
create policy workout_plans_select on public.workout_plans for select to authenticated
  using (gym_id = public.current_gym_id() and (public.is_staff() or student_id = public.current_student_id()));
create policy workout_plans_write on public.workout_plans for all to authenticated
  using (gym_id = public.current_gym_id() and public.is_trainer())
  with check (gym_id = public.current_gym_id() and public.is_trainer());

create policy workout_divisions_select on public.workout_divisions for select to authenticated
  using (gym_id = public.current_gym_id() and (public.is_staff() or exists (
    select 1 from public.workout_plans p where p.id = plan_id and p.student_id = public.current_student_id())));
create policy workout_divisions_write on public.workout_divisions for all to authenticated
  using (gym_id = public.current_gym_id() and public.is_trainer())
  with check (gym_id = public.current_gym_id() and public.is_trainer());

create policy workout_exercises_select on public.workout_exercises for select to authenticated
  using (gym_id = public.current_gym_id() and (public.is_staff() or exists (
    select 1 from public.workout_divisions d join public.workout_plans p on p.id = d.plan_id
     where d.id = division_id and p.student_id = public.current_student_id())));
create policy workout_exercises_write on public.workout_exercises for all to authenticated
  using (gym_id = public.current_gym_id() and public.is_trainer())
  with check (gym_id = public.current_gym_id() and public.is_trainer());

create policy workout_logs_select on public.workout_logs for select to authenticated
  using (gym_id = public.current_gym_id() and (public.is_trainer() or student_id = public.current_student_id()));
create policy workout_logs_insert on public.workout_logs for insert to authenticated
  with check (gym_id = public.current_gym_id() and (public.is_trainer() or student_id = public.current_student_id()));
create policy workout_logs_update on public.workout_logs for update to authenticated
  using (gym_id = public.current_gym_id() and (public.is_trainer() or student_id = public.current_student_id()))
  with check (gym_id = public.current_gym_id() and (public.is_trainer() or student_id = public.current_student_id()));
create policy workout_logs_delete on public.workout_logs for delete to authenticated
  using (gym_id = public.current_gym_id() and (public.is_trainer() or student_id = public.current_student_id()));

-- Check-ins -------------------------------------------------------------
create policy checkins_select on public.checkins for select to authenticated
  using (gym_id = public.current_gym_id() and (public.is_staff() or student_id = public.current_student_id()));
create policy checkins_insert on public.checkins for insert to authenticated
  with check (gym_id = public.current_gym_id() and public.is_staff());
create policy checkins_delete on public.checkins for delete to authenticated
  using (gym_id = public.current_gym_id() and public.is_mgmt());

-- Agenda ----------------------------------------------------------------
create policy events_select on public.events for select to authenticated
  using (gym_id = public.current_gym_id() and (
    public.is_staff()
    or student_id = public.current_student_id()
    or (kind = 'aula' and status <> 'cancelado')));
create policy events_write on public.events for all to authenticated
  using (gym_id = public.current_gym_id() and public.is_staff())
  with check (gym_id = public.current_gym_id() and public.is_staff());

create policy attendees_select on public.event_attendees for select to authenticated
  using (gym_id = public.current_gym_id() and (public.is_staff() or student_id = public.current_student_id()));
create policy attendees_insert on public.event_attendees for insert to authenticated
  with check (gym_id = public.current_gym_id() and (public.is_staff() or student_id = public.current_student_id()));
create policy attendees_delete on public.event_attendees for delete to authenticated
  using (gym_id = public.current_gym_id() and (public.is_staff() or student_id = public.current_student_id()));

-- Lotação de aulas
create or replace function public.check_event_capacity()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_cap smallint; v_kind public.event_kind; v_status public.event_status; v_count integer;
begin
  select capacity, kind, status into v_cap, v_kind, v_status from public.events where id = new.event_id;
  if v_status = 'cancelado' then
    raise exception 'Esta aula foi cancelada.';
  end if;
  if v_kind <> 'aula' and not public.is_staff() then
    raise exception 'Inscrição permitida apenas em aulas.';
  end if;
  if v_cap is not null then
    select count(*) into v_count from public.event_attendees where event_id = new.event_id;
    if v_count >= v_cap then
      raise exception 'Aula lotada (% vagas).', v_cap;
    end if;
  end if;
  return new;
end $$;
create trigger event_attendees_capacity before insert on public.event_attendees
  for each row execute function public.check_event_capacity();

-- Notificações ----------------------------------------------------------
create policy notifications_select on public.notifications for select to authenticated
  using (gym_id = public.current_gym_id() and (
    (audience = 'staff' and public.is_staff())
    or (audience = 'student' and student_id = public.current_student_id())));
create policy notifications_update on public.notifications for update to authenticated
  using (gym_id = public.current_gym_id() and (
    (audience = 'staff' and public.is_staff())
    or (audience = 'student' and student_id = public.current_student_id())))
  with check (gym_id = public.current_gym_id());
create policy notifications_insert on public.notifications for insert to authenticated
  with check (gym_id = public.current_gym_id() and public.is_mgmt());
create policy notifications_delete on public.notifications for delete to authenticated
  using (gym_id = public.current_gym_id() and public.is_mgmt());

-- Auditoria e exportações ----------------------------------------------
create policy audit_select on public.audit_logs for select to authenticated
  using (gym_id = public.current_gym_id() and public.is_mgmt());

create policy report_exports_select on public.report_exports for select to authenticated
  using (gym_id = public.current_gym_id() and public.is_mgmt());
create policy report_exports_insert on public.report_exports for insert to authenticated
  with check (gym_id = public.current_gym_id() and public.is_staff());
