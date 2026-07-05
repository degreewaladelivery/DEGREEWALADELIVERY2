-- ============================================================================
-- When a category item is linked to a shop, optionally also place it inside
-- one of that shop's own categories.
--
-- products.shop_id already links the item to a shop; this adds the optional
-- shop_category_id. A composite FK guarantees the chosen shop category
-- actually belongs to the linked shop.
-- ============================================================================

alter table products
  add column shop_category_id uuid references shop_categories (id) on delete set null;

-- The chosen shop category must belong to the linked shop.
alter table products
  add foreign key (shop_category_id, shop_id) references shop_categories (id, shop_id);

-- Can't place an item in a shop category without first linking it to a shop.
alter table products
  add constraint products_shop_category_needs_shop
  check (shop_category_id is null or shop_id is not null);

-- Expose to customer-facing clients (so a shop page can group linked items).
drop view products_catalog;

create view products_catalog as
  select
    id, category_id, subcategory_id, shop_id, shop_category_id, name, description,
    gst_percent, mrp, retail_price, image_url, is_active, created_at, updated_at
  from products
  where is_active = true;

grant select on products_catalog to anon, authenticated;
