# Health Harmony — صحتك وجمالك في مكان واحد

A complete, responsive, Arabic-first e-commerce storefront for beauty, personal care,
fitness and wellness products, with legally compliant health products controls.

**Brand:** rose-gradient heart+leaf mark · "Wellness · Balance · Vitality"
**Languages:** العربية (RTL, default) · English · Filipino — switchable from the header, preference persisted.
**Currency:** SAR (ر.س).

## Stack

- React 18 + TypeScript + Vite
- React Router 6
- Supabase (Postgres DB, Auth, Storage, Edge Functions) — **optional at runtime**
- Hand-written CSS design system (no UI framework), fully RTL-safe (logical properties)

## Data sources: demo mode vs Supabase mode

| Mode | When | Behavior |
|---|---|---|
| **Demo** (default) | No Supabase credentials in `.env` (dev server, or `VITE_ALLOW_DEMO=true`) | Full site works against a seeded local catalog; orders, accounts, reviews, addresses and admin editing persist in `localStorage` of that browser (`hh_demo_db_v2`). |
| **Supabase** | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` present | Reads/writes the real database through RLS; orders are created **only** by the `orders-create` edge function which re-verifies all prices server-side. |

> **Production guard:** a PROD build **without** Supabase keys shows a clear setup-error
> screen instead of an empty demo store. To preview a production build in demo mode,
> set `VITE_ALLOW_DEMO=true` in `.env`.

The service-role key is **never** exposed to the frontend; it is used only inside
`supabase/functions/orders-create` and `supabase/functions/orders-get`.

### Demo credentials

| Role | Email | Password |
|---|---|---|
| Customer | `demo@healthharmony.com` | `demo1234` |
| Admin | `admin@healthharmony.com` | `admin1234` |

Promo codes: `HARMONY10` (−10%) · `WELCOME15` (−15 SAR). Free shipping over 300 SAR.
In Supabase mode you can also sign in with a Saudi mobile (`05xxxxxxxx`) — the phone is
resolved to its bound email through the `find_email_by_phone` RPC.

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # tsc --noEmit + vite build
npm run preview
npm run typecheck    # tsc --noEmit
npm run check:i18n   # verify ar/en/tl dictionaries cover every t('...') key
```

### Going live with Supabase

1. Create a Supabase project.
2. Run `supabase/migrations/0001_shop_init.sql` in the SQL editor (tables, triggers,
   RLS, storage bucket). It is **idempotent** — safe to re-run.
3. Run `supabase/migrations/0002_stock_and_payment.sql` (atomic `decrement_stock` +
   compensating `restore_stock`, admin-only `restock_order`, guest-safe
   `get_guest_order`, and the phone→email `find_email_by_phone` login RPC).
4. Seed the catalog: run `node scripts/gen-seed.mjs` (regenerates `supabase/seed.sql`
   from `src/data/catalog.ts`, skipping unapproved regulated products), then run
   `supabase/seed.sql` in the SQL editor. Re-run it whenever the seed changes.
5. Deploy the edge functions:
   ```bash
   supabase functions deploy orders-create
   supabase functions deploy orders-get      # guest order lookup (number + phone)
   supabase functions deploy promos-check
   ```
6. Fill `.env` from `.env.example`:
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```
7. In Supabase Auth settings enable email/password sign-ups.
8. In Supabase Auth URL configuration add `<origin>/reset-password` to the allowed
   redirect URLs (password-recovery links land there).
9. Promote an admin: verify a user, then in SQL
   `update public.profiles set role='admin' where email='...'`.
10. Open `/admin` → Settings and replace the placeholder bank name/IBAN and the
    contact details (phone / email / address / hours). Bank transfer stays hidden
    from customers until real IBAN details are saved.

### Data-flow notes

- Orders: the raw DB row returned by the edge function is mapped client-side by
  `mapOrderFromRow` — the client never sends prices.
- Guests without an account can still see their new order: the order row is cached in
  `sessionStorage` right after checkout and the `orders-get` function re-fetches it by
  order number + checkout phone from any other tab.
- Regulated approvals: `/admin` → Settings writes `regulated_approvals` with an
  optional reviewer note.
- Stock: `decrement_stock` reserves stock **before** order insert; a failed insert
  rolls the reservation back via `restore_stock` (no oversell, no leaks).

## Payments — honest status

- **Working now:** Cash on Delivery (COD) and bank transfer (IBAN shown at checkout
  and on the invoice once the admin saves real details), configurable shipping tiers,
  promo codes.
- **Hidden until configured:** bank transfer is not offered to customers while the
  seeded placeholder IBAN ("SA00…"/مثال/example) is still in place; the admin panel
  shows the same warning.
- **Cards (mada/Visa):** the UI explicitly marks online card payment as pending
  gateway integration. No untested gateway is ever shown as operational.

## VAT

`settings.vat` (15%) and `settings.vatInclusive` (default `true`). When
*inclusive*, invoices show the VAT portion included in the total; switching to
*exclusive* (admin toggle) adds VAT on top of the order total at creation time —
both in demo mode and in the `orders-create` edge function.

## Regulated-product compliance controls

- Regulated products carry `regulated`, `reg_status` (`approved|pending|off`) and optional `age18`.
- `pending`/`off` products are **hidden from the storefront** (both in code and by RLS).
- Admin dashboard lists every regulated product with its approval record
  (`supabase.regulated_approvals`: reviewer, timestamp, status, optional note).
- 18+ products require age confirmation before quick-add, and (in Supabase mode)
  a signed-in account at order creation so delivery age verification can be logged.
- No prescription-only items, no treatment claims; supplements carry explicit
  "not a medicine" disclaimers in all three languages.
- Bundled "starter" reviews are tagged **تقييم تجريبي / Demo review** in the UI and
  are never counted in product rating averages.

## Legal pages

`/policies/privacy` · `/policies/terms` · `/policies/shipping` · `/policies/returns` · `/policies/regulated`

Contact details shown in the footer / WhatsApp button come from
`/admin` → Settings → "بيانات التواصل" (defaults are clearly placeholders and the
admin panel warns until they are replaced).

