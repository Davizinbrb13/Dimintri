create index profiles_access_revoked_by_idx
  on public.profiles (access_revoked_by)
  where access_revoked_by is not null;
