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
