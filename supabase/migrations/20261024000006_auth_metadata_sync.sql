-- =====================================================================
-- Migration 6: sincroniza papel e vínculos quando o Supabase Auth grava
-- raw_app_meta_data APÓS o INSERT (comportamento do auth.admin.createUser).
-- raw_app_meta_data só pode ser alterado com a service role.
-- =====================================================================

create or replace function public.apply_user_app_metadata(p_user uuid, p_meta jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_gym uuid;
  v_role public.app_role := nullif(p_meta ->> 'role', '')::public.app_role;
  v_student uuid := nullif(p_meta ->> 'student_id', '')::uuid;
  v_staff uuid := nullif(p_meta ->> 'staff_id', '')::uuid;
begin
  select gym_id into v_gym from public.profiles where id = p_user;
  if v_gym is null then return; end if;

  -- O primeiro administrador do sistema nunca é rebaixado por metadados vazios
  if v_role is not null then
    update public.profiles set role = v_role where id = p_user and role is distinct from v_role;
  end if;
  if v_student is not null then
    update public.students set user_id = p_user where id = v_student and gym_id = v_gym and user_id is null;
  end if;
  if v_staff is not null then
    update public.staff set profile_id = p_user where id = v_staff and gym_id = v_gym and profile_id is null;
  end if;
end $$;
revoke execute on function public.apply_user_app_metadata(uuid, jsonb) from public, anon, authenticated;

create or replace function public.handle_user_metadata_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.apply_user_app_metadata(new.id, new.raw_app_meta_data);
  return new;
end $$;
revoke execute on function public.handle_user_metadata_update() from public, anon, authenticated;

create trigger on_auth_user_metadata_updated
  after update of raw_app_meta_data on auth.users
  for each row when (old.raw_app_meta_data is distinct from new.raw_app_meta_data)
  execute function public.handle_user_metadata_update();
