create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  email text,
  role text not null default 'technician' check (role in ('technician', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campuses (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name text not null unique,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create table public.requesters (
  id bigint generated always as identity primary key,
  registration text not null,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 160),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index requesters_registration_unique
  on public.requesters (upper(btrim(registration)));

create table public.sectors (
  id bigint generated always as identity primary key,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index sectors_name_unique
  on public.sectors (lower(btrim(name)));

create table public.tickets (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  campus_id smallint not null references public.campuses (id),
  requester_id bigint not null references public.requesters (id),
  sector_id bigint not null references public.sectors (id),
  reported_error text not null check (char_length(btrim(reported_error)) between 5 and 4000),
  diagnosis text check (diagnosis is null or char_length(btrim(diagnosis)) <= 4000),
  resolved boolean not null default false,
  notes text check (notes is null or char_length(btrim(notes)) <= 4000),
  technician_id uuid not null references public.profiles (id) on delete restrict default auth.uid(),
  resolved_at timestamptz,
  constraint tickets_resolved_requires_diagnosis check (
    resolved = false or nullif(btrim(diagnosis), '') is not null
  )
);

create table public.ticket_history (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references public.tickets (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type text not null check (event_type in ('created', 'updated')),
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index tickets_technician_created_idx
  on public.tickets (technician_id, created_at desc);
create index tickets_resolved_created_idx
  on public.tickets (resolved, created_at desc);
create index tickets_requester_idx on public.tickets (requester_id);
create index tickets_campus_idx on public.tickets (campus_id);
create index tickets_sector_idx on public.tickets (sector_id);
create index ticket_history_ticket_created_idx
  on public.ticket_history (ticket_id, created_at desc);

insert into public.campuses (slug, name, sort_order)
values
  ('campus-1', 'Campus 1', 10),
  ('campus-2', 'Campus 2', 20),
  ('campus-3', 'Campus 3', 30),
  ('clinica-odontologica', 'Clinica Odontologica', 40),
  ('fazenda', 'Fazenda', 50)
on conflict (slug) do update
set name = excluded.name,
    sort_order = excluded.sort_order,
    is_active = true;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.set_ticket_derived_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();

  if tg_op = 'INSERT' then
    if new.resolved then
      new.resolved_at = coalesce(new.resolved_at, now());
    end if;
  elsif old.resolved is distinct from new.resolved then
    new.resolved_at = case when new.resolved then now() else null end;
  end if;

  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger requesters_set_updated_at
before update on public.requesters
for each row execute function private.set_updated_at();

create trigger sectors_set_updated_at
before update on public.sectors
for each row execute function private.set_updated_at();

create trigger tickets_set_derived_fields
before insert or update on public.tickets
for each row execute function private.set_ticket_derived_fields();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned_role text;
begin
  perform pg_advisory_xact_lock(8712331);

  assigned_role := case
    when not exists (select 1 from public.profiles) then 'admin'
    else 'technician'
  end;

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Equipe TI'
    ),
    new.email,
    assigned_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

with ranked_users as (
  select
    id,
    email,
    raw_user_meta_data,
    row_number() over (order by created_at, id) as user_rank
  from auth.users
)
insert into public.profiles (id, full_name, email, role)
select
  id,
  coalesce(
    nullif(btrim(raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(email, ''), '@', 1), ''),
    'Equipe TI'
  ),
  email,
  case when user_rank = 1 then 'admin' else 'technician' end
from ranked_users
on conflict (id) do nothing;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function private.capture_ticket_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.ticket_history (ticket_id, actor_id, event_type, snapshot)
  values (
    new.id,
    (select auth.uid()),
    case when tg_op = 'INSERT' then 'created' else 'updated' end,
    jsonb_build_object(
      'before', case when tg_op = 'INSERT' then null else to_jsonb(old) end,
      'after', to_jsonb(new)
    )
  );

  return new;
end;
$$;

create trigger tickets_capture_history
after insert or update on public.tickets
for each row execute function private.capture_ticket_history();

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.capture_ticket_history() from public, anon, authenticated;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.campuses enable row level security;
alter table public.requesters enable row level security;
alter table public.sectors enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_history enable row level security;

create policy profiles_select_own_or_admin
on public.profiles for select
to authenticated
using ((select auth.uid()) = id or (select private.is_admin()));

create policy profiles_update_own_or_admin
on public.profiles for update
to authenticated
using ((select auth.uid()) = id or (select private.is_admin()))
with check ((select auth.uid()) = id or (select private.is_admin()));

create policy campuses_select_authenticated
on public.campuses for select
to authenticated
using (true);

create policy requesters_select_authenticated
on public.requesters for select
to authenticated
using (true);

create policy requesters_insert_authenticated
on public.requesters for insert
to authenticated
with check ((select auth.uid()) = created_by);

create policy requesters_update_creator_or_admin
on public.requesters for update
to authenticated
using ((select auth.uid()) = created_by or (select private.is_admin()))
with check ((select auth.uid()) = created_by or (select private.is_admin()));

create policy sectors_select_authenticated
on public.sectors for select
to authenticated
using (true);

create policy sectors_insert_authenticated
on public.sectors for insert
to authenticated
with check ((select auth.uid()) = created_by);

create policy sectors_update_creator_or_admin
on public.sectors for update
to authenticated
using ((select auth.uid()) = created_by or (select private.is_admin()))
with check ((select auth.uid()) = created_by or (select private.is_admin()));

create policy tickets_select_owner_or_admin
on public.tickets for select
to authenticated
using ((select auth.uid()) = technician_id or (select private.is_admin()));

create policy tickets_insert_owner_or_admin
on public.tickets for insert
to authenticated
with check ((select auth.uid()) = technician_id or (select private.is_admin()));

create policy tickets_update_owner_or_admin
on public.tickets for update
to authenticated
using ((select auth.uid()) = technician_id or (select private.is_admin()))
with check ((select auth.uid()) = technician_id or (select private.is_admin()));

create policy ticket_history_select_ticket_owner_or_admin
on public.ticket_history for select
to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1
    from public.tickets
    where tickets.id = ticket_history.ticket_id
      and tickets.technician_id = (select auth.uid())
  )
);

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.campuses from anon, authenticated;
revoke all on table public.requesters from anon, authenticated;
revoke all on table public.sectors from anon, authenticated;
revoke all on table public.tickets from anon, authenticated;
revoke all on table public.ticket_history from anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (full_name) on table public.profiles to authenticated;
grant select on table public.campuses to authenticated;
grant select, insert on table public.requesters to authenticated;
grant update (full_name) on table public.requesters to authenticated;
grant select, insert on table public.sectors to authenticated;
grant update (name, is_active) on table public.sectors to authenticated;
grant select, insert on table public.tickets to authenticated;
grant update (diagnosis, resolved, notes) on table public.tickets to authenticated;
grant select on table public.ticket_history to authenticated;

grant usage, select on all sequences in schema public to authenticated;
