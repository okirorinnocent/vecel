-- Required by the atomic broadcast queue and admin audit log.
alter table public.broadcast_recipients add column if not exists sending_at timestamptz;
alter table public.broadcast_recipients add column if not exists error text;
alter table public.donations add column if not exists tx_ref text;
alter table public.donations add column if not exists transaction_id text;
alter table public.donations add column if not exists provider text;
create unique index if not exists donations_tx_ref_key on public.donations(tx_ref) where tx_ref is not null;
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id),
  action text not null,
  table_name text not null,
  record_id uuid,
  changes jsonb not null default '{}'::jsonb
);
alter table public.admin_audit_log enable row level security;
drop policy if exists "Admins read audit log" on public.admin_audit_log;
create policy "Admins read audit log" on public.admin_audit_log for select using (public.is_admin());
drop policy if exists "Admins write audit log" on public.admin_audit_log;
create policy "Admins write audit log" on public.admin_audit_log for insert with check (public.is_admin() and user_id = auth.uid());
create or replace function public.claim_broadcast_recipients(p_broadcast_id uuid, p_limit integer default 50)
returns setof public.broadcast_recipients
language sql
security definer
set search_path = public
as $$
  with candidates as (
    select id
    from public.broadcast_recipients
    where broadcast_id = p_broadcast_id
      and (status = 'pending' or (status = 'sending' and sending_at < now() - interval '10 minutes'))
    order by id
    for update skip locked
    limit greatest(1, least(p_limit, 50))
  )
  update public.broadcast_recipients r
  set status = 'sending', sending_at = now(), error = null
  from candidates
  where r.id = candidates.id
  returning r.*;
$$;
revoke all on function public.claim_broadcast_recipients(uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_broadcast_recipients(uuid, integer) to service_role;
