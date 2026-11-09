drop policy if exists "admins delete updates" on public.updates;
create policy "admins delete updates"
  on public.updates
  for delete
  to authenticated
  using (exists (
    select 1
    from public.admins
    where public.admins.user_id = auth.uid()
  ));
