-- The `admins` table has no SELECT policy at all (locked down), so the
-- frontend needs a safe, narrow way to ask "is the current session an
-- admin?" without exposing the table itself.
create or replace function am_i_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select is_admin(auth.uid());
$$;

grant execute on function am_i_admin() to authenticated;
