alter table public.profiles
  add column access_revoked_at timestamptz,
  add column access_revoked_by uuid;

alter table public.profiles
  add constraint profiles_access_revoked_by_fkey
  foreign key (access_revoked_by)
  references public.profiles (id)
  on delete set null;

create index profiles_active_role_idx
  on public.profiles (role, created_at)
  where access_revoked_at is null;

create or replace function private.is_team_member()
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
      and access_revoked_at is null
  );
$$;

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
      and access_revoked_at is null
  );
$$;

revoke all on function private.is_team_member() from public, anon;
grant execute on function private.is_team_member() to authenticated;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
on public.profiles for select
to authenticated
using (
  (select private.is_team_member())
  and ((select auth.uid()) = id or (select private.is_admin()))
);

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin
on public.profiles for update
to authenticated
using (
  (select private.is_team_member())
  and ((select auth.uid()) = id or (select private.is_admin()))
)
with check (
  (select private.is_team_member())
  and ((select auth.uid()) = id or (select private.is_admin()))
);

drop policy if exists requesters_insert_authenticated on public.requesters;
create policy requesters_insert_authenticated
on public.requesters for insert
to authenticated
with check (
  (select private.is_team_member())
  and (select auth.uid()) = created_by
);

drop policy if exists requesters_update_creator_or_admin on public.requesters;
create policy requesters_update_creator_or_admin
on public.requesters for update
to authenticated
using (
  (select private.is_team_member())
  and ((select auth.uid()) = created_by or (select private.is_admin()))
)
with check (
  (select private.is_team_member())
  and ((select auth.uid()) = created_by or (select private.is_admin()))
);

drop policy if exists sectors_insert_authenticated on public.sectors;
create policy sectors_insert_authenticated
on public.sectors for insert
to authenticated
with check (
  (select private.is_team_member())
  and (select auth.uid()) = created_by
);

drop policy if exists sectors_update_creator_or_admin on public.sectors;
create policy sectors_update_creator_or_admin
on public.sectors for update
to authenticated
using (
  (select private.is_team_member())
  and ((select auth.uid()) = created_by or (select private.is_admin()))
)
with check (
  (select private.is_team_member())
  and ((select auth.uid()) = created_by or (select private.is_admin()))
);

drop policy if exists tickets_select_owner_or_admin on public.tickets;
create policy tickets_select_owner_or_admin
on public.tickets for select
to authenticated
using (
  (select private.is_team_member())
  and ((select auth.uid()) = technician_id or (select private.is_admin()))
);

drop policy if exists tickets_insert_owner_or_admin on public.tickets;
create policy tickets_insert_owner_or_admin
on public.tickets for insert
to authenticated
with check (
  (select private.is_team_member())
  and ((select auth.uid()) = technician_id or (select private.is_admin()))
);

drop policy if exists tickets_update_owner_or_admin on public.tickets;
create policy tickets_update_owner_or_admin
on public.tickets for update
to authenticated
using (
  (select private.is_team_member())
  and ((select auth.uid()) = technician_id or (select private.is_admin()))
)
with check (
  (select private.is_team_member())
  and ((select auth.uid()) = technician_id or (select private.is_admin()))
);

drop policy if exists ticket_history_select_ticket_owner_or_admin on public.ticket_history;
create policy ticket_history_select_ticket_owner_or_admin
on public.ticket_history for select
to authenticated
using (
  (select private.is_team_member())
  and (
    (select private.is_admin())
    or exists (
      select 1
      from public.tickets
      where tickets.id = ticket_history.ticket_id
        and tickets.technician_id = (select auth.uid())
    )
  )
);

create or replace function private.require_active_team_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
    and not (select private.is_team_member()) then
    raise exception 'Active team membership required' using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function private.require_active_team_member() from public, anon, authenticated;

create trigger profiles_require_active_team_member
before insert or update or delete on public.profiles
for each row execute function private.require_active_team_member();

create trigger requesters_require_active_team_member
before insert or update or delete on public.requesters
for each row execute function private.require_active_team_member();

create trigger sectors_require_active_team_member
before insert or update or delete on public.sectors
for each row execute function private.require_active_team_member();

create trigger tickets_require_active_team_member
before insert or update or delete on public.tickets
for each row execute function private.require_active_team_member();

create trigger equipment_categories_require_active_team_member
before insert or update or delete on public.equipment_categories
for each row execute function private.require_active_team_member();

create trigger equipment_models_require_active_team_member
before insert or update or delete on public.equipment_models
for each row execute function private.require_active_team_member();

create trigger equipment_assets_require_active_team_member
before insert or update or delete on public.equipment_assets
for each row execute function private.require_active_team_member();

create trigger equipment_movements_require_active_team_member
before insert or update or delete on public.equipment_movements
for each row execute function private.require_active_team_member();

create trigger equipment_movement_items_require_active_team_member
before insert or update or delete on public.equipment_movement_items
for each row execute function private.require_active_team_member();
