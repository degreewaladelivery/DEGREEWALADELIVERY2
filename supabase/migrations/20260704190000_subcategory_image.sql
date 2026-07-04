-- Subcategories can now have their own image, same as categories.
alter table subcategories add column image_url text;
