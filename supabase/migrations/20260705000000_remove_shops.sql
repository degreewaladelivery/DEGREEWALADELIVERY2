-- ============================================================================
-- Revert: no "Shop" entity. Back to the simpler, original structure:
-- Category -> optional Subcategory -> Items, directly.
--
-- The 4 real shops (B Mart, Goodluck Medical, Seegodu Cafe, Saraswati Store)
-- are preserved as subcategories (name + photo) under their category, so
-- customers still see them as a filter/tag. Goodluck Medical's 3 real items
-- move with it, re-pointed at category_id/subcategory_id instead of
-- shop_id/shop_category_id.
-- ============================================================================

-- ---- 1. Turn each shop into a subcategory (same name + photo) --------------
insert into subcategories (category_id, name, image_url, sort_order, is_active)
select category_id, name, image_url, sort_order, is_active from shops;

-- ---- 2. Re-add category_id/subcategory_id to products, backfilled ---------
alter table products add column category_id uuid references categories (id) on delete cascade;
alter table products add column subcategory_id uuid references subcategories (id) on delete set null;

update products p
set category_id = s.category_id,
    subcategory_id = sub.id
from shops s
join subcategories sub on sub.category_id = s.category_id and sub.name = s.name
where p.shop_id = s.id;

alter table products alter column category_id set not null;

alter table products add foreign key (subcategory_id, category_id) references subcategories (id, category_id);

-- ---- 3. Drop the shop-owned columns/tables ---------------------------------
drop view products_catalog;

alter table products drop column shop_id;
alter table products drop column shop_category_id;

drop table shop_categories;
drop table shops;

-- ---- 4. Recreate the public view against category_id/subcategory_id -------
create view products_catalog as
  select
    id, category_id, subcategory_id, name, description,
    gst_percent, mrp, retail_price, image_url, is_active, created_at, updated_at
  from products
  where is_active = true;

grant select on products_catalog to anon, authenticated;
