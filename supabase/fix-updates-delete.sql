create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id),
  action text not null,
  table_name text not null,
  record_id text,
  changes jsonb not null default '{}'::jsonb
);

drop policy if exists "Admins read updates" on public.updates;
create policy "Admins read updates" on public.updates
  for select to authenticated using (public.is_admin());

drop policy if exists "Admins delete updates" on public.updates;
create policy "Admins delete updates" on public.updates
  for delete to authenticated using (public.is_admin());

drop policy if exists "Admins read update images" on storage.objects;
create policy "Admins read update images" on storage.objects
  for select to authenticated using (bucket_id = 'updates' and public.is_admin());

drop policy if exists "Admins delete update images" on storage.objects;
create policy "Admins delete update images" on storage.objects
  for delete to authenticated using (bucket_id = 'updates' and public.is_admin());

alter table public.admin_audit_log
  alter column record_id type text using record_id::text;
