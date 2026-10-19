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
| **Demo** (default) | No Supabase credentials in `.env` | Full site works against a seeded local catalog; orders, accounts, reviews, addresses and admin editing persist in `localStorage` of that browser. A banner explains demo mode. |
| **Supabase** | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` present | Reads/writes the real database through RLS; orders are created **only** by the `orders-create` edge function which re-verifies all prices server-side. |

The service-role key is **never** exposed to the frontend; it is used only inside
`supabase/functions/orders-create`.

### Demo credentials

| Role | Email | Password |
|---|---|---|
| Customer | `demo@healthharmony.com` | `demo1234` |
| Admin | `admin@healthharmony.com` | `admin1234` |

Promo codes: `HARMONY10` (−10%) · `WELCOME15` (−15 SAR). Free shipping over 300 SAR.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc --noEmit + vite build
npm run preview
```

### Going live with Supabase

1. Create a Supabase project.
2. Run `supabase/migrations/0001_shop_init.sql` in the SQL editor (tables, triggers, RLS, storage bucket).
3. Also run the commented `decrement_stock` helper at the bottom of `supabase/functions/orders-create/index.ts`.
4. Deploy the edge function: `supabase functions deploy orders-create`.
5. Fill `.env` from `.env.example`:
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```
6. In Supabase Auth settings enable email/password sign-ups.
7. Seed data from `src/data/catalog.ts` (categories/products) or manage everything via the admin dashboard (`/admin`).
8. Promote an admin: verify a user, then in SQL `update public.profiles set role='admin' where email='...'`.

> ⚠️ The demo DB (`src/data/catalog.ts`) is also the seed vocabulary. Reviews are seeded
> as *genuine example submissions*; in production, enable moderation (admin can demote
> reviews) before launch.

## Payments — honest status

- **Working now:** Cash on Delivery (COD), configurable shipping tiers, promo codes.
- **Cards (mada/Visa):** the UI explicitly marks online card payment as
  *"integration in progress — gateway not configured"*. No untested gateway is ever
  shown as operational. Test a PSP, then extend `Checkout.tsx` + the edge function.

## Regulated-product compliance controls

- Regulated products carry `regulated`, `reg_status` (`approved|pending|off`) and optional `age18`.
- `pending`/`off` products are **hidden from the storefront** (both in code and by RLS).
- Admin dashboard lists every regulated product with its approval record
  (`supabase.regulated_approvals`: reviewer, timestamp, status).
- 18+ products require age confirmation before quick-add, and (in Supabase mode)
  a signed-in account at order creation so delivery age verification can be logged.
- No prescription-only items, no treatment claims; supplements carry explicit
  "not a medicine" disclaimers in all three languages.

## Legal pages

`/policies/privacy` · `/policies/terms` · `/policies/shipping` · `/policies/returns` · `/policies/regulated`

Placeholder contact details (`care@health-harmony.example`, `+966 55 000 0000`) must
be replaced before going live.
