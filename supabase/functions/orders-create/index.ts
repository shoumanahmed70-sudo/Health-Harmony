// Supabase Edge Function: orders-create
// Recomputes all prices/totals SERVER-SIDE from the database before creating the
// order. The client never sends prices; the service-role key lives only here.
// Deploy: supabase functions deploy orders-create --no-verify-jwt=false
// (JWT verification ON: callers must be signed in, or check out as a guest —
// guest orders are COD only. Age-restricted items require a signed-in user.)
//
// Error shape: { error: string, code: string } — the client maps `code`
// (MISSING_FIELDS | INVALID_PHONE | INVALID_INPUT | UNKNOWN_PRODUCT | UNAVAILABLE |
//  NOT_APPROVED | AGE_LOGIN_REQUIRED | OUT_OF_STOCK | PAYMENT_DISABLED | DB_ERROR)

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
  payment_method?: 'cod' | 'bank'
  promo_code?: string | null
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed', code: 'INVALID_INPUT' }, 405)

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
    return json({ error: 'invalid json', code: 'INVALID_INPUT' }, 400)
  }

  const items = Array.isArray(body.items) ? body.items : []
  const contact = body.contact ?? ({} as IncomingBody['contact'])
  const address = body.address ?? ({} as IncomingBody['address'])
  if (!items.length || !contact.name || !contact.phone || !address.city || !address.street) {
    return json({ error: 'missing contact/address', code: 'MISSING_FIELDS' }, 400)
  }
  if (!/^(\+9665\d{8}|05\d{8})$/.test(String(contact.phone ?? '').replace(/[\s-]/g, ''))) {
    return json({ error: 'invalid phone', code: 'INVALID_PHONE' }, 400)
  }
  if (!['standard', 'express'].includes(body.shipping_method)) {
    return json({ error: 'invalid shipping method', code: 'INVALID_INPUT' }, 400)
  }
  const paymentMethod = body.payment_method === 'bank' ? 'bank' : 'cod'

  // 0) Payment method must be enabled in storefront settings
  {
    const { data: settingsRow } = await admin
      .from('site_settings')
      .select('value')
      .eq('key', 'storefront')
      .maybeSingle()
    const payments = (settingsRow?.value as { payments?: { cod?: boolean; bank?: boolean } } | null)?.payments
    if (payments && payments[paymentMethod] === false) {
      return json({ error: 'payment method disabled', code: 'PAYMENT_DISABLED' }, 400)
    }
  }

  // 1) Load storefront-visible products and verify each line against the DB
  const slugs = items.map((i) => String(i.slug))
  const { data: products, error: perr } = await admin
    .from('products')
    .select('slug,label,price,images,stock,regulated,reg_status,age_18,active')
    .in('slug', slugs)
  if (perr) return json({ error: 'catalog unavailable', code: 'DB_ERROR' }, 502)

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
    if (!p || qty <= 0) return json({ error: `unknown product: ${line.slug}`, code: 'UNKNOWN_PRODUCT' }, 400)
    if (p.active === false) return json({ error: `unavailable: ${line.slug}`, code: 'UNAVAILABLE' }, 400)
    if (p.regulated === true && p.reg_status !== 'approved') {
      return json({ error: `not approved for sale: ${line.slug}`, code: 'NOT_APPROVED' }, 400)
    }
    if (p.age_18 === true && !userId) {
      // age-restricted items require an account so delivery age verification can be recorded
      return json({ error: `sign-in required for age-restricted item: ${line.slug}`, code: 'AGE_LOGIN_REQUIRED' }, 400)
    }
    if ((p.stock as number) < qty) {
      return json({ error: `insufficient stock: ${line.slug}`, code: 'OUT_OF_STOCK' }, 409)
    }
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
  const { data: settingsRow2 } = await admin
    .from('site_settings')
    .select('value')
    .eq('key', 'storefront')
    .maybeSingle()
  const st = (settingsRow2?.value ?? {}) as {
    shipStandard?: number
    shipExpress?: number
    freeOver?: number
    vat?: number
    vatInclusive?: boolean
  }
  const base = body.shipping_method === 'express' ? Number(st.shipExpress ?? 45) : Number(st.shipStandard ?? 25)
  const freeOver = Number(st.freeOver ?? 300)
  const shipping = subtotal - discount >= freeOver ? 0 : base
  // VAT-inclusive pricing by default; VAT-exclusive adds tax on top of the total
  const tax = st.vatInclusive === false && Number(st.vat ?? 0) > 0
    ? Math.round(((subtotal - discount) * Number(st.vat)) / 100 * 100) / 100
    : 0
  const total = Math.max(0, subtotal - discount + shipping + tax)

  // 4) Preflight verification is done; reserve stock NOW (before insert) so a
  //    concurrent order cannot oversell. decrement_stock is atomic and
  //    service-role-only; it returns false when stock ran out.
  const decremented: { slug: string; qty: number }[] = []
  for (const i of orderItems) {
    const { data: okStock, error: serr } = await admin.rpc('decrement_stock', {
      p_slug: i.slug,
      p_qty: i.qty,
    })
    if (serr || okStock === false) {
      // roll back the lines already reserved so we never leak stock on failure
      for (const d of decremented) {
        await admin.rpc('restore_stock', { p_slug: d.slug, p_qty: d.qty }).catch(() => {})
      }
      if (serr) console.error('[orders-create] stock decrement failed for', i.slug, serr)
      return json(
        { error: `insufficient stock: ${i.slug}`, code: 'OUT_OF_STOCK' },
        409,
      )
    }
    decremented.push({ slug: i.slug, qty: i.qty })
  }

  // 5) Insert the order (number generated server-side; retry on unique clash)
  let order: Record<string, unknown> | null = null
  let oerr: { message: string; code?: string } | null = null
  for (let attempt = 0; attempt < 3 && !order; attempt++) {
    const number =
      'HH' + Date.now().toString(36).toUpperCase().slice(-5) +
      ((Math.random() * 1296) | 0).toString(36).toUpperCase().padStart(2, '0')
    const { data, error } = await admin
      .from('orders')
      .insert({
        number,
        user_id: userId,
        contact,
        address,
        items: orderItems,
        subtotal,
        shipping,
        discount,
        total,
        payment_method: paymentMethod,
        shipping_method: body.shipping_method,
        status: 'pending',
      })
      .select()
      .single()
    if (error) {
      oerr = { message: error.message, code: (error as { code?: string }).code }
      // 23505 = unique_violation on order number → retry with a new number
      if (error.code !== '23505') break
    } else {
      order = data
    }
  }
  if (!order) {
    // give the reserved stock back — the order was never created
    for (const d of decremented) {
      await admin.rpc('restore_stock', { p_slug: d.slug, p_qty: d.qty }).catch(() => {})
    }
    return json({ error: 'order insert failed', detail: oerr?.message, code: 'DB_ERROR' }, 502)
  }

  // 6) Return the RAW database row — the client maps it with mapOrderFromRow.
  return json({ order })
})
