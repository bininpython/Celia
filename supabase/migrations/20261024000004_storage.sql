-- =====================================================================
-- Migration 4: Supabase Storage (fotos de alunos e identidade visual)
-- Estrutura de caminhos:
--   student-photos/{gym_id}/{student_id}/{arquivo}   (privado)
--   gym-assets/{gym_id}/{arquivo}                      (público: logos)
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('student-photos', 'student-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('gym-assets', 'gym-assets', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

create policy "fotos: leitura equipe ou próprio aluno" on storage.objects for select to authenticated
  using (bucket_id = 'student-photos'
         and (storage.foldername(name))[1] = public.current_gym_id()::text
         and (public.is_staff() or (storage.foldername(name))[2] = public.current_student_id()::text));

create policy "fotos: escrita recepção/gestão" on storage.objects for insert to authenticated
  with check (bucket_id = 'student-photos'
              and (storage.foldername(name))[1] = public.current_gym_id()::text
              and public.is_front());

create policy "fotos: atualização recepção/gestão" on storage.objects for update to authenticated
  using (bucket_id = 'student-photos'
         and (storage.foldername(name))[1] = public.current_gym_id()::text
         and public.is_front());

create policy "fotos: exclusão recepção/gestão" on storage.objects for delete to authenticated
  using (bucket_id = 'student-photos'
         and (storage.foldername(name))[1] = public.current_gym_id()::text
         and public.is_front());

create policy "assets: escrita admin" on storage.objects for insert to authenticated
  with check (bucket_id = 'gym-assets'
              and (storage.foldername(name))[1] = public.current_gym_id()::text
              and public.has_any_role(array['admin']::public.app_role[]));

create policy "assets: atualização admin" on storage.objects for update to authenticated
  using (bucket_id = 'gym-assets'
         and (storage.foldername(name))[1] = public.current_gym_id()::text
         and public.has_any_role(array['admin']::public.app_role[]));

create policy "assets: exclusão admin" on storage.objects for delete to authenticated
  using (bucket_id = 'gym-assets'
         and (storage.foldername(name))[1] = public.current_gym_id()::text
         and public.has_any_role(array['admin']::public.app_role[]));
