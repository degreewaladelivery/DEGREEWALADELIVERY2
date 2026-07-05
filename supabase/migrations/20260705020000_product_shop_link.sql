-- ============================================================================
-- Let a Category item optionally also appear in a Shop.
--
-- A product's home stays its category (single source of truth). Setting
-- `shop_id` tags it to a shop so the same item is *also* showcased there —
-- no duplicated row to keep in sync. ON DELETE SET NULL: deleting the shop
-- just un-links the item, it stays in its category.
-- ============================================================================

alter table products
  add column shop_id uuid references shops (id) on delete set null;

-- Expose shop_id to customer-facing clients so a shop page can pull in the
-- category items linked to it (UNION with shop_products, done app-side later).
drop view products_catalog;

create view products_catalog as
  select
    id, category_id, subcategory_id, shop_id, name, description,
    gst_percent, mrp, retail_price, image_url, is_active, created_at, updated_at
  from products
  where is_active = true;

grant select on products_catalog to anon, authenticated;
