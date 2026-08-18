/**
 * Shrink catalogue images that are already in storage.
 *
 * Photos uploaded before resize-on-upload existed are still at full camera
 * resolution — averaging ~700 KB, some past 5 MB. Customers no longer download
 * those (images are resized on delivery), but storage still holds them and
 * every cache miss re-renders from the full-size source.
 *
 * Each image is rewritten in place, so no database rows change and no URL
 * moves. That also makes this irreversible: the original bytes are replaced.
 * It therefore reports by default and only writes when told to.
 *
 *   Dry run:  SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill-images.mjs
 *   Apply:    SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill-images.mjs --apply
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const APPLY = process.argv.includes('--apply');

const env = Object.fromEntries(
  readFileSync(new URL('../web/.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error(
    'Missing SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Supabase dashboard -> Project settings -> API -> service_role key.\n\n' +
      '  SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/backfill-images.mjs\n'
  );
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const BUCKET = 'catalog-images';
const OBJECT_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
const MAX_DIMENSION = 1400;
const QUALITY = 82;
/** Below this, re-encoding costs quality for almost no saving. */
const SKIP_UNDER_BYTES = 120_000;

/** Every table that points at an image in this bucket. */
const SOURCES = [
  ['products_catalog', 'image_url'],
  ['shop_products_catalog', 'image_url'],
  ['categories', 'image_url'],
  ['subcategories', 'image_url'],
  ['shops', 'image_url'],
];

async function collectPaths() {
  const paths = new Set();
  for (const [table, column] of SOURCES) {
    const { data, error } = await db.from(table).select(column).not(column, 'is', null);
    if (error) {
      console.warn(`  (skipping ${table}: ${error.message})`);
      continue;
    }
    for (const row of data ?? []) {
      const url = row[column];
      if (typeof url === 'string' && url.startsWith(OBJECT_PREFIX)) {
        paths.add(decodeURIComponent(url.slice(OBJECT_PREFIX.length).split('?')[0]));
      }
    }
  }
  return [...paths];
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

async function main() {
  console.log(APPLY ? 'APPLYING — images will be overwritten\n' : 'DRY RUN — nothing will change\n');

  const paths = await collectPaths();
  console.log(`Found ${paths.length} images referenced by the catalogue.\n`);

  let before = 0, after = 0, changed = 0, skipped = 0, failed = 0;

  for (const path of paths) {
    try {
      const { data, error } = await db.storage.from(BUCKET).download(path);
      if (error || !data) { failed++; continue; }

      const original = Buffer.from(await data.arrayBuffer());
      before += original.length;

      if (original.length < SKIP_UNDER_BYTES) {
        after += original.length;
        skipped++;
        continue;
      }

      const resized = await sharp(original)
        .rotate() // honour EXIF orientation before dropping the metadata
        .resize({
          width: MAX_DIMENSION,
          height: MAX_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: QUALITY })
        .toBuffer();

      // Never make a file bigger.
      if (resized.length >= original.length) {
        after += original.length;
        skipped++;
        continue;
      }

      after += resized.length;
      changed++;
      console.log(`  ${kb(original.length).padStart(8)} -> ${kb(resized.length).padStart(8)}  ${path}`);

      if (APPLY) {
        const { error: upErr } = await db.storage.from(BUCKET).upload(path, resized, {
          contentType: 'image/webp',
          cacheControl: '31536000',
          upsert: true,
        });
        if (upErr) { failed++; console.warn(`    upload failed: ${upErr.message}`); }
      }
    } catch (err) {
      failed++;
      console.warn(`  failed: ${path} — ${err.message}`);
    }
  }

  const saved = before - after;
  console.log(`\n${changed} to shrink, ${skipped} already small, ${failed} failed`);
  console.log(`${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB` +
    (before ? `  (${((saved / before) * 100).toFixed(0)}% saved)` : ''));
  if (!APPLY && changed) console.log('\nRe-run with --apply to write these changes.');
}

main().catch((err) => { console.error(err); process.exit(1); });
