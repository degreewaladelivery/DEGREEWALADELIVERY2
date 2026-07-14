alter table products add column unit text;
alter table shop_products add column unit text;

drop view products_catalog;
create view products_catalog as
  select
    id, category_id, subcategory_id, shop_id, shop_category_id, name, description,
    unit, gst_percent, mrp, retail_price, image_url, is_active, created_at, updated_at
  from products
  where is_active = true;
grant select on products_catalog to anon, authenticated;

drop view shop_products_catalog;
create view shop_products_catalog as
  select
    id, shop_id, shop_category_id, name, description,
    unit, gst_percent, mrp, retail_price, image_url, is_active, created_at, updated_at
  from shop_products
  where is_active = true;
grant select on shop_products_catalog to anon, authenticated;
