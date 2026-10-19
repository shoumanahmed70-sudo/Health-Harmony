-- 0002: payment/stock fixes
-- 1) stock decrement used by orders-create (was missing from deployment)
create or replace function public.decrement_stock(p_slug text, p_qty int)
returns void language sql security definer set search_path = public as $$
  update public.products set stock = greatest(0, stock - p_qty) where slug = p_slug;
$$;

-- 2) restock when an order is cancelled (reverts every item)
create or replace function public.restock_order(p_order uuid)
returns void language plpgsql security definer set search_path = public as $$
declare row_ record;
begin
  select items into row_ from public.orders where id = p_order;
  if row_.items is not null then
    update public.products set stock = stock + (i->>'qty')::int
    from jsonb_array_elements(row_.items) as i
    where products.slug = i->>'slug';
  end if;
end;
$$;
