create table shops (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories (id) on delete cascade,
  subcategory_id uuid references subcategories (id) on delete set null,
  name text not null,
  image_url text,
  description text,
  rating numeric(2, 1) not null default 0,
  delivery_time text,
  is_featured boolean not null default false,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (subcategory_id, category_id) references subcategories (id, category_id)
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

drop view products_catalog;

alter table products drop column category_id;
alter table products drop column subcategory_id;

alter table products add column shop_id uuid references shops (id) on delete cascade;
alter table products add column shop_category_id uuid references shop_categories (id) on delete set null;

alter table products alter column shop_id set not null;

alter table products add foreign key (shop_category_id, shop_id) references shop_categories (id, shop_id);

create view products_catalog as
  select
    id, shop_id, shop_category_id, name, description,
    gst_percent, mrp, retail_price, image_url, is_active, created_at, updated_at
  from products
  where is_active = true;

grant select on products_catalog to anon, authenticated;
