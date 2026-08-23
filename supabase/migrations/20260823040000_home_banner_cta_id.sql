-- Point the banner's call-to-action at a category id rather than its key.
--
-- A category key is not stored anywhere: the apps derive it from the name with
-- slugify(). Persisting one would mean renaming "Food" to "Food & Drink"
-- silently broke the home page's main button, with nothing to catch it. The id
-- survives a rename, and the foreign key clears the CTA if the category is ever
-- deleted rather than leaving it pointing at nothing.
--
-- Safe to swap outright: the column was added minutes ago and is still null.
alter table home_banner drop column if exists cta_category_key;

alter table home_banner
  add column if not exists cta_category_id uuid references categories (id) on delete set null;
