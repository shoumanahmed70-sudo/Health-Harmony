-- ═══════════════════════════════════════════════════════════════
-- 0003: production hardening (idempotent, non-destructive)
--
-- Run after 0001 and 0002. This migration NEVER deletes rows:
--   • inventory restock is now exactly-once (orders.restocked_at)
--   • order status changes are atomic and restock in the same transaction
--   • stock helper RPCs are locked to the service role
--   • guest order lookup compares the last 9 phone digits
--   • the phone→email enumeration RPC is no longer callable by clients
-- ═══════════════════════════════════════════════════════════════

-- ── idempotency marker for restocking ──────────────────────────
alter table public.orders add column if not exists restocked_at timestamptz;

create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_reviews_product on public.reviews(product_slug);
create index if not exists idx_addresses_user on public.addresses(user_id);

-- ── stock helpers: service role only ───────────────────────────
create or replace function public.decrement_stock(p_slug text, p_qty int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed int;
begin
  if p_qty is null or p_qty <= 0 then
    return false;
  end if;
  -- Atomic conditional update: concurrent orders can never oversell.
  update public.products
     set stock = stock - p_qty
   where slug = p_slug
     and active = true
     and stock >= p_qty;
  get diagnostics changed = row_count;
  return changed > 0;
end;
$$;

revoke all on function public.decrement_stock(text, int) from public;
revoke all on function public.decrement_stock(text, int) from anon;
revoke all on function public.decrement_stock(text, int) from authenticated;
grant execute on function public.decrement_stock(text, int) to service_role;

create or replace function public.restore_stock(p_slug text, p_qty int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_qty is null or p_qty <= 0 then
    return false;
  end if;
  update public.products set stock = stock + p_qty where slug = p_slug;
  return true;
end;
$$;

revoke all on function public.restore_stock(text, int) from public;
revoke all on function public.restore_stock(text, int) from anon;
revoke all on function public.restore_stock(text, int) from authenticated;
grant execute on function public.restore_stock(text, int) to service_role;

-- ── exactly-once restock ───────────────────────────────────────
-- Previously a repeated cancel (or a retried RPC) could add the same
-- quantities to stock more than once. The row lock + restocked_at flag make
-- the operation idempotent.
create or replace function public.restock_order(p_order uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.orders%rowtype;
begin
  if auth.role() <> 'service_role' and not coalesce(public.is_admin(), false) then
    raise exception 'forbidden';
  end if;

  select * into r from public.orders where id = p_order for update;
  if not found then
    raise exception 'order not found';
  end if;
  if r.restocked_at is not null then
    return; -- already restocked: never double-count
  end if;

  update public.products p
     set stock = p.stock + (i->>'qty')::int
    from jsonb_array_elements(coalesce(r.items, '[]'::jsonb)) as i
   where p.slug = i->>'slug';

  update public.orders set restocked_at = now() where id = p_order;
end;
$$;

revoke all on function public.restock_order(uuid) from public;
revoke all on function public.restock_order(uuid) from anon;
revoke all on function public.restock_order(uuid) from authenticated;
grant execute on function public.restock_order(uuid) to service_role;

-- ── atomic order status transition (admin UI / future automation) ──
create or replace function public.set_order_status(p_order uuid, p_status text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.orders%rowtype;
begin
  if auth.role() <> 'service_role' and not coalesce(public.is_admin(), false) then
    raise exception 'forbidden';
  end if;
  if p_status not in ('pending', 'shipped', 'delivered', 'cancelled') then
    raise exception 'invalid order status';
  end if;

  select * into r from public.orders where id = p_order for update;
  if not found then
    raise exception 'order not found';
  end if;
  if r.status = p_status then
    return r; -- idempotent no-op
  end if;
  if r.status = 'cancelled' then
    -- reopening would require re-reserving stock; do not silently corrupt it
    raise exception 'cancelled orders cannot be reopened';
  end if;

  if p_status = 'cancelled' then
    if r.restocked_at is null then
      update public.products p
         set stock = p.stock + (i->>'qty')::int
        from jsonb_array_elements(coalesce(r.items, '[]'::jsonb)) as i
       where p.slug = i->>'slug';
    end if;
    update public.orders
       set status = 'cancelled', restocked_at = coalesce(restocked_at, now())
     where id = p_order
     returning * into r;
  else
    update public.orders set status = p_status where id = p_order returning * into r;
  end if;

  return r;
end;
$$;

revoke all on function public.set_order_status(uuid, text) from public;
revoke all on function public.set_order_status(uuid, text) from anon;
grant execute on function public.set_order_status(uuid, text) to authenticated;
grant execute on function public.set_order_status(uuid, text) to service_role;

-- Order writes happen only through orders-create (service role) or the
-- status RPC above. Removing table-level write grants closes the path that
-- could change status without restocking.
revoke insert, update, delete on public.orders from anon;
revoke insert, update, delete on public.orders from authenticated;

-- ── guest lookup: compare the last 9 digits of the phone ───────
-- Stored phones may be 05…, +9665… or 9665…; all now match.
create or replace function public.get_guest_order(p_number text, p_phone text)
returns json
language sql
security definer
set search_path = public
as $$
  select to_jsonb(o) - 'user_id'
  from public.orders o
  where upper(trim(o.number)) = upper(trim(p_number))
    and right(regexp_replace(coalesce(o.contact->>'phone', ''), '[^0-9]', '', 'g'), 9) =
        right(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), 9)
    and length(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')) >= 9
  limit 1;
$$;

revoke all on function public.get_guest_order(text, text) from public;
revoke all on function public.get_guest_order(text, text) from anon;
revoke all on function public.get_guest_order(text, text) from authenticated;
grant execute on function public.get_guest_order(text, text) to service_role;

-- ── phone→email lookup is server-side only ────────────────────
-- The storefront now signs in by email. Exposing this RPC to anonymous
-- clients allowed phone-number → email enumeration.
revoke all on function public.find_email_by_phone(text) from public;
revoke all on function public.find_email_by_phone(text) from anon;
revoke all on function public.find_email_by_phone(text) from authenticated;
grant execute on function public.find_email_by_phone(text) to service_role;

-- ── keep admin order updates policy explicit ──────────────────
drop policy if exists p_order_admin_upd on public.orders;
create policy p_order_admin_upd on public.orders for update
  using (coalesce(public.is_admin(), false))
  with check (coalesce(public.is_admin(), false));
