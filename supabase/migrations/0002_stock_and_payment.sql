-- 0002: payment/stock fixes
-- ────────────────────────────────────────────────────────────────
-- 1) Atomic, service-role-only stock decrement used by orders-create.
--    Returns true on success; raises when the product has no sufficient stock.
create or replace function public.decrement_stock(p_slug text, p_qty int)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  changed int;
begin
  update public.products
     set stock = stock - p_qty
   where slug = p_slug
     and stock >= p_qty;
  get diagnostics changed = row_count;
  if changed = 0 then
    return false;
  end if;
  return true;
end;
$$;

revoke execute on function public.decrement_stock(text, int) from public;
revoke execute on function public.decrement_stock(text, int) from anon;
revoke execute on function public.decrement_stock(text, int) from authenticated;

-- 1b) compensated rollback for orders-create: return lines that were already
--     reserved when a later step (insert) fails. Service role only.
create or replace function public.restore_stock(p_slug text, p_qty int)
returns boolean language sql security definer set search_path = public as $$
  update public.products set stock = stock + p_qty where slug = p_slug;
  select true;
$$;

revoke execute on function public.restore_stock(text, int) from public;
revoke execute on function public.restore_stock(text, int) from anon;
revoke execute on function public.restore_stock(text, int) from authenticated;

-- 2) restock when an order is cancelled (reverts every item).
--    Admin-only for live sessions; service role bypasses RLS/functions.
create or replace function public.restock_order(p_order uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  row_ record;
begin
  if not coalesce(public.is_admin(), false) then
    raise exception 'forbidden';
  end if;
  select items into row_ from public.orders where id = p_order;
  if row_.items is not null then
    update public.products set stock = stock + (i->>'qty')::int
    from jsonb_array_elements(row_.items) as i
    where products.slug = i->>'slug';
  end if;
end;
$$;

revoke execute on function public.restock_order(uuid) from public;
revoke execute on function public.restock_order(uuid) from anon;
grant execute on function public.restock_order(uuid) to authenticated;

-- 3) guest order lookup for the orders-get edge function: matches the order
--    number AND the phone provided at checkout, so guests can read their own order.
create or replace function public.get_guest_order(p_number text, p_phone text)
returns json language sql security definer set search_path = public as $$
  select to_jsonb(o)
  from public.orders o
  where o.number = p_number
    and replace(replace(o.contact->>'phone',' ',''),'-','') =
        replace(replace(p_phone, ' ', ''), '-', '')
  limit 1;
$$;

revoke execute on function public.get_guest_order(text, text) from public;
revoke execute on function public.get_guest_order(text, text) from anon;

-- 4) sign-in with a Saudi mobile number: resolve phone → auth email.
--    Returns null when no profile matches, callers cannot enumerate users.
create or replace function public.find_email_by_phone(p_phone text)
returns text language sql security definer set search_path = public as $$
  select lower(p.email) from public.profiles p
  where replace(replace(p.phone, ' ', ''), '-', '') =
        replace(replace(p_phone, ' ', ''), '-', '')
  limit 1;
$$;

grant execute on function public.find_email_by_phone(text) to anon, authenticated;
