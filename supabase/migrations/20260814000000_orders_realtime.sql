-- Let agents' dashboards hear about new orders the moment they are placed,
-- instead of waiting up to a poll interval.
--
-- Realtime still applies RLS, so an agent only receives rows they are allowed
-- to see: unclaimed orders, and their own claims. A job claimed by someone else
-- simply stops being visible to them.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table orders;
  end if;
end
$$;
