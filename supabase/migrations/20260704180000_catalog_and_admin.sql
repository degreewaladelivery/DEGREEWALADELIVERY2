-- ============================================================================
-- Catalog schema: categories -> (optional) subcategories -> products,
-- plus an admin allowlist that RLS policies check against.
-- ============================================================================

-- ---- Admins -----------------------------------------------------------------
-- Membership table for "who can manage the catalog". auth.uid() is checked
-- against this table (via is_admin()) in every write policy below.
create table admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table admins enable row level security;
-- No policies = nobody can read/write this table directly via the API;
-- only is_admin() (security definer) can see into it.

create or replace function is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from admins where user_id = uid);
$$;

-- ---- Categories ---------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  -- Optional short badge shown on the category tile, e.g. "20% OFF". Null = no badge.
  offer_badge text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table categories enable row level security;

create policy "Public can view active categories"
  on categories for select
  using (is_active = true);

create policy "Admins have full access to categories"
  on categories for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

-- ---- Subcategories --------------------------------------------------------
-- Optional layer: a category may have zero subcategories, in which case its
-- products just attach directly to the category (subcategory_id null).
create table subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- lets products enforce "subcategory belongs to the same category" via a
  -- composite FK below (a plain CHECK can't run a subquery).
  unique (id, category_id)
);

alter table subcategories enable row level security;

create policy "Public can view active subcategories"
  on subcategories for select
  using (is_active = true);

create policy "Admins have full access to subcategories"
  on subcategories for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

-- ---- Products (items) -----------------------------------------------------
-- `barcode` is intentionally admin-only: there is no public SELECT policy on
-- this table at all. Customer-facing apps read through the `products_catalog`
-- view below instead, which never exposes the column.
create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories (id) on delete cascade,
  subcategory_id uuid references subcategories (id) on delete set null,
  name text not null,
  description text,
  barcode text,
  gst_percent numeric(5, 2) not null default 0,
  mrp numeric(10, 2) not null,
  retail_price numeric(10, 2) not null,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- If subcategory_id is set, it must belong to the same category_id.
  -- (When subcategory_id is null this FK is trivially satisfied — MATCH SIMPLE.)
  foreign key (subcategory_id, category_id) references subcategories (id, category_id)
);

alter table products enable row level security;

-- Admin-only at the table level (this is where `barcode` lives).
create policy "Admins have full access to products"
  on products for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

-- Public, barcode-free read surface for the customer apps.
create view products_catalog as
  select
    id, category_id, subcategory_id, name, description,
    gst_percent, mrp, retail_price, image_url, is_active, created_at, updated_at
  from products
  where is_active = true;

grant select on products_catalog to anon, authenticated;

-- ---- updated_at housekeeping ------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger categories_set_updated_at before update on categories
  for each row execute function set_updated_at();
create trigger subcategories_set_updated_at before update on subcategories
  for each row execute function set_updated_at();
create trigger products_set_updated_at before update on products
  for each row execute function set_updated_at();

-- ---- Storage: catalog images ------------------------------------------------
insert into storage.buckets (id, name, public)
values ('catalog-images', 'catalog-images', true)
on conflict (id) do nothing;

create policy "Public can view catalog images"
  on storage.objects for select
  using (bucket_id = 'catalog-images');

create policy "Admins can upload catalog images"
  on storage.objects for insert
  with check (bucket_id = 'catalog-images' and is_admin(auth.uid()));

create policy "Admins can update catalog images"
  on storage.objects for update
  using (bucket_id = 'catalog-images' and is_admin(auth.uid()));

create policy "Admins can delete catalog images"
  on storage.objects for delete
  using (bucket_id = 'catalog-images' and is_admin(auth.uid()));
