-- Public sign-up is disabled in Auth settings. This trigger is defense in depth:
-- no newly-created account can promote itself by being the first profile.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Equipe TI'
    ),
    lower(new.email),
    'technician'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

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
  );
$$;

revoke all on function private.is_team_member() from public, anon;
grant execute on function private.is_team_member() to authenticated;

drop policy if exists campuses_select_authenticated on public.campuses;
drop policy if exists campuses_select_team on public.campuses;
create policy campuses_select_team
on public.campuses for select
to authenticated
using ((select private.is_team_member()));

drop policy if exists requesters_select_authenticated on public.requesters;
drop policy if exists requesters_select_team on public.requesters;
create policy requesters_select_team
on public.requesters for select
to authenticated
using ((select private.is_team_member()));

drop policy if exists sectors_select_authenticated on public.sectors;
drop policy if exists sectors_select_team on public.sectors;
create policy sectors_select_team
on public.sectors for select
to authenticated
using ((select private.is_team_member()));

drop policy if exists equipment_categories_select_authenticated on public.equipment_categories;
drop policy if exists equipment_categories_select_team on public.equipment_categories;
create policy equipment_categories_select_team
on public.equipment_categories for select
to authenticated
using ((select private.is_team_member()));

drop policy if exists equipment_models_select_authenticated on public.equipment_models;
drop policy if exists equipment_models_select_team on public.equipment_models;
create policy equipment_models_select_team
on public.equipment_models for select
to authenticated
using ((select private.is_team_member()));

drop policy if exists equipment_assets_select_authenticated on public.equipment_assets;
drop policy if exists equipment_assets_select_team on public.equipment_assets;
create policy equipment_assets_select_team
on public.equipment_assets for select
to authenticated
using ((select private.is_team_member()));

drop policy if exists equipment_movements_select_authenticated on public.equipment_movements;
drop policy if exists equipment_movements_select_team on public.equipment_movements;
create policy equipment_movements_select_team
on public.equipment_movements for select
to authenticated
using ((select private.is_team_member()));

drop policy if exists equipment_movement_items_select_authenticated on public.equipment_movement_items;
drop policy if exists equipment_movement_items_select_team on public.equipment_movement_items;
create policy equipment_movement_items_select_team
on public.equipment_movement_items for select
to authenticated
using ((select private.is_team_member()));

revoke create on schema public from public, anon, authenticated;
