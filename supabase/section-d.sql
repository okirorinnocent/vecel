-- Section D production migrations. Safe to run repeatedly after base-tables.sql
-- and security.sql (or against an existing project).

alter table public.broadcast_recipients add column if not exists sending_at timestamptz;
alter table public.broadcast_recipients add column if not exists error text;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.broadcast_recipients'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) like '%status%'
  loop
    execute format('alter table public.broadcast_recipients drop constraint %I', constraint_name);
  end loop;
end $$;

do $$
begin
  alter table public.broadcast_recipients
    add constraint broadcast_recipients_status_check
    check (status in ('pending', 'sending', 'sent', 'failed'));
exception when duplicate_object then
  null;
end $$;

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

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_count integer;
begin
  if p_window_seconds < 1 or p_limit < 1 then
    raise exception 'invalid rate limit parameters';
  end if;
  v_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );
  insert into public.rate_limits(key, window_start, count)
  values (p_key, v_start, 1)
  on conflict (key, window_start) do update
    set count = rate_limits.count + 1
  returning count into v_count;

  -- Keep records for the longest window being evaluated, rather than a
  -- fixed two-hour period that breaks long-window limits.
  delete from public.rate_limits
  where window_start < now() - greatest(p_window_seconds, 7200) * interval '1 second';
  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

create or replace function public.increment_broadcast_counters(
  p_broadcast_id uuid,
  p_sent integer default 0,
  p_failed integer default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_sent < 0 or p_failed < 0 then
    raise exception 'invalid broadcast counters';
  end if;
  update public.broadcasts
  set sent_count = sent_count + p_sent,
      failed_count = failed_count + p_failed
  where id = p_broadcast_id;
  if not found then
    raise exception 'broadcast not found';
  end if;
end;
$$;

revoke all on function public.increment_broadcast_counters(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.increment_broadcast_counters(uuid, integer, integer) to service_role;

alter table public.admin_audit_log
  alter column record_id type text using record_id::text;

create or replace view public.published_team_members
with (security_invoker = true)
as
select id, name, role_title, department, bio, photo_url, linkedin_url,
  case when show_email then email else null end as email,
  case when show_phone then phone else null end as phone,
  show_email, show_phone, sort_order
from public.team_members
where published = true;

grant select on public.published_team_members to anon, authenticated;
