insert into subcategories (category_id, name, image_url, sort_order, is_active)
select category_id, name, image_url, sort_order, is_active from shops;

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

drop view products_catalog;

alter table products drop column shop_id;
alter table products drop column shop_category_id;

drop table shop_categories;
drop table shops;

create view products_catalog as
  select
    id, category_id, subcategory_id, name, description,
    gst_percent, mrp, retail_price, image_url, is_active, created_at, updated_at
  from products
  where is_active = true;

grant select on products_catalog to anon, authenticated;
