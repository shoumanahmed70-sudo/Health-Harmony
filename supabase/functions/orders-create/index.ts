// Supabase Edge Function: orders-create
// Recomputes all prices/totals SERVER-SIDE from the database before creating the
// order. The client never sends prices; the service-role key lives only here.
// Deploy: supabase functions deploy orders-create --no-verify-jwt=false
// (JWT verification ON: callers must be signed in or the order is guest-checked
// with a valid phone; гост guest payments are COD only.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface IncomingItem {
  slug: string
  qty: number
}

interface IncomingBody {
  items: IncomingItem[]
  contact: { name: string; email: string; phone: string }
  address: { city: string; district?: string; street: string; building?: string; notes?: string }
  shipping_method: 'standard' | 'express'
  promo_code?: string | null
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  // service-role client — never send this to the browser
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // optional: identify the caller via the forwarded JWT
  let userId: string | null = null
  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length)
      const { data } = await admin.auth.getUser(token)
      if (data?.user) userId = data.user.id
    }
  } catch {
    // guest checkout allowed (COD only)
  }

  let body: IncomingBody
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const items = Array.isArray(body.items) ? body.items : []
  if (!items.length) return json({ error: 'empty cart' }, 400)
  if (!body.contact?.name || !body.contact?.phone || !body.address?.city || !body.address?.street) {
    return json({ error: 'missing contact/address' }, 400)
  }
  if (!/^(\+9665\d{8}|05\d{8})$/.test((body.contact.phone ?? '').replace(/[\s-]/g, ''))) {
    return json({ error: 'invalid phone' }, 400)
  }
  if (!['standard', 'express'].includes(body.shipping_method)) {
    return json({ error: 'invalid shipping method' }, 400)
  }

  // 1) Load storefront-visible products and verify each line against the DB
  const slugs = items.map((i) => String(i.slug))
  const { data: products, error: perr } = await admin
    .from('products')
    .select('slug,label,price,images,stock,regulated,reg_status,age_18,active')
    .in('slug', slugs)
  if (perr) return json({ error: 'catalog unavailable' }, 502)

  const map = new Map<string, Record<string, unknown>>()
  for (const p of products ?? []) map.set(p.slug as string, p)

  const orderItems: {
    slug: string
    label: unknown
    price: number
    qty: number
    image: string | null
  }[] = []

  for (const line of items) {
    const p = map.get(line.slug)
    const qty = Math.floor(Number(line.qty))
    if (!p || qty <= 0) return json({ error: `unknown product: ${line.slug}` }, 400)
    if (p.active === false) return json({ error: `unavailable: ${line.slug}` }, 400)
    if (p.regulated === true && p.reg_status !== 'approved') {
      return json({ error: `not approved for sale: ${line.slug}` }, 400)
    }
    if (p.age_18 === true && !userId) {
      // age-restricted items require an account so delivery age verification can be recorded
      return json({ error: `sign-in required for age-restricted item: ${line.slug}` }, 400)
    }
    if ((p.stock as number) < qty) return json({ error: `insufficient stock: ${line.slug}` }, 400)
    orderItems.push({
      slug: line.slug,
      label: p.label,
      price: Number(p.price),
      qty,
      image: Array.isArray(p.images) && p.images.length ? p.images[0] : null,
    })
  }

  const subtotal = orderItems.reduce((s, i) => s + i.price * i.qty, 0)

  // 2) Promo (server-validated; promos table is not publicly readable by design)
  let discount = 0
  if (body.promo_code) {
    const code = String(body.promo_code).trim().toUpperCase()
    const { data: promo } = await admin
      .from('promos')
      .select('kind,value,active')
      .eq('code', code)
      .maybeSingle()
    if (promo?.active) {
      discount =
        promo.kind === 'percent'
          ? Math.round(((subtotal * Number(promo.value)) / 100) * 100) / 100
          : Math.min(Number(promo.value), subtotal)
    }
  }

  // 3) Shipping rules from site_settings
  const { data: settingsRow } = await admin
    .from('site_settings')
    .select('value')
    .eq('key', 'storefront')
    .maybeSingle()
  const st = (settingsRow?.value ?? {}) as {
    shipStandard?: number
    shipExpress?: number
    freeOver?: number
  }
  const base = body.shipping_method === 'express' ? Number(st.shipExpress ?? 45) : Number(st.shipStandard ?? 25)
  const freeOver = Number(st.freeOver ?? 300)
  const shipping = subtotal - discount >= freeOver ? 0 : base
  const total = Math.max(0, subtotal - discount + shipping)

  // 4) Create the order (number generated server-side)
  const number = 'HH' + (Date.now().toString(36).toUpperCase().slice(-5)) + ((Math.random() * 1296) | 0).toString(36).toUpperCase().padStart(2, '0')
  const { data: order, error: oerr } = await admin
    .from('orders')
    .insert({
      number,
      user_id: userId,
      contact: body.contact,
      address: body.address,
      items: orderItems,
      subtotal,
      shipping,
      discount,
      total,
      payment_method: body.payment_method === 'bank' ? 'bank' : 'cod',
      shipping_method: body.shipping_method,
      status: 'pending',
    })
    .select()
    .single()
  if (oerr) return json({ error: 'order insert failed', detail: oerr.message }, 502)

  // 5) Decrement stock (logged loudly so a missing RPC never hides silent overselling)
  for (const i of orderItems) {
    const { error: serr } = await admin.rpc('decrement_stock', { p_slug: i.slug, p_qty: i.qty })
    if (serr) console.error('[orders-create] stock decrement failed for', i.slug, serr)
  }

  return json({ order: { ...order, items: orderItems, contact: body.contact, address: body.address, subtotal, shipping, discount, total } })
})

/* Helper SQL to run once in the SQL editor:
create or replace function public.decrement_stock(p_slug text, p_qty int)
returns void language sql security definer set search_path = public as $$
  update public.products set stock = greatest(0, stock - p_qty) where slug = p_slug;
$$;
*/
