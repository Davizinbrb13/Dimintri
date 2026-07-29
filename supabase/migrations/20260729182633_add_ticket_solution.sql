alter table public.tickets
add column if not exists solution text;

update public.tickets
set solution = coalesce(
  nullif(btrim(notes), ''),
  nullif(btrim(diagnosis), ''),
  'Solucao registrada antes da criacao deste campo.'
)
where resolved
  and nullif(btrim(solution), '') is null;

alter table public.tickets
drop constraint if exists tickets_resolved_requires_diagnosis;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tickets_solution_length'
      and conrelid = 'public.tickets'::regclass
  ) then
    alter table public.tickets
    add constraint tickets_solution_length
      check (solution is null or char_length(btrim(solution)) <= 4000);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'tickets_resolved_requires_solution'
      and conrelid = 'public.tickets'::regclass
  ) then
    alter table public.tickets
    add constraint tickets_resolved_requires_solution
      check (resolved = false or nullif(btrim(solution), '') is not null);
  end if;
end;
$$;

grant update (solution) on table public.tickets to authenticated;
