create table public.equipment_categories (
  id bigint generated always as identity primary key,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index equipment_categories_name_unique
  on public.equipment_categories (lower(btrim(name)));

create table public.equipment_models (
  id bigint generated always as identity primary key,
  category_id bigint references public.equipment_categories (id) on delete set null,
  name text not null check (char_length(btrim(name)) between 2 and 160),
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index equipment_models_name_unique
  on public.equipment_models (lower(btrim(name)));
create index equipment_models_category_idx
  on public.equipment_models (category_id);

create table public.equipment_assets (
  id bigint generated always as identity primary key,
  model_id bigint not null references public.equipment_models (id) on delete restrict,
  serial_number text not null check (
    char_length(btrim(serial_number)) between 2 and 100
    and btrim(serial_number) ~ '^[[:alnum:]./_-]+$'
  ),
  status text not null default 'available'
    check (status in ('available', 'assigned', 'maintenance', 'retired')),
  current_requester_id bigint references public.requesters (id) on delete set null,
  current_campus_id smallint references public.campuses (id) on delete set null,
  current_sector_id bigint references public.sectors (id) on delete set null,
  notes text check (notes is null or char_length(btrim(notes)) <= 2000),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint equipment_assets_assigned_has_requester check (
    status <> 'assigned' or current_requester_id is not null
  )
);

create unique index equipment_assets_serial_unique
  on public.equipment_assets (upper(btrim(serial_number)));
create index equipment_assets_model_idx on public.equipment_assets (model_id);
create index equipment_assets_status_idx on public.equipment_assets (status);
create index equipment_assets_requester_idx on public.equipment_assets (current_requester_id);
create index equipment_assets_campus_idx on public.equipment_assets (current_campus_id);
create index equipment_assets_sector_idx on public.equipment_assets (current_sector_id);

create table public.equipment_movements (
  id bigint generated always as identity primary key,
  movement_type text not null
    check (movement_type in ('delivery', 'return', 'transfer', 'maintenance', 'retirement')),
  requester_id bigint not null references public.requesters (id) on delete restrict,
  destination_campus_id smallint references public.campuses (id) on delete restrict,
  destination_sector_id bigint references public.sectors (id) on delete restrict,
  notes text check (notes is null or char_length(btrim(notes)) <= 2000),
  technician_id uuid not null references public.profiles (id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  constraint equipment_movements_destination_required check (
    movement_type = 'retirement' or destination_campus_id is not null
  )
);

create table public.equipment_movement_items (
  id bigint generated always as identity primary key,
  movement_id bigint not null references public.equipment_movements (id) on delete restrict,
  asset_id bigint not null references public.equipment_assets (id) on delete restrict,
  previous_status text not null
    check (previous_status in ('available', 'assigned', 'maintenance', 'retired')),
  origin_requester_id bigint references public.requesters (id) on delete set null,
  origin_campus_id smallint references public.campuses (id) on delete set null,
  origin_sector_id bigint references public.sectors (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (movement_id, asset_id)
);

create index equipment_movements_created_idx
  on public.equipment_movements (created_at desc);
create index equipment_movements_type_created_idx
  on public.equipment_movements (movement_type, created_at desc);
create index equipment_movements_requester_idx
  on public.equipment_movements (requester_id);
create index equipment_movements_technician_idx
  on public.equipment_movements (technician_id);
create index equipment_movements_destination_campus_idx
  on public.equipment_movements (destination_campus_id);
create index equipment_movements_destination_sector_idx
  on public.equipment_movements (destination_sector_id);
create index equipment_movement_items_asset_idx
  on public.equipment_movement_items (asset_id, created_at desc);
create index equipment_movement_items_origin_requester_idx
  on public.equipment_movement_items (origin_requester_id);
create index equipment_movement_items_origin_campus_idx
  on public.equipment_movement_items (origin_campus_id);
create index equipment_movement_items_origin_sector_idx
  on public.equipment_movement_items (origin_sector_id);

create trigger equipment_categories_set_updated_at
before update on public.equipment_categories
for each row execute function private.set_updated_at();

create trigger equipment_models_set_updated_at
before update on public.equipment_models
for each row execute function private.set_updated_at();

create trigger equipment_assets_set_updated_at
before update on public.equipment_assets
for each row execute function private.set_updated_at();

create or replace function private.register_equipment_assets(
  p_model_name text,
  p_serial_numbers text[],
  p_category_name text default null,
  p_initial_campus_id smallint default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_category_id bigint;
  v_model_id bigint;
  v_serials text[];
  v_asset_ids bigint[];
begin
  if v_user_id is null or not exists (
    select 1 from public.profiles where id = v_user_id
  ) then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if nullif(btrim(p_model_name), '') is null
    or char_length(btrim(p_model_name)) not between 2 and 160 then
    raise exception 'Invalid equipment name' using errcode = '22023';
  end if;

  select array_agg(serial_number order by serial_number)
  into v_serials
  from (
    select distinct upper(btrim(value)) as serial_number
    from unnest(coalesce(p_serial_numbers, array[]::text[])) as serials(value)
    where nullif(btrim(value), '') is not null
  ) normalized;

  if coalesce(cardinality(v_serials), 0) = 0 then
    raise exception 'At least one serial is required' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(v_serials) as serials(value)
    where char_length(value) not between 2 and 100
      or value !~ '^[[:alnum:]./_-]+$'
  ) then
    raise exception 'Invalid serial number' using errcode = '22023';
  end if;

  if p_initial_campus_id is not null and not exists (
    select 1 from public.campuses
    where id = p_initial_campus_id and is_active
  ) then
    raise exception 'Invalid campus' using errcode = '22023';
  end if;

  if nullif(btrim(p_category_name), '') is not null then
    insert into public.equipment_categories (name, created_by)
    values (btrim(p_category_name), v_user_id)
    on conflict (lower(btrim(name))) do update
      set name = public.equipment_categories.name
    returning id into v_category_id;
  end if;

  insert into public.equipment_models (name, category_id, created_by)
  values (btrim(p_model_name), v_category_id, v_user_id)
  on conflict (lower(btrim(name))) do update
    set category_id = coalesce(public.equipment_models.category_id, excluded.category_id),
        is_active = true
  returning id into v_model_id;

  if exists (
    select 1
    from public.equipment_assets
    where upper(btrim(serial_number)) = any(v_serials)
  ) then
    raise exception 'Serial number already registered' using errcode = '23505';
  end if;

  with inserted as (
    insert into public.equipment_assets (
      model_id,
      serial_number,
      current_campus_id,
      notes,
      created_by
    )
    select
      v_model_id,
      serial_number,
      p_initial_campus_id,
      nullif(btrim(p_notes), ''),
      v_user_id
    from unnest(v_serials) as serials(serial_number)
    returning id
  )
  select array_agg(id order by id) into v_asset_ids from inserted;

  return jsonb_build_object(
    'model_id', v_model_id,
    'asset_ids', to_jsonb(v_asset_ids),
    'created_count', cardinality(v_asset_ids)
  );
end;
$$;

create or replace function private.create_equipment_movement(
  p_movement_type text,
  p_requester_id bigint,
  p_asset_ids bigint[],
  p_destination_campus_id smallint default null,
  p_destination_sector_id bigint default null,
  p_notes text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_movement_id bigint;
  v_asset_id bigint;
  v_asset public.equipment_assets%rowtype;
  v_asset_ids bigint[];
begin
  if v_user_id is null or not exists (
    select 1 from public.profiles where id = v_user_id
  ) then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_movement_type not in ('delivery', 'return', 'transfer', 'maintenance', 'retirement') then
    raise exception 'Invalid movement type' using errcode = '22023';
  end if;

  if p_movement_type = 'retirement' and not (select private.is_admin()) then
    raise exception 'Only administrators can retire equipment' using errcode = '42501';
  end if;

  if not exists (select 1 from public.requesters where id = p_requester_id) then
    raise exception 'Invalid requester' using errcode = '22023';
  end if;

  select array_agg(asset_id order by asset_id)
  into v_asset_ids
  from (
    select distinct value as asset_id
    from unnest(coalesce(p_asset_ids, array[]::bigint[])) as assets(value)
    where value is not null
  ) normalized;

  if coalesce(cardinality(v_asset_ids), 0) = 0 then
    raise exception 'At least one asset is required' using errcode = '22023';
  end if;

  if p_movement_type <> 'retirement' then
    if p_destination_campus_id is null or not exists (
      select 1 from public.campuses
      where id = p_destination_campus_id and is_active
    ) then
      raise exception 'Invalid destination campus' using errcode = '22023';
    end if;
  end if;

  if p_destination_sector_id is not null and not exists (
    select 1 from public.sectors
    where id = p_destination_sector_id and is_active
  ) then
    raise exception 'Invalid destination sector' using errcode = '22023';
  end if;

  insert into public.equipment_movements (
    movement_type,
    requester_id,
    destination_campus_id,
    destination_sector_id,
    notes,
    technician_id
  )
  values (
    p_movement_type,
    p_requester_id,
    case when p_movement_type = 'retirement' then null else p_destination_campus_id end,
    case when p_movement_type = 'retirement' then null else p_destination_sector_id end,
    nullif(btrim(p_notes), ''),
    v_user_id
  )
  returning id into v_movement_id;

  foreach v_asset_id in array v_asset_ids loop
    select * into v_asset
    from public.equipment_assets
    where id = v_asset_id
    for update;

    if not found then
      raise exception 'Equipment not found' using errcode = '22023';
    end if;

    if v_asset.status = 'retired' then
      raise exception 'Retired equipment cannot be moved' using errcode = '23514';
    end if;

    if p_movement_type = 'delivery' and v_asset.status <> 'available' then
      raise exception 'Only available equipment can be delivered' using errcode = '23514';
    end if;

    if p_movement_type = 'return' and v_asset.status not in ('assigned', 'maintenance') then
      raise exception 'Only assigned or maintenance equipment can be returned' using errcode = '23514';
    end if;

    insert into public.equipment_movement_items (
      movement_id,
      asset_id,
      previous_status,
      origin_requester_id,
      origin_campus_id,
      origin_sector_id
    )
    values (
      v_movement_id,
      v_asset.id,
      v_asset.status,
      v_asset.current_requester_id,
      v_asset.current_campus_id,
      v_asset.current_sector_id
    );

    update public.equipment_assets
    set
      status = case p_movement_type
        when 'delivery' then 'assigned'
        when 'return' then 'available'
        when 'maintenance' then 'maintenance'
        when 'retirement' then 'retired'
        else status
      end,
      current_requester_id = case p_movement_type
        when 'delivery' then p_requester_id
        when 'return' then null
        when 'maintenance' then null
        when 'retirement' then null
        else current_requester_id
      end,
      current_campus_id = case p_movement_type
        when 'retirement' then current_campus_id
        else p_destination_campus_id
      end,
      current_sector_id = case p_movement_type
        when 'retirement' then null
        else p_destination_sector_id
      end
    where id = v_asset.id;
  end loop;

  return v_movement_id;
end;
$$;

create or replace function public.register_equipment_assets(
  p_model_name text,
  p_serial_numbers text[],
  p_category_name text default null,
  p_initial_campus_id smallint default null,
  p_notes text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.register_equipment_assets(
    p_model_name,
    p_serial_numbers,
    p_category_name,
    p_initial_campus_id,
    p_notes
  );
$$;

create or replace function public.create_equipment_movement(
  p_movement_type text,
  p_requester_id bigint,
  p_asset_ids bigint[],
  p_destination_campus_id smallint default null,
  p_destination_sector_id bigint default null,
  p_notes text default null
)
returns bigint
language sql
security invoker
set search_path = ''
as $$
  select private.create_equipment_movement(
    p_movement_type,
    p_requester_id,
    p_asset_ids,
    p_destination_campus_id,
    p_destination_sector_id,
    p_notes
  );
$$;

revoke all on function private.register_equipment_assets(text, text[], text, smallint, text)
  from public, anon, authenticated;
revoke all on function private.create_equipment_movement(text, bigint, bigint[], smallint, bigint, text)
  from public, anon, authenticated;
revoke all on function public.register_equipment_assets(text, text[], text, smallint, text)
  from public, anon, authenticated;
revoke all on function public.create_equipment_movement(text, bigint, bigint[], smallint, bigint, text)
  from public, anon, authenticated;

grant execute on function private.register_equipment_assets(text, text[], text, smallint, text)
  to authenticated;
grant execute on function private.create_equipment_movement(text, bigint, bigint[], smallint, bigint, text)
  to authenticated;
grant execute on function public.register_equipment_assets(text, text[], text, smallint, text)
  to authenticated;
grant execute on function public.create_equipment_movement(text, bigint, bigint[], smallint, bigint, text)
  to authenticated;

alter table public.equipment_categories enable row level security;
alter table public.equipment_models enable row level security;
alter table public.equipment_assets enable row level security;
alter table public.equipment_movements enable row level security;
alter table public.equipment_movement_items enable row level security;

create policy equipment_categories_select_authenticated
on public.equipment_categories for select
to authenticated
using (true);

create policy equipment_models_select_authenticated
on public.equipment_models for select
to authenticated
using (true);

create policy equipment_assets_select_authenticated
on public.equipment_assets for select
to authenticated
using (true);

create policy equipment_movements_select_authenticated
on public.equipment_movements for select
to authenticated
using (true);

create policy equipment_movement_items_select_authenticated
on public.equipment_movement_items for select
to authenticated
using (true);

revoke all on table public.equipment_categories from anon, authenticated;
revoke all on table public.equipment_models from anon, authenticated;
revoke all on table public.equipment_assets from anon, authenticated;
revoke all on table public.equipment_movements from anon, authenticated;
revoke all on table public.equipment_movement_items from anon, authenticated;

grant select on table public.equipment_categories to authenticated;
grant select on table public.equipment_models to authenticated;
grant select on table public.equipment_assets to authenticated;
grant select on table public.equipment_movements to authenticated;
grant select on table public.equipment_movement_items to authenticated;
