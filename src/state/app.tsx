import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../data/api'
import { DEFAULT_SETTINGS } from '../data/catalog'
import type { CartLine, Category, Order, OrderStatus, Product, Settings, UserProfile } from '../data/types'

/* ─────────────────────────────────────────────────────────────
   Generic localStorage hook
   ───────────────────────────────────────────────────────────── */

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeLS(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

function useLS<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => readLS(key, initial))
  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v
        writeLS(key, next)
        return next
      })
    },
    [key],
  )
  return [value, set]
}

/* ─────────────────────────────────────────────────────────────
   Toasts
   ───────────────────────────────────────────────────────────── */

type Toast = { id: number; text: string }
let toastSeq = 1

/* ─────────────────────────────────────────────────────────────
   App state
   ───────────────────────────────────────────────────────────── */

type AppState = {
  /* catalog */
  products: Product[]
  categories: Category[]
  settings: Settings
  loading: boolean
  catalogError: string | null
  reloadCatalog: () => Promise<void>
  productBySlug: (slug: string) => Product | undefined

  /* auth */
  user: UserProfile | null
  authReady: boolean
  setUser: (u: UserProfile | null) => void

  /* cart */
  cart: CartLine[]
  addToCart: (slug: string, qty?: number) => void
  updateCartQty: (slug: string, qty: number) => void
  removeFromCart: (slug: string) => void
  clearCart: () => void

  /* wishlist */
  wishlist: string[]
  toggleWishlist: (slug: string) => void
  inWishlist: (slug: string) => boolean

  /* orders */
  myOrders: Order[]
  reloadOrders: () => Promise<void>

  /* toast */
  toasts: Toast[]
  notify: (text: string) => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  const [user, setUser] = useState<UserProfile | null>(null)
  const [authReady, setAuthReady] = useState(false)

  const [cart, setCart] = useLS<CartLine[]>('hh_cart', [])
  const [wishlist, setWishlist] = useLS<string[]>('hh_wishlist', [])
  const [myOrders, setMyOrders] = useState<Order[]>([])

  const [toasts, setToasts] = useState<Toast[]>([])
  const notify = useCallback((text: string) => {
    const id = toastSeq++
    setToasts((prev) => [...prev, { id, text }])
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200)
  }, [])

  const reloadCatalog = useCallback(async () => {
    setLoading(true)
    // In Supabase mode a failed connection must be surfaced clearly; never fall
    // back to demo/local data or silently show an empty catalog.
    const healthError = await api.health()
    if (healthError) {
      setCatalogError(healthError)
      setLoading(false)
      return
    }
    setCatalogError(null)
    const [ps, cs, st] = await Promise.all([api.listProducts({ publicOnly: true }), api.listCategories(), api.getSettings()])
    try {
      setProducts(ps)
      setCategories(cs)
      if (st) setSettings(st)
    } catch (e) {
      console.error('catalog load failed', e)
    } finally {
      setLoading(false)
    }
    // re-clamp saved cart lines against actual stock once products are known
    setCart((prev) =>
      prev
        .map((c) => {
          const p = ps.find((x) => x.slug === c.slug)
          return { ...c, qty: Math.min(c.qty, Math.max(1, p?.stock ?? 0)) }
        })
        .filter((c) => (ps.find((x) => x.slug === c.slug)?.stock ?? 0) > 0),
    )
  }, [])

  const reloadOrders = useCallback(async () => {
    const list = await api.listMyOrders()
    setMyOrders(list)
  }, [])

  /* initial load */
  useEffect(() => {
    void reloadCatalog()
    void api.getUser().then((u) => {
      setUser(u)
      setAuthReady(true)
    })
  }, [reloadCatalog])

  /* reload orders when user changes */
  useEffect(() => {
    if (user) void reloadOrders()
    else setMyOrders([])
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const productBySlug = useCallback((slug: string) => products.find((p) => p.slug === slug), [products])

  /* cart ops — quantities never exceed stock (clamped at add/update time and
     re-clamped whenever the catalog loads) */
  const addToCart = useCallback(
    (slug: string, qty = 1) => {
      setCart((prev) => {
        const stock = Math.max(1, products.find((p) => p.slug === slug)?.stock ?? 1)
        const existing = prev.find((c) => c.slug === slug)
        const want = Math.min((existing?.qty ?? 0) + qty, stock)
        if (existing) return prev.map((c) => (c.slug === slug ? { ...c, qty: want } : c))
        return [...prev, { slug, qty: want }]
      })
    },
    [setCart, products],
  )

  const updateCartQty = useCallback(
    (slug: string, qty: number) => {
      const stock = Math.max(1, products.find((p) => p.slug === slug)?.stock ?? 1)
      const clamped = Math.min(qty, stock)
      setCart((prev) => (clamped <= 0 ? prev.filter((c) => c.slug !== slug) : prev.map((c) => (c.slug === slug ? { ...c, qty: clamped } : c))))
    },
    [setCart, products],
  )

  const removeFromCart = useCallback((slug: string) => setCart((prev) => prev.filter((c) => c.slug !== slug)), [setCart])
  const clearCart = useCallback(() => setCart([]), [setCart])

  /* wishlist */
  const toggleWishlist = useCallback(
    (slug: string) =>
      setWishlist((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug])),
    [setWishlist],
  )
  const inWishlist = useCallback((slug: string) => wishlist.includes(slug), [wishlist])

  const value: AppState = {
    products,
    categories,
    settings,
    loading,
    catalogError,
    reloadCatalog,
    productBySlug,
    user,
    authReady,
    setUser,
    cart,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    wishlist,
    toggleWishlist,
    inWishlist,
    myOrders,
    reloadOrders,
    toasts,
    notify,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export type { OrderStatus }
