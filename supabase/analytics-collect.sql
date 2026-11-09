create table if not exists public.analytics_daily (
  day date not null default current_date,
  path text not null,
  country text not null default 'unknown',
  device text not null default 'unknown',
  views bigint not null default 0,
  primary key (day, path, country, device)
);

alter table public.analytics_daily enable row level security;
drop policy if exists "Admins read anonymous daily analytics" on public.analytics_daily;
create policy "Admins read anonymous daily analytics"
  on public.analytics_daily for select using (public.is_admin());

create or replace function public.record_anonymous_page_view(p_path text, p_country text, p_device text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.analytics_daily(day, path, country, device, views)
  values (current_date, left(coalesce(p_path, '/'), 200), left(coalesce(p_country, 'unknown'), 8), left(coalesce(p_device, 'unknown'), 30), 1)
  on conflict (day, path, country, device)
  do update set views = public.analytics_daily.views + 1;
end;
$$;
revoke all on function public.record_anonymous_page_view(text, text, text) from public, anon, authenticated;
grant execute on function public.record_anonymous_page_view(text, text, text) to service_role;

create or replace function public.analytics_tracking_health()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return (
  select jsonb_build_object(
    'last_event', (select max(created_at) from public.analytics_events),
    'events_last_hour', (select count(*) from public.analytics_events where created_at >= now() - interval '1 hour'),
    'anonymous_views_last_30_days', (select coalesce(sum(views), 0) from public.analytics_daily where day >= current_date - 29)
  ));
end;
$$;
revoke all on function public.analytics_tracking_health() from public, anon;
grant execute on function public.analytics_tracking_health() to authenticated;

create or replace function public.analytics_anonymous_summary(p_since timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return (
  select jsonb_build_object(
    'views', coalesce((select sum(views) from public.analytics_daily where day >= p_since::date), 0),
    'top_pages', coalesce((select jsonb_agg(x) from (select path, sum(views) count from public.analytics_daily where day >= p_since::date group by path order by count desc limit 10) x), '[]'::jsonb)
  ));
end;
$$;
revoke all on function public.analytics_anonymous_summary(timestamptz) from public, anon;
grant execute on function public.analytics_anonymous_summary(timestamptz) to authenticated;
