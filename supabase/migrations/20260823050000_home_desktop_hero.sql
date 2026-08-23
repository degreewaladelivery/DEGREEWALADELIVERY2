-- The desktop landing illustration, alongside the banner.
--
-- A separate column rather than reusing image_url, because the two slots want
-- different pictures: the banner is a wide strip roughly twice as wide as it is
-- tall, while this sits in a tall column beside the headline on a wide screen.
-- One upload driving both would crop at least one of them badly.
--
-- Web only — the app has no equivalent slot, and nothing about this reaches it.
alter table home_banner
  add column if not exists desktop_hero_url text;
