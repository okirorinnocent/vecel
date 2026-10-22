-- Run in Supabase → SQL Editor
create table if not exists public.programs(
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]{2,60}$'),
  title text not null check (char_length(title) <= 80),
  summary text not null check (char_length(summary) <= 240),
  body text not null default '' check (char_length(body) <= 10000),
  icon text not null default '✨',
  link_url text check (link_url is null or char_length(link_url) <= 300),
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.programs enable row level security;

-- Visitors: read published programs only
create policy "public reads published" on public.programs for select to anon, authenticated using (published);
-- Admins: read everything (incl. hidden) and write
create policy "admins read all" on public.programs for select to authenticated
  using (exists(select 1 from public.admins a where a.user_id = (select auth.uid())));
create policy "admins insert" on public.programs for insert to authenticated
  with check (exists(select 1 from public.admins a where a.user_id = (select auth.uid())));
create policy "admins update" on public.programs for update to authenticated
  using (exists(select 1 from public.admins a where a.user_id = (select auth.uid())))
  with check (exists(select 1 from public.admins a where a.user_id = (select auth.uid())));
create policy "admins delete" on public.programs for delete to authenticated
  using (exists(select 1 from public.admins a where a.user_id = (select auth.uid())));

-- Seed with your current five cards
insert into public.programs(slug,title,summary,icon,body,sort_order) values
('digital-skilling','Digital skilling','Practical digital skills for the modern economy.','💻','Describe this program here.',10),
('research-innovation','Research & innovation','Local research that responds to real challenges in our communities.','🔬','Describe this program here.',20),
('public-health-education','Public health education','Critical health awareness delivered at community level.','🩺','Describe this program here.',30),
('surgical-care-support','Surgical care support','Sourcing and subsidising essential equipment and implants so surgery is within reach.','🏥','Describe this program here.',40),
('youth-empowerment','Youth empowerment','Skilling young people to build livelihoods and lead change.','🌱','Describe this program here.',50);
