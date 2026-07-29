create index requesters_created_by_idx on public.requesters (created_by);
create index sectors_created_by_idx on public.sectors (created_by);
create index ticket_history_actor_idx on public.ticket_history (actor_id);
