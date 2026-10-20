// Regenerates supabase/setup_all.sql from the ordered migrations + seed.
// Run with: node scripts/make-setup-sql.mjs
import { readFileSync, writeFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const files = [
  'supabase/migrations/0001_shop_init.sql',
  'supabase/migrations/0002_stock_and_payment.sql',
  'supabase/migrations/0003_production_hardening.sql',
  'supabase/seed.sql',
]

const header = `-- ============================================================
-- Health Harmony - one-shot setup for a NEW Supabase project
-- Run the whole file in Supabase SQL Editor (Run, not Run selected).
-- Includes: schema + RLS + stock/payment functions + seed catalog.
--
-- IMPORTANT: use a clean project. If public.products already exists
-- with another schema, this script stops before changing anything.
-- It never drops or deletes existing tables/data.
-- ============================================================

do $preflight$
begin
  if to_regclass('public.products') is not null
     and not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'products' and column_name = 'slug'
     )
  then
    raise exception 'public.products already exists with a different schema. Use a new Supabase project or archive that table first.';
  end if;
end
$preflight$;

`

const body = files
  .map((file) => `-- >>> ${file} >>>\n\n${readFileSync(join(root, file), 'utf8').replace(/^\uFEFF/, '')}`)
  .join('\n\n')

const footer = `
-- Ask PostgREST to pick up the new schema immediately.
notify pgrst, 'reload schema';
`

const out = join(root, 'supabase/setup_all.sql')
writeFileSync(out, `${header}${body}${footer}`, 'utf8')
console.log(`wrote ${out} (${statSync(out).size} bytes)`)
