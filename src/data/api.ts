import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { CATEGORIES, DEFAULT_SETTINGS, PRODUCTS, PROMOS, REVIEWS } from './catalog'
import type {
  Address,
  Banner,
  Category,
  CheckoutDraft,
  Order,
  OrderStatus,
  Product,
  Promo,
  Review,
  Settings,
  UserProfile,
} from './types'

/* ─────────────────────────────────────────────────────────────
   Configuration
   ───────────────────────────────────────────────────────────── */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anon)

let _sb: SupabaseClient | null = null
export function sb(): SupabaseClient {
  if (!_sb && url && anon) {
    _sb = createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true } })
  }
  return _sb as SupabaseClient
}

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))
const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'id' + Math.random().toString(36).slice(2) + Date.now().toString(36)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUuid(id: string): boolean {
  return UUID_RE.test(id)
}

/** Only publicly visible products survive this filter:
 *  active products, plus regulated ones only when compliance-approved. */
export function publicProduct(p: Product): boolean {
  return p.active !== false && (!p.regulated || p.regStatus === 'approved')
}

function withRatings(products: Product[], reviews: Review[]): Product[] {
  const bySlug = new Map<string, Review[]>()
  for (const r of reviews) {
    const arr = bySlug.get(r.productSlug) ?? []
    arr.push(r)
    bySlug.set(r.productSlug, arr)
  }
  return products.map((p) => {
    const rs = bySlug.get(p.slug) ?? []
    if (rs.length === 0)
      return { ...p, rating: undefined }
    const avg = rs.reduce((s, r) => s + r.rating, 0) / rs.length
    return { ...p, rating: { avg: Math.round(avg * 10) / 10, count: rs.length } }
  })
}

/* ═════════════════════════════════════════════════════════════
   DEMO backend (localStorage) — used when Supabase is not configured
   ═════════════════════════════════════════════════════════════ */

interface DemoDB {
  categories: Category[]
  products: Product[]
  reviews: Review[]
  promos: Promo[]
  settings: Settings
  users: (UserProfile & { pw: string })[]
  addresses: Address[]
  orders: Order[]
  submissions: { id: string; name: string; email: string; message: string; createdAt: string }[]
  newsletter: { email: string; createdAt: string }[]
}

const DB_KEY = 'hh_demo_db_v1'
const SESSION_KEY = 'hh_demo_session'

function freshDB(): DemoDB {
  return {
    categories: clone(CATEGORIES),
    products: clone(PRODUCTS),
    reviews: clone(REVIEWS),
    promos: clone(PROMOS),
    settings: clone(DEFAULT_SETTINGS),
    users: [
      { id: 'u_demo', email: 'demo@healthharmony.com', name: 'Demo Customer', phone: '0551234567', role: 'customer', createdAt: new Date().toISOString(), pw: 'demo1234' },
      { id: 'u_admin', email: 'admin@healthharmony.com', name: 'Store Admin', phone: '0550000000', role: 'admin', createdAt: new Date().toISOString(), pw: 'admin1234' },
    ],
    addresses: [],
    orders: [],
    submissions: [],
    newsletter: [],
  }
}

let _db: DemoDB | null = null

function db(): DemoDB {
  if (_db) return _db
  try {
    const raw = window.localStorage.getItem(DB_KEY)
    if (raw) {
      _db = JSON.parse(raw) as DemoDB
      if (_db.products && _db.users) {
        migrate(_db)
        return _db
      }
    }
  } catch {
    /* corrupted — reseed */
  }
  _db = freshDB()
  saveDB()
  return _db
}

/** Align a stored demo DB with the current CATEGORIES set (e.g. sections consolidated later). */
function migrate(db: DemoDB): void {
  const want = clone(CATEGORIES)
  const same = db.categories && db.categories.length === want.length && want.every((w) => db.categories.some((c) => c.slug === w.slug))
  // prune seed-style products that no longer exist in the seed (admin-created
  // products keep their own ids and are never removed from the demo DB)
  const knownIds = new Set(PRODUCTS.map((p) => p.id))
  const pruned = db.products.filter((p) => !p.id.startsWith('p_') || knownIds.has(p.id))
  if (pruned.length !== db.products.length) {
    db.products = pruned
    saveDB()
  }
  if (!same) {
    db.categories = want
    const validSlugs = new Set(want.map((c) => c.slug))
    for (const p of db.products) {
      if (!validSlugs.has(p.categorySlug)) p.categorySlug = want[0]?.slug ?? 'care-health'
    }
    saveDB()
  }
}

function saveDB() {
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(_db))
  } catch {
    /* storage full — demo only */
  }
}

/* ═════════════════════════════════════════════════════════════
   PUBLIC API — the full contract used by the UI
   ═════════════════════════════════════════════════════════════ */

export type ListOpts = {
  slugs?: string[]
  category?: string
  q?: string
  inStock?: boolean
  onSale?: boolean
  badges?: Product['badges']
  publicOnly?: boolean
}

export type AuthResult = { ok: true } | { ok: false; err: 'bad' | 'in_use' | 'weak' | 'mail' | 'generic' }
export type EmailResult = { ok: true } | { ok: false; err: 'mail' | 'generic' }

export const api = {
  /* ---------- catalog ---------- */

  async listCategories(): Promise<Category[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await sb().from('categories').select('*').order('sort')
      if (error || !data) return clone(CATEGORIES)
      return data.map((r: Record<string, unknown>) => ({
        id: r.id,
        slug: r.slug,
        experience: r.experience,
        label: r.label,
        desc: r.desc,
        sort: r.sort,
        active: r.active,
      })) as Category[]
    }
    return clone(db().categories.filter((c) => c.active)).sort((a, b) => a.sort - b.sort)
  },

  async listProducts(opts: ListOpts = {}): Promise<Product[]> {
    let products: Product[]
    let reviews: Review[]

    if (isSupabaseConfigured) {
      let q = sb().from('products').select('*').order('created_at', { ascending: false })
      if (opts.category) q = q.eq('category_slug', opts.category)
      if (opts.slugs) q = q.in('slug', opts.slugs)
      const { data, error } = await q
      if (error || !data) return []
      products = data.map(mapProductFromRow)
      const { data: rv } = await sb().from('reviews').select('*').order('created_at', { ascending: false })
      reviews = (rv ?? []).map(mapReviewFromRow)
    } else {
      products = clone(db().products)
      reviews = clone(db().reviews)
    }

    // rating only for genuine, existing submissions
    products = withRatings(products, reviews)

    let out = products
    if (opts.publicOnly !== false) out = out.filter(publicProduct)
    if (opts.q) {
      const needle = opts.q.trim().toLowerCase()
      out = out.filter(
        (p) =>
          ['ar', 'en', 'tl'].some((l) => p.label[l as 'ar' | 'en' | 'tl'].toLowerCase().includes(needle)) ||
          p.sku.toLowerCase().includes(needle) ||
          p.brand.toLowerCase().includes(needle) ||
          p.categorySlug.includes(needle),
      )
    }
    if (opts.inStock) out = out.filter((p) => p.stock > 0)
    if (opts.onSale) out = out.filter((p) => p.comparePrice && p.comparePrice > p.price)
    if (opts.badges && opts.badges.length) out = out.filter((p) => opts.badges!.every((b) => p.badges.includes(b)))
    return out
  },

  async getProduct(slug: string): Promise<Product | null> {
    const list = await api.listProducts({ slugs: [slug], publicOnly: true })
    return list[0] ?? null
  },

  async listReviews(slug: string): Promise<Review[]> {
    if (isSupabaseConfigured) {
      const { data } = await sb().from('reviews').select('*').eq('product_slug', slug).order('created_at', { ascending: false })
      return (data ?? []).map(mapReviewFromRow)
    }
    return clone(db().reviews.filter((r) => r.productSlug === slug))
  },

  async addReview(input: { slug: string; name: string; rating: number; comment: string; userId?: string }): Promise<EmailResult> {
    if (isSupabaseConfigured) {
      const { error } = await sb().from('reviews').insert({
        product_slug: input.slug,
        user_id: input.userId ?? null,
        name: input.name,
        rating: input.rating,
        comment: input.comment,
      })
      return error ? { ok: false, err: 'generic' } : { ok: true }
    }
    const review: Review = {
      id: uid(),
      productSlug: input.slug,
      userId: input.userId,
      name: input.name,
      rating: input.rating,
      comment: input.comment,
      createdAt: new Date().toISOString(),
    }
    db().reviews.unshift(review)
    saveDB()
    return { ok: true }
  },

  /* ---------- settings / promos ---------- */

  async getSettings(): Promise<Settings> {
    if (isSupabaseConfigured) {
      const { data } = await sb().from('site_settings').select('value').eq('key', 'storefront').maybeSingle()
      if (data && data.value) return data.value as Settings
      return clone(DEFAULT_SETTINGS)
    }
    return clone(db().settings)
  },

  async checkPromo(code: string): Promise<Promo | null> {
    const c = code.trim().toUpperCase()
    if (isSupabaseConfigured) {
      // promos is admin-only by RLS — validate via edge function like order creation
      try {
        const { data, error } = await sb().functions.invoke('promos-check', { body: { code: c } })
        if (error || !data?.valid) return null
        return data.promo as Promo
      } catch {
        return null
      }
    }
    return db().promos.find((p) => p.code === c && p.active) ?? null
  },

  /* ---------- auth ---------- */

  async getUser(): Promise<UserProfile | null> {
    if (isSupabaseConfigured) {
      const { data: sess } = await sb().auth.getUser()
      if (!sess?.user) return null
      const { data: prof } = await sb().from('profiles').select('*').eq('id', sess.user.id).maybeSingle()
      return {
        id: sess.user.id,
        email: sess.user.email ?? '',
        name: (prof?.full_name as string) ?? sess.user.email?.split('@')[0] ?? '',
        phone: (prof?.phone as string) ?? undefined,
        role: ((prof?.role as string) as 'customer' | 'admin') ?? 'customer',
        createdAt: (prof?.created_at as string) ?? sess.user.created_at ?? new Date().toISOString(),
      }
    }
    try {
      const id = window.localStorage.getItem(SESSION_KEY)
      if (!id) return null
      const u = db().users.find((x) => x.id === id)
      if (!u) return null
      const { pw: _pw, ...profile } = u
      return profile
    } catch {
      return null
    }
  },

  async signIn({ email, password }: { email: string; password: string }): Promise<AuthResult> {
    if (isSupabaseConfigured) {
      const { data, error } = await sb().auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
      if (error) {
        return error.message.includes('Invalid login') ? { ok: false, err: 'bad' } : { ok: false, err: 'generic' }
      }
      void data
      return { ok: true }
    }
    const u = db().users.find((x) => {
      if (x.pw !== password) return false
      const id = email.trim().replace(/[\s-]/g, '')
      if (/^\+96510\d{8}$/.test(id)) return false // typo guard: Saudi is +9665
      if (/^(\+9665\d{8}|05\d{8})$/.test(id)) return x.phone?.replace(/[\s-]/g, '') === id
      return x.email.trim().toLowerCase() === email.trim().toLowerCase()
    })
    if (!u) return { ok: false, err: 'bad' }
    try {
      window.localStorage.setItem(SESSION_KEY, u.id)
    } catch {
      /* ignore */
    }
    return { ok: true }
  },

  async signUp({ name, email, password, phone }: { name: string; email: string; password: string; phone?: string }): Promise<AuthResult> {
    if (isSupabaseConfigured) {
      const { error } = await sb().auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: name } },
      })
      if (error) {
        if (error.message.includes('already registered')) return { ok: false, err: 'in_use' }
        if (error.message.includes('Password')) return { ok: false, err: 'weak' }
        if (error.message.includes('email')) return { ok: false, err: 'mail' }
        return { ok: false, err: 'generic' }
      }
      return { ok: true }
    }
    const em = email.trim().toLowerCase()
    if (db().users.some((u) => u.email === em)) return { ok: false, err: 'in_use' }
    db().users.push({ id: 'u_' + uid().slice(0, 12), email: em, name: name.trim(), phone: phone?.replace(/[\s-]/g, '') || undefined, role: 'customer', createdAt: new Date().toISOString(), pw: password })
    saveDB()
    return { ok: true }
  },

  async signOut(): Promise<void> {
    if (isSupabaseConfigured) {
      await sb().auth.signOut()
      return
    }
    try {
      window.localStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
  },

  async updateProfile(p: { name: string; phone?: string }): Promise<EmailResult> {
    if (isSupabaseConfigured) {
      const user = await api.getUser()
      if (!user) return { ok: false, err: 'generic' }
      const { error } = await sb().from('profiles').update({ full_name: p.name, phone: p.phone ?? null }).eq('id', user.id)
      return error ? { ok: false, err: 'generic' } : { ok: true }
    }
    const id = window.localStorage.getItem(SESSION_KEY)
    const u = id ? db().users.find((x) => x.id === id) : null
    if (!u) return { ok: false, err: 'generic' }
    u.name = p.name
    u.phone = p.phone
    saveDB()
    return { ok: true }
  },

  async resetPassword(email: string): Promise<EmailResult> {
    if (isSupabaseConfigured) {
      const { error } = await sb().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/#/reset' })
      return error ? { ok: false, err: 'mail' } : { ok: true }
    }
    // demo: nothing to send — the UI explains that a real email requires configuration
    return { ok: true }
  },

  /* ---------- addresses ---------- */

  async listAddresses(): Promise<Address[]> {
    if (isSupabaseConfigured) {
      const user = await api.getUser()
      if (!user) return []
      const { data } = await sb().from('addresses').select('*').eq('user_id', user.id).order('is_default', { ascending: false })
      return (data ?? []).map(mapAddressFromRow)
    }
    const id = window.localStorage.getItem(SESSION_KEY)
    if (!id) return []
    return clone(db().addresses.filter((a) => a.userId === id))
  },

  async saveAddress(a: Omit<Address, 'id'> & { id?: string }): Promise<EmailResult> {
    if (isSupabaseConfigured) {
      const user = await api.getUser()
      if (!user) return { ok: false, err: 'generic' }
      const row = mapAddressToRow(a, user.id)
      const { error } = a.id
        ? await sb().from('addresses').update(row).eq('id', a.id)
        : await sb().from('addresses').insert(row)
      if (!error && a.isDefault) {
        await sb().from('addresses').update({ is_default: false }).eq('user_id', user.id).neq('id', a.id ?? '')
      }
      return error ? { ok: false, err: 'generic' } : { ok: true }
    }
    const userId = window.localStorage.getItem(SESSION_KEY) ?? undefined
    if (!userId) return { ok: false, err: 'generic' }
    if (a.id) {
      const idx = db().addresses.findIndex((x) => x.id === a.id)
      if (idx >= 0) db().addresses[idx] = { ...db().addresses[idx], ...a } as Address
    } else {
      if (a.isDefault) db().addresses.forEach((x) => (x.isDefault = false))
      db().addresses.push({ ...(a as Omit<Address, 'id'>), id: uid(), userId })
    }
    saveDB()
    return { ok: true }
  },

  async deleteAddress(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      await sb().from('addresses').delete().eq('id', id)
      return
    }
    const i = db().addresses.findIndex((x) => x.id === id)
    if (i >= 0) {
      db().addresses.splice(i, 1)
      saveDB()
    }
  },

  async setDefaultAddress(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      const user = await api.getUser()
      if (!user) return
      await sb().from('addresses').update({ is_default: false }).eq('user_id', user.id)
      await sb().from('addresses').update({ is_default: true }).eq('id', id)
      return
    }
    db().addresses.forEach((a) => (a.isDefault = a.id === id))
    saveDB()
  },

  /* ---------- orders ---------- */

  /**
   * Order creation. With Supabase configured, prices are re-verified server-side
   * by the `orders-create` edge function using the service-role key (never exposed
   * to the frontend). In demo mode the order is stored locally.
   */
  async createOrder(draft: CheckoutDraft, lines: { p: Product; qty: number }[], userId?: string): Promise<Order | { err: string }> {
    const items = lines.map(({ p, qty }) => ({
      slug: p.slug,
      label: p.label,
      price: p.price,
      comparePrice: p.comparePrice,
      qty,
      image: p.images[0],
    }))
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
    let discount = 0
    if (draft.promoCode) {
      const promo = await api.checkPromo(draft.promoCode)
      if (promo) discount = promo.kind === 'percent' ? Math.round(((subtotal * promo.value) / 100) * 100) / 100 : Math.min(promo.value, subtotal)
    }
    const settings = await api.getSettings()
    const shippingBase = draft.shippingMethod === 'express' ? settings.shipExpress : settings.shipStandard
    const shipping = subtotal - discount >= settings.freeOver ? 0 : shippingBase
    const total = Math.max(0, subtotal - discount + shipping)
    const number = 'HH' + Date.now().toString(36).toUpperCase().slice(-5) + Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, '0')

    const order: Order = {
      id: uid(),
      number,
      userId,
      items,
      contact: draft.contact,
      address: draft.address,
      subtotal,
      shipping,
      discount,
      total,
      paymentMethod: draft.paymentMethod,
      shippingMethod: draft.shippingMethod,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await sb().functions.invoke('orders-create', {
          body: {
            items: items.map((i) => ({ slug: i.slug, qty: i.qty })),
            contact: draft.contact,
            address: draft.address,
            shipping_method: draft.shippingMethod,
            payment_method: draft.paymentMethod,
            promo_code: draft.promoCode ?? null,
          },
        })
        if (error || !data?.order) {
          console.warn('orders-create edge function unavailable; order not saved remotely.', error)
          return { err: 'edge' }
        }
        return data.order as Order
      } catch (e) {
        console.warn(e)
        return { err: 'edge' }
      }
    }

    db().orders.unshift(order)
    // decrement demo stock
    for (const it of items) {
      const p = db().products.find((x) => x.slug === it.slug)
      if (p) p.stock = Math.max(0, p.stock - it.qty)
    }
    saveDB()
    return order
  },

  async listMyOrders(): Promise<Order[]> {
    if (isSupabaseConfigured) {
      const user = await api.getUser()
      if (!user) return []
      const { data } = await sb().from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      return (data ?? []).map(mapOrderFromRow)
    }
    const id = window.localStorage.getItem(SESSION_KEY)
    if (!id) return []
    return clone(db().orders.filter((o) => o.userId === id))
  },

  async getOrder(number: string): Promise<Order | null> {
    if (isSupabaseConfigured) {
      const { data } = await sb().from('orders').select('*').eq('number', number).maybeSingle()
      return data ? mapOrderFromRow(data) : null
    }
    return clone(db().orders.find((o) => o.number === number)) ?? null
  },

  /* ---------- misc ---------- */

  async listAllReviews(): Promise<Review[]> {
    if (isSupabaseConfigured) {
      const { data } = await sb().from('reviews').select('*').order('created_at', { ascending: false })
      return (data ?? []).map(mapReviewFromRow)
    }
    return clone(db().reviews)
  },

  async subscribeNewsletter(email: string): Promise<EmailResult> {
    if (isSupabaseConfigured) {
      const { error } = await sb().from('newsletter').insert({ email: email.trim().toLowerCase() })
      return error ? { ok: false, err: 'generic' } : { ok: true }
    }
    if (!db().newsletter.some((n) => n.email === email)) db().newsletter.push({ email, createdAt: new Date().toISOString() })
    saveDB()
    return { ok: true }
  },

  async submitContact(input: { name: string; email: string; message: string }): Promise<EmailResult> {
    if (isSupabaseConfigured) {
      const { error } = await sb().from('contact_submissions').insert(input)
      return error ? { ok: false, err: 'generic' } : { ok: true }
    }
    db().submissions.push({ id: uid(), ...input, createdAt: new Date().toISOString() })
    saveDB()
    return { ok: true }
  },

  /* ═══════════ admin (used by the Admin dashboard) ═══════════ */

  admin: {
    async listOrders(): Promise<Order[]> {
      if (isSupabaseConfigured) {
        const { data } = await sb().from('orders').select('*').order('created_at', { ascending: false })
        return (data ?? []).map(mapOrderFromRow)
      }
      return clone(db().orders)
    },

    async updateOrderStatus(id: string, status: OrderStatus): Promise<EmailResult> {
      if (isSupabaseConfigured) {
        const { data: before } = await sb().from('orders').select('status').eq('id', id).maybeSingle()
        const { error } = await sb().from('orders').update({ status }).eq('id', id)
        if (error) return { ok: false, err: 'generic' }
        // cancelling a previously-counted order returns its items to stock
        if (status === 'cancelled' && before?.status && before.status !== 'cancelled') {
          await sb().rpc('restock_order', { p_order: id })
        }
        return { ok: true }
      }
      const o = db().orders.find((x) => x.id === id)
      if (o) {
        const wasCounted = o.status !== 'cancelled'
        o.status = status
        if (status === 'cancelled' && wasCounted) {
          for (const it of o.items) {
            const p = db().products.find((x) => x.slug === it.slug)
            if (p) p.stock = p.stock + it.qty
          }
        }
        saveDB()
      }
      return { ok: true }
    },

    async listUsers(): Promise<UserProfile[]> {
      if (isSupabaseConfigured) {
        const { data } = await sb().from('profiles').select('*').order('created_at', { ascending: false })
        return (data ?? []).map((r: Record<string, unknown>) => ({
          id: r.id,
          email: r.email ?? '',
          name: r.full_name ?? '',
          phone: r.phone ?? undefined,
          role: r.role,
          createdAt: r.created_at,
        })) as UserProfile[]
      }
      return db().users.map(({ pw: _pw, ...p }) => p)
    },

    async setRole(userId: string, role: 'customer' | 'admin'): Promise<EmailResult> {
      if (isSupabaseConfigured) {
        const { error } = await sb().from('profiles').update({ role }).eq('id', userId)
        return error ? { ok: false, err: 'generic' } : { ok: true }
      }
      const u = db().users.find((x) => x.id === userId)
      if (u) {
        u.role = role
        saveDB()
      }
      return { ok: true }
    },

    async saveProduct(p: Product): Promise<EmailResult> {
      if (isSupabaseConfigured) {
        const row = mapProductToRow(p)
        if (!isUuid(p.id)) {
          // demo-style/pending id: match on slug — update if the row already exists, insert otherwise
          delete row.id
          const existing = await sb().from('products').select('id').eq('slug', p.slug).maybeSingle()
          const targetId = (existing?.data as { id: string } | null)?.id
          if (targetId) {
            const { error } = await sb().from('products').update(row).eq('id', targetId)
            return error ? { ok: false, err: 'generic' } : { ok: true }
          }
        }
        const { error } = await sb().from('products').upsert(row, { onConflict: 'id' })
        return error ? { ok: false, err: 'generic' } : { ok: true }
      }
      const idx = db().products.findIndex((x) => x.id === p.id)
      if (idx >= 0) db().products[idx] = p
      else db().products.unshift(p)
      saveDB()
      return { ok: true }
    },

    async deleteProduct(id: string): Promise<EmailResult> {
      if (isSupabaseConfigured) {
        const { error } = await sb().from('products').delete().eq('id', id)
        return error ? { ok: false, err: 'generic' } : { ok: true }
      }
      const i = db().products.findIndex((x) => x.id === id)
      if (i >= 0) {
        db().products.splice(i, 1)
        saveDB()
      }
      return { ok: true }
    },

    async saveCategory(c: Category): Promise<EmailResult> {
      if (isSupabaseConfigured) {
        const row = { id: c.id, slug: c.slug, experience: c.experience, label: c.label, desc: c.desc, sort: c.sort, active: c.active }
        if (!isUuid(c.id)) {
          // demo-style id: match on slug, then update-or-insert without forcing a bad uuid
          const { data: existing } = await sb().from('categories').select('id').eq('slug', c.slug).maybeSingle()
          const targetId = (existing as { id: string } | null)?.id
          if (targetId) {
            const { error } = await sb().from('categories').update(row).eq('id', targetId)
            return error ? { ok: false, err: 'generic' } : { ok: true }
          }
          delete (row as Record<string, unknown>).id
        }
        const { error } = await sb().from('categories').upsert(row, { onConflict: 'id' })
        return error ? { ok: false, err: 'generic' } : { ok: true }
      }
      const idx = db().categories.findIndex((x) => x.id === c.id)
      if (idx >= 0) db().categories[idx] = c
      else {
        const c2 = { ...c, id: 'c_' + uid().slice(0, 8) }
        db().categories.push(c2)
      }
      saveDB()
      return { ok: true }
    },

    async deleteCategory(id: string): Promise<EmailResult> {
      if (isSupabaseConfigured) {
        const { error } = await sb().from('categories').delete().eq('id', id)
        return error ? { ok: false, err: 'generic' } : { ok: true }
      }
      const i = db().categories.findIndex((x) => x.id === id)
      if (i >= 0) {
        db().categories.splice(i, 1)
        saveDB()
      }
      return { ok: true }
    },

    async saveSettings(s: Settings): Promise<EmailResult> {
      if (isSupabaseConfigured) {
        const { error } = await sb()
          .from('site_settings')
          .upsert({ key: 'storefront', value: s, updated_at: new Date().toISOString() }, { onConflict: 'key' })
        return error ? { ok: false, err: 'generic' } : { ok: true }
      }
      db().settings = s
      saveDB()
      return { ok: true }
    },

    async savePromos(list: Promo[]): Promise<EmailResult> {
      if (isSupabaseConfigured) {
        const { error } = await sb().from('promos').upsert(list)
        return error ? { ok: false, err: 'generic' } : { ok: true }
      }
      db().promos = list
      saveDB()
      return { ok: true }
    },

    async listPromos(): Promise<Promo[]> {
      if (isSupabaseConfigured) {
        const { data } = await sb().from('promos').select('*')
        return (data ?? []) as unknown as Promo[]
      }
      return clone(db().promos)
    },

    /** Regulated-product approval decision. Only administrators may call this. */
    async setRegStatus(productId: string, status: 'approved' | 'pending' | 'off'): Promise<EmailResult> {
      if (isSupabaseConfigured) {
        const user = await api.getUser()
        const { error: e1 } = await sb().from('products').update({ reg_status: status }).eq('id', productId)
        const { error: e2 } = await sb().from('regulated_approvals').upsert(
          { product_id: productId, status, reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() },
          { onConflict: 'product_id' },
        )
        return e1 || e2 ? { ok: false, err: 'generic' } : { ok: true }
      }
      const p = db().products.find((x) => x.id === productId)
      if (p) {
        p.regStatus = status
        saveDB()
      }
      return { ok: true }
    },

    async uploadImage(file: File): Promise<string> {
      if (isSupabaseConfigured) {
        const path = `products/${Date.now()}-${file.name.replace(/\s+/g, '-')}`
        const { error } = await sb().storage.from('product-images').upload(path, file, { upsert: true })
        if (error) throw new Error(error.message)
        return sb().storage.from('product-images').getPublicUrl(path).data.publicUrl
      }
      // demo mode: inline data URL (works offline, no server required)
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('read failed'))
        reader.readAsDataURL(file)
      })
    },
  },
}

/* ─────────────────────────────────────────────────────────────
   Supabase row mappers
   ───────────────────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProductFromRow(r: any): Product {
  return {
    id: r.id,
    slug: r.slug,
    categorySlug: r.category_slug,
    sku: r.sku ?? '',
    label: r.label,
    description: r.description,
    overview: r.overview ?? undefined,
    ingredients: r.ingredients ?? undefined,
    usage: r.usage ?? undefined,
    brand: r.brand ?? '',
    manufacturer: r.manufacturer ?? undefined,
    origin: r.origin ?? undefined,
    price: Number(r.price),
    comparePrice: r.compare_price ? Number(r.compare_price) : undefined,
    stock: r.stock ?? 0,
    images: r.images ?? [],
    badges: r.badges ?? [],
    regulated: r.regulated ?? false,
    regStatus: (r.reg_status ?? 'off') as Product['regStatus'],
    age18: r.age_18 ?? false,
    active: r.active ?? true,
    createdAt: r.created_at ?? new Date().toISOString(),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProductToRow(p: Product): Record<string, unknown> {
  return {
    id: p.id,
    slug: p.slug,
    category_slug: p.categorySlug,
    sku: p.sku,
    label: p.label,
    description: p.description,
    overview: p.overview ?? null,
    ingredients: p.ingredients ?? null,
    usage: p.usage ?? null,
    brand: p.brand,
    manufacturer: p.manufacturer ?? null,
    origin: p.origin ?? null,
    price: p.price,
    compare_price: p.comparePrice ?? null,
    stock: p.stock,
    images: p.images,
    badges: p.badges,
    regulated: p.regulated ?? false,
    reg_status: p.regStatus,
    age_18: p.age18 ?? false,
    active: p.active ?? true,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapReviewFromRow(r: any): Review {
  return {
    id: r.id,
    productSlug: r.product_slug,
    userId: r.user_id ?? undefined,
    name: r.name,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAddressFromRow(r: any): Address {
  return {
    id: r.id,
    userId: r.user_id,
    label: r.label ?? undefined,
    fullName: r.full_name,
    phone: r.phone,
    city: r.city,
    district: r.district,
    street: r.street,
    building: r.building ?? undefined,
    isDefault: r.is_default ?? false,
  }
}

function mapAddressToRow(a: Partial<Address> & { fullName: string; phone: string; city: string; district: string; street: string }, userId: string) {
  return {
    user_id: userId,
    label: a.label ?? null,
    full_name: a.fullName,
    phone: a.phone,
    city: a.city,
    district: a.district,
    street: a.street,
    building: a.building ?? null,
    is_default: a.isDefault ?? false,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOrderFromRow(r: any): Order {
  return {
    id: r.id,
    number: r.number,
    userId: r.user_id ?? undefined,
    items: r.items ?? [],
    contact: r.contact,
    address: r.address,
    subtotal: Number(r.subtotal),
    shipping: Number(r.shipping),
    discount: Number(r.discount),
    total: Number(r.total),
    paymentMethod: r.payment_method === 'bank' ? 'bank' : 'cod',
    shippingMethod: r.shipping_method ?? 'standard',
    status: r.status,
    createdAt: r.created_at,
  }
}

export type { Order, OrderStatus, Settings, Banner }
export const __demoNote = isSupabaseConfigured ? null : 'demo'
