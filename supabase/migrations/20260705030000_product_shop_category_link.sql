alter table products
  add column shop_category_id uuid references shop_categories (id) on delete set null;

alter table products
  add foreign key (shop_category_id, shop_id) references shop_categories (id, shop_id);

alter table products
  add constraint products_shop_category_needs_shop
  check (shop_category_id is null or shop_id is not null);

drop view products_catalog;

create view products_catalog as
  select
    id, category_id, subcategory_id, shop_id, shop_category_id, name, description,
    gst_percent, mrp, retail_price, image_url, is_active, created_at, updated_at
  from products
  where is_active = true;

grant select on products_catalog to anon, authenticated;
