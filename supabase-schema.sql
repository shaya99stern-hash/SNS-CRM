-- SNS Leads shared database schema
-- Paste this into Supabase SQL Editor and run it once.
-- This version allows shared public editing through the publishable/anon key.
-- Anyone with the app URL can read/edit. Add login/RLS restrictions later for private team access.

create table if not exists public.clients (
  id text primary key default gen_random_uuid()::text,
  company text not null default '',
  contact text not null default '',
  phone text not null default '',
  email text not null default '',
  status text not null default 'Prospective',
  meeting_date date null,
  meeting_owner text not null default '',
  next_step text not null default '',
  follow_up text not null default '',
  close_status text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.buildings (
  id text primary key default gen_random_uuid()::text,
  client_id text not null references public.clients(id) on delete cascade,
  name text not null default '',
  address text not null default '',
  status text not null default 'Prospective',
  description text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

drop trigger if exists set_buildings_updated_at on public.buildings;
create trigger set_buildings_updated_at
before update on public.buildings
for each row execute function public.set_updated_at();

alter table public.clients enable row level security;
alter table public.buildings enable row level security;

drop policy if exists "public read clients" on public.clients;
create policy "public read clients" on public.clients for select using (true);

drop policy if exists "public insert clients" on public.clients;
create policy "public insert clients" on public.clients for insert with check (true);

drop policy if exists "public update clients" on public.clients;
create policy "public update clients" on public.clients for update using (true) with check (true);

drop policy if exists "public delete clients" on public.clients;
create policy "public delete clients" on public.clients for delete using (true);

drop policy if exists "public read buildings" on public.buildings;
create policy "public read buildings" on public.buildings for select using (true);

drop policy if exists "public insert buildings" on public.buildings;
create policy "public insert buildings" on public.buildings for insert with check (true);

drop policy if exists "public update buildings" on public.buildings;
create policy "public update buildings" on public.buildings for update using (true) with check (true);

drop policy if exists "public delete buildings" on public.buildings;
create policy "public delete buildings" on public.buildings for delete using (true);

-- Enable realtime updates. If this errors because the table already exists in the publication, ignore it.
do $$
begin
  alter publication supabase_realtime add table public.clients;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.buildings;
exception when duplicate_object then null;
end $$;
