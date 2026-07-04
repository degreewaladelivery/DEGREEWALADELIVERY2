-- Reverting the previous migration: category colour/tint is not admin-
-- editable after all — every category's banner/accent just uses the
-- single brand default (#FF6B00) everywhere.
alter table categories drop column color;
alter table categories drop column tint;
