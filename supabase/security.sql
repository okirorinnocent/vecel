-- Security and privacy migration. Run after the existing application tables exist.
create extension if not exists pgcrypto;

alter table public.subscribers add column if not exists confirm_token uuid;
alter table public.subscribers add column if not exists confirmed_at timestamptz;
alter table public.subscribers add column if not exists unsubscribed_at timestamptz;
alter table public.subscribers add column if not exists unsubscribe_token uuid default gen_random_uuid();
create unique index if not exists subscribers_confirm_token_idx on public.subscribers(confirm_token) where confirm_token is not null;
create unique index if not exists subscribers_unsubscribe_token_idx on public.subscribers(unsubscribe_token);
update public.subscribers set unsubscribe_token = gen_random_uuid() where unsubscribe_token is null;

create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  to_email text not null,
  subject text not null,
  kind text not null,
  ok boolean not null,
  error text
);

create table if not exists public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid,
  subject text not null,
  body text not null,
  idempotency_key text not null unique,
  status text not null default 'queued' check (status in ('queued','processing','completed','failed')),
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  total_count integer not null default 0,
  completed_at timestamptz
);

create table if not exists public.broadcast_recipients (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.broadcasts(id) on delete cascade,
  email text not null,
  token uuid,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  error text,
  sending_at timestamptz,
  sent_at timestamptz,
  unique (broadcast_id, email)
);

create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

create table if not exists public.analytics_visitors (
  visitor_id uuid primary key,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  country text,
  device text,
  browser text,
  os text,
  consent_version text not null
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  visitor_id uuid not null,
  session_id uuid not null,
  event text not null,
  path text not null,
  referrer_domain text,
  meta jsonb not null default '{}'::jsonb
);

create table if not exists public.cookie_consents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  visitor_id uuid,
  analytics boolean not null,
  version text not null
);

create index if not exists analytics_events_created_idx on public.analytics_events(created_at);
create index if not exists analytics_events_event_idx on public.analytics_events(event);
create index if not exists broadcast_recipients_pending_idx on public.broadcast_recipients(broadcast_id, status);

alter table public.email_log enable row level security;
alter table public.broadcasts enable row level security;
alter table public.broadcast_recipients enable row level security;
alter table public.rate_limits enable row level security;
alter table public.analytics_visitors enable row level security;
alter table public.analytics_events enable row level security;
alter table public.cookie_consents enable row level security;

do $$ declare t text; begin
  foreach t in array array['messages','applications','subscribers','donations','updates','programs'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

drop policy if exists "public reads published" on public.updates;
create policy "public reads published" on public.updates for select to anon, authenticated using (published = true);
drop policy if exists "public reads published programs" on public.programs;
create policy "public reads published programs" on public.programs for select to anon, authenticated using (published = true);

do $$ declare t text; begin
  foreach t in array array['messages','applications','subscribers','donations','updates','programs','email_log','broadcasts','broadcast_recipients','rate_limits','analytics_visitors','analytics_events','cookie_consents'] loop
    execute format('drop policy if exists "admins read %s" on public.%I', t, t);
    execute format('create policy "admins read %s" on public.%I for select to authenticated using (exists (select 1 from public.admins a where a.user_id = auth.uid()))', t, t);
    execute format('drop policy if exists "admins write %s" on public.%I', t, t);
    execute format('create policy "admins write %s" on public.%I for all to authenticated using (exists (select 1 from public.admins a where a.user_id = auth.uid())) with check (exists (select 1 from public.admins a where a.user_id = auth.uid()))', t, t);
  end loop;
end $$;

create or replace function public.consume_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  insert into public.rate_limits(key, window_start, count)
  values (p_key, v_start, 1)
  on conflict (key, window_start) do update set count = rate_limits.count + 1
  returning count into v_count;
  delete from public.rate_limits where window_start < now() - interval '2 hours';
  return v_count <= p_limit;
end $$;

create or replace function public.analytics_admin_summary(p_since timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'not authorised';
  end if;
  select jsonb_build_object(
    'total_visitors', (select count(*) from analytics_visitors where last_seen >= p_since),
    'new_visitors', (select count(*) from analytics_visitors where first_seen >= p_since),
    'returning_visitors', (select count(*) from analytics_visitors where first_seen < p_since and last_seen >= p_since),
    'page_views', (select count(*) from analytics_events where event = 'page_view' and created_at >= p_since),
    'top_pages', coalesce((select jsonb_agg(x) from (select path, count(*) count from analytics_events where event = 'page_view' and created_at >= p_since group by path order by count desc limit 10) x), '[]'::jsonb),
    'top_referrers', coalesce((select jsonb_agg(x) from (select coalesce(referrer_domain,'direct') referrer, count(*) count from analytics_events where event = 'page_view' and created_at >= p_since group by 1 order by count desc limit 10) x), '[]'::jsonb),
    'countries', coalesce((select jsonb_agg(x) from (select coalesce(country,'unknown') country, count(*) count from analytics_visitors where last_seen >= p_since group by 1 order by count desc limit 10) x), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(x) from (select coalesce(device,'unknown') device, count(*) count from analytics_visitors where last_seen >= p_since group by 1 order by count desc) x), '[]'::jsonb),
    'browsers', coalesce((select jsonb_agg(x) from (select coalesce(browser,'unknown') browser, count(*) count from analytics_visitors where last_seen >= p_since group by 1 order by count desc) x), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(x) from (select date_trunc('day',created_at)::date day, count(*) count from analytics_events where event = 'page_view' and created_at >= p_since group by 1 order by 1) x), '[]'::jsonb),
    'consent_accepted', (select count(*) from cookie_consents where analytics = true and created_at >= p_since),
    'consent_rejected', (select count(*) from cookie_consents where analytics = false and created_at >= p_since),
    'recent_events', coalesce((select jsonb_agg(x) from (select created_at,event,path,country from analytics_events e left join analytics_visitors v using(visitor_id) where e.created_at >= p_since order by e.created_at desc limit 50) x), '[]'::jsonb)
  ) into result;
  return result;
end $$;

create or replace function public.delete_my_analytics(p_visitor_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from analytics_events where visitor_id = p_visitor_id;
  delete from cookie_consents where visitor_id = p_visitor_id;
  delete from analytics_visitors where visitor_id = p_visitor_id;
end $$;

revoke all on function public.analytics_admin_summary(timestamptz) from public;
grant execute on function public.analytics_admin_summary(timestamptz) to authenticated;
grant execute on function public.delete_my_analytics(uuid) to anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

-- Run monthly with pg_cron if enabled:
-- select cron.schedule('delete-old-analytics','0 3 1 * *',$cmd$
--   delete from public.analytics_events where created_at < now() - interval '13 months';
--   delete from public.cookie_consents where created_at < now() - interval '13 months';
-- $cmd$);
