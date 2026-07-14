-- ============================================================================
-- Cross-listing: an item's home stays its category (products.category_id), but
-- it can ALSO be shown under other categories. e.g. a baby-care item lives in
-- Grocery yet should also appear under Medical.
--
-- This join table holds only the EXTRA categories (never the primary one).
-- ============================================================================

create table product_categories (
  product_id uuid not null references products (id) on delete cascade,
  category_id uuid not null references categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, category_id)
);

alter table product_categories enable row level security;

-- Public may read the links (joined with products_catalog, which is already
-- limited to active items — so only visible items ever surface).
create policy "Public can view product-category links"
  on product_categories for select
  using (true);

create policy "Admins manage product-category links"
  on product_categories for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));
