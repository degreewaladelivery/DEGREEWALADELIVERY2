alter table products
  add column shop_id uuid references shops (id) on delete set null;

drop view products_catalog;

create view products_catalog as
  select
    id, category_id, subcategory_id, shop_id, name, description,
    gst_percent, mrp, retail_price, image_url, is_active, created_at, updated_at
  from products
  where is_active = true;

grant select on products_catalog to anon, authenticated;
