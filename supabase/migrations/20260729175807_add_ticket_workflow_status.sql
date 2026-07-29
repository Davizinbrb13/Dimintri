alter table public.tickets
add column if not exists status text;

update public.tickets
set status = case when resolved then 'resolved' else 'new' end
where status is null;

alter table public.tickets
alter column status set default 'new',
alter column status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tickets_status_valid'
      and conrelid = 'public.tickets'::regclass
  ) then
    alter table public.tickets
    add constraint tickets_status_valid
      check (status in ('new', 'progress', 'resolved'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'tickets_status_matches_resolved'
      and conrelid = 'public.tickets'::regclass
  ) then
    alter table public.tickets
    add constraint tickets_status_matches_resolved
      check ((status = 'resolved') = resolved);
  end if;
end;
$$;

create index if not exists tickets_status_created_idx
on public.tickets (status, created_at desc);

grant update (status) on table public.tickets to authenticated;
