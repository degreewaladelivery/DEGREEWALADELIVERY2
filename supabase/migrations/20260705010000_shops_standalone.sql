-- ============================================================================
-- Shops: a second, fully independent top-level entity alongside Categories.
-- Deliberately NOT linked to categories/subcategories/products in any way —
-- Shops has its own parallel structure (Shop -> optional ShopCategory ->
-- ShopProduct) so nothing here can ever touch or break the Categories tab.
-- ============================================================================

create table shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  description text,
  -- Both optional: a shop may not have a rating or a delivery-time estimate yet.
  rating numeric(2, 1),
  delivery_time text,
  is_featured boolean not null default false,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table shops enable row level security;

create policy "Public can view active shops"
  on shops for select
  using (is_active = true);

create policy "Admins have full access to shops"
  on shops for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

create trigger shops_set_updated_at before update on shops
  for each row execute function set_updated_at();

-- ---- A shop's own optional categories --------------------------------------
create table shop_categories (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops (id) on delete cascade,
  name text not null,
  image_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, shop_id)
);

alter table shop_categories enable row level security;

create policy "Public can view active shop categories"
  on shop_categories for select
  using (is_active = true);

create policy "Admins have full access to shop categories"
  on shop_categories for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

create trigger shop_categories_set_updated_at before update on shop_categories
  for each row execute function set_updated_at();

-- ---- A shop's items ---------------------------------------------------------
-- Same shape/rules as `products`: `barcode` is admin-only (no public SELECT
-- policy on this table; customer apps read shop_products_catalog instead).
create table shop_products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops (id) on delete cascade,
  shop_category_id uuid references shop_categories (id) on delete set null,
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
  foreign key (shop_category_id, shop_id) references shop_categories (id, shop_id)
);

alter table shop_products enable row level security;

create policy "Admins have full access to shop products"
  on shop_products for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

create trigger shop_products_set_updated_at before update on shop_products
  for each row execute function set_updated_at();

create view shop_products_catalog as
  select
    id, shop_id, shop_category_id, name, description,
    gst_percent, mrp, retail_price, image_url, is_active, created_at, updated_at
  from shop_products
  where is_active = true;

grant select on shop_products_catalog to anon, authenticated;
