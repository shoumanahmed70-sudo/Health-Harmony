-- ═══════════════════════════════════════════════════════════════
-- Health Harmony — initial schema + Row Level Security
-- Run in Supabase SQL editor (or `supabase db push`).
-- Idempotent: safe to run again on an existing database.
-- ═══════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── profiles ────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

-- denormalised email (joined-list view, customer search, and phone→email login lookup)
alter table public.profiles add column if not exists email text not null default '';

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, email)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
          coalesce(nullif(new.raw_user_meta_data->>'phone',''), null),
          coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- backfill emails for existing profiles
update public.profiles p
set email = coalesce(u.email, '')
from auth.users u
where p.id = u.id
  and p.email = '';

-- ── categories ─────────────────────────────────────────────────
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  experience text not null check (experience in ('beauty','health')),
  label jsonb not null,          -- {ar,en,tl}
  "desc" jsonb,                  -- {ar,en,tl}
  sort int not null default 0,
  active boolean not null default true
);

-- ── products ───────────────────────────────────────────────────
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  category_slug text not null references public.categories(slug),
  sku text not null default '',
  label jsonb not null,
  description jsonb not null,
  overview jsonb,
  ingredients jsonb,
  usage jsonb,
  brand text not null default '',
  manufacturer text,
  origin text,
  price numeric(10,2) not null check (price >= 0),
  compare_price numeric(10,2),
  stock int not null default 0,
  images text[] not null default '{}',
  badges text[] not null default '{}',
  regulated boolean not null default false,
  reg_status text not null default 'off' check (reg_status in ('approved','pending','off')),
  age_18 boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_products_cat on public.products(category_slug);

-- ── reviews (genuine submissions only) ────────────────────────
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null references public.products(slug) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  rating int not null check (rating between 1 and 5),
  comment text not null,
  created_at timestamptz not null default now()
);

-- ── addresses ─────────────────────────────────────────────────
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  full_name text not null,
  phone text not null,
  city text not null,
  district text not null default '',
  street text not null,
  building text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── orders (items stored as a snapshot; pricing verified server-side) ──
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number text unique not null,
  user_id uuid references auth.users(id) on delete set null,
  contact jsonb not null,
  address jsonb not null,
  items jsonb not null,
  subtotal numeric(10,2) not null,
  shipping numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  payment_method text not null default 'cod',
  shipping_method text not null default 'standard',
  status text not null default 'pending' check (status in ('pending','shipped','delivered','cancelled')),
  created_at timestamptz not null default now()
);

-- ── settings / promos / compliance ────────────────────────────
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.promos (
  code text primary key,
  kind text not null check (kind in ('percent','fixed')),
  value numeric(10,2) not null check (value >= 0),
  active boolean not null default true
);

create table if not exists public.regulated_approvals (
  product_id uuid primary key references public.products(id) on delete cascade,
  status text not null check (status in ('approved','pending','off')),
  reviewer_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz not null default now()
);

create table if not exists public.newsletter (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════════

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.reviews enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.site_settings enable row level security;
alter table public.promos enable row level security;
alter table public.regulated_approvals enable row level security;
alter table public.newsletter enable row level security;
alter table public.contact_submissions enable row level security;

-- profiles: own row read/update; admins see all and may set roles
drop policy if exists p_profiles_self on public.profiles;
create policy p_profiles_self on public.profiles
  for select using (auth.uid() = id or coalesce(public.is_admin(), false));
drop policy if exists p_profiles_upd on public.profiles;
create policy p_profiles_upd on public.profiles
  for update using (auth.uid() = id or coalesce(public.is_admin(), false));
-- role escalation: only admins may set role='admin' — enforced below with a trigger guard
create or replace function public.guard_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- SQL editor / service role (no session => auth.uid() is null) may change roles freely.
  -- Admins may change roles. Signed-in non-admins may never change a role
  -- (but can still update their own profile fields normally).
  if auth.uid() is not null and not coalesce(public.is_admin(), false) then
    if new.role is distinct from old.role then
      raise exception 'Only an admin can change roles';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_guard_role on public.profiles;
create trigger trg_guard_role before update on public.profiles
  for each row execute function public.guard_role_change();

-- categories: public read active rows; admin write
drop policy if exists p_cat_read on public.categories;
create policy p_cat_read on public.categories for select using (active = true);
drop policy if exists p_cat_write on public.categories;
create policy p_cat_write on public.categories for all
  using (coalesce(public.is_admin(), false)) with check (coalesce(public.is_admin(), false));

-- products: public read ONLY storefront-visible rows
-- (active = true AND (not regulated OR reg_status = 'approved'))
drop policy if exists p_prod_read on public.products;
create policy p_prod_read on public.products for select
  using (active = true and (regulated = false or reg_status = 'approved'));
drop policy if exists p_prod_write on public.products;
create policy p_prod_write on public.products for all
  using (coalesce(public.is_admin(), false)) with check (coalesce(public.is_admin(), false));

-- reviews: public read; signed-in users post own; admin moderate
drop policy if exists p_rev_read on public.reviews;
create policy p_rev_read on public.reviews for select using (true);
drop policy if exists p_rev_insert on public.reviews;
create policy p_rev_insert on public.reviews for insert
  with check (auth.uid() is not null and user_id = auth.uid());
drop policy if exists p_rev_admin_upd on public.reviews;
create policy p_rev_admin_upd on public.reviews for update
  using (coalesce(public.is_admin(), false));
drop policy if exists p_rev_admin on public.reviews;
drop policy if exists p_rev_admin_del on public.reviews;
create policy p_rev_admin_del on public.reviews for delete
  using (coalesce(public.is_admin(), false));

-- addresses: owner-only
drop policy if exists p_addr_all on public.addresses;
create policy p_addr_all on public.addresses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- orders: owner read; admins read/update. Inserts happen ONLY through the
-- orders-create edge function (service role bypasses RLS) so clients can never
-- forge prices; this is why no insert policy exists here.
drop policy if exists p_order_owner_read on public.orders;
create policy p_order_owner_read on public.orders for select
  using (auth.uid() = user_id or coalesce(public.is_admin(), false));
drop policy if exists p_order_owner_insert on public.orders;
drop policy if exists p_order_admin_upd on public.orders;
create policy p_order_admin_upd on public.orders for update
  using (coalesce(public.is_admin(), false));

-- settings: public read; admin write
drop policy if exists p_set_read on public.site_settings;
create policy p_set_read on public.site_settings for select using (true);
drop policy if exists p_set_write on public.site_settings;
create policy p_set_write on public.site_settings for all
  using (coalesce(public.is_admin(), false)) with check (coalesce(public.is_admin(), false));

-- promos: NOT publicly readable (validation happens server-side via edge function)
drop policy if exists p_promo_admin on public.promos;
create policy p_promo_admin on public.promos for all
  using (coalesce(public.is_admin(), false)) with check (coalesce(public.is_admin(), false));

-- regulated approvals: admin manage; admins read
drop policy if exists p_regappr_admin on public.regulated_approvals;
create policy p_regappr_admin on public.regulated_approvals for all
  using (coalesce(public.is_admin(), false)) with check (coalesce(public.is_admin(), false));

-- newsletter/contact: anonymous insert; admin read
drop policy if exists p_news_ins on public.newsletter;
create policy p_news_ins on public.newsletter for insert with check (true);
drop policy if exists p_news_admin on public.newsletter;
create policy p_news_admin on public.newsletter for select using (coalesce(public.is_admin(), false));
drop policy if exists p_contact_ins on public.contact_submissions;
create policy p_contact_ins on public.contact_submissions for insert with check (true);
drop policy if exists p_contact_admin on public.contact_submissions;
create policy p_contact_admin on public.contact_submissions for select using (coalesce(public.is_admin(), false));

-- ═══════════════════════════════════════════════════════════════
-- Storage: product images bucket
-- ═══════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- product-images bucket: admins manage (three separate policies suppress warnings);
-- public read via the bucket's public flag
drop policy if exists p_store_admin_ins on storage.objects;
create policy p_store_admin_ins on storage.objects for insert
  with check (bucket_id = 'product-images' and coalesce(public.is_admin(), false));
drop policy if exists p_store_admin_upd on storage.objects;
create policy p_store_admin_upd on storage.objects for update
  using (bucket_id = 'product-images' and coalesce(public.is_admin(), false))
  with check (bucket_id = 'product-images' and coalesce(public.is_admin(), false));
drop policy if exists p_store_admin_del on storage.objects;
create policy p_store_admin_del on storage.objects for delete
  using (bucket_id = 'product-images' and coalesce(public.is_admin(), false));
drop policy if exists p_store_admin_write on storage.objects;
drop policy if exists p_store_public_read on storage.objects;
create policy p_store_public_read on storage.objects for select
  using (bucket_id = 'product-images');
