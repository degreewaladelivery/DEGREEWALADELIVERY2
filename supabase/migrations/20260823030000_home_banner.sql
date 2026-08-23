-- The home page hero was a picture compiled into the app.
--
-- Changing it meant a developer, a rebuild and — on Android — every customer
-- reinstalling. For the one image the business most wants to change (a
-- festival, a new shop, a weekend offer) that is the wrong shape entirely.
--
-- A single row, like app_settings: there is one hero, and giving it an id
-- column would invite a list nobody renders.
create table home_banner (
  id boolean primary key default true,

  -- Null falls back to the picture bundled with the app, so the home page is
  -- never blank while nobody has uploaded anything yet.
  image_url text,

  -- The category the ORDER NOW button opens, stored as a key rather than a
  -- path: web builds a URL from it, the app pushes a screen, and neither has
  -- to parse the other's routing.
  cta_category_key text,

  -- Lets the hero be taken down without deleting the picture — the usual want
  -- after a festival, when the same banner returns next year.
  is_active boolean not null default true,

  updated_at timestamptz not null default now(),
  constraint home_banner_singleton check (id)
);

insert into home_banner (id) values (true);

alter table home_banner enable row level security;

create policy "Public can view the home banner"
  on home_banner for select using (true);

create policy "Admins manage the home banner"
  on home_banner for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

create trigger home_banner_set_updated_at before update on home_banner
  for each row execute function set_updated_at();
