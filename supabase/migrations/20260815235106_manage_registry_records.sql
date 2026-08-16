alter table public.requesters
  add column if not exists is_active boolean not null default true;

alter table public.equipment_assets
  add column if not exists is_active boolean not null default true;

alter table public.equipment_assets
  drop constraint if exists equipment_assets_inactive_requires_terminal_status;

alter table public.equipment_assets
  add constraint equipment_assets_inactive_requires_terminal_status
  check (is_active or status in ('available', 'retired'));

create index if not exists requesters_active_created_idx
  on public.requesters (created_at desc)
  where is_active;

create index if not exists equipment_assets_active_created_idx
  on public.equipment_assets (created_at desc)
  where is_active;

drop policy if exists equipment_assets_update_creator_or_admin on public.equipment_assets;
create policy equipment_assets_update_creator_or_admin
on public.equipment_assets for update
to authenticated
using (
  (select private.is_team_member())
  and ((select auth.uid()) = created_by or (select private.is_admin()))
)
with check (
  (select private.is_team_member())
  and ((select auth.uid()) = created_by or (select private.is_admin()))
);

grant update on table public.requesters, public.sectors to authenticated;
grant update (model_id, serial_number, notes, is_active)
  on table public.equipment_assets to authenticated;

create or replace function private.require_active_requester()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.requesters
    where id = new.requester_id and is_active
  ) then
    raise exception 'Active requester required' using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function private.require_active_equipment_asset()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.equipment_assets
    where id = new.asset_id and is_active
  ) then
    raise exception 'Inactive equipment cannot be moved' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.require_active_requester() from public, anon, authenticated;
revoke all on function private.require_active_equipment_asset() from public, anon, authenticated;

drop trigger if exists tickets_require_active_requester on public.tickets;
create trigger tickets_require_active_requester
before insert or update of requester_id on public.tickets
for each row execute function private.require_active_requester();

drop trigger if exists equipment_movements_require_active_requester on public.equipment_movements;
create trigger equipment_movements_require_active_requester
before insert or update of requester_id on public.equipment_movements
for each row execute function private.require_active_requester();

drop trigger if exists equipment_movement_items_require_active_asset on public.equipment_movement_items;
create trigger equipment_movement_items_require_active_asset
before insert on public.equipment_movement_items
for each row execute function private.require_active_equipment_asset();
