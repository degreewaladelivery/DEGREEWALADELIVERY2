-- Categories drive real customer-visible styling — the category page's
-- whole hero banner gradient, plus the homepage tile's hover border and
-- shop-count badge colour — not just name/image. Both need to be admin-
-- editable to match what customers actually see.
alter table categories add column color text not null default '#FF6B00';
alter table categories add column tint text not null default '#FFF3E0';
