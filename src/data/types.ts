import type { Locale } from '../i18n/types'

export type L10n = Record<Locale, string>

export type CategoryExperience = 'beauty' | 'health'

export interface Category {
  id: string
  slug: string
  experience: CategoryExperience
  label: L10n
  desc: L10n
  sort: number
  active: boolean
}

export type ProdBadge = 'featured' | 'bestseller' | 'new' | 'sale'

export interface Product {
  id: string
  slug: string
  categorySlug: string
  sku: string
  label: L10n
  description: L10n
  overview?: L10n
  ingredients?: L10n
  usage?: L10n
  brand: string
  manufacturer?: string
  origin?: string
  price: number
  comparePrice?: number
  stock: number
  /** Image URLs; demo catalog uses locally generated SVG art so it works offline. */
  images: string[]
  badges: ProdBadge[]
  /** customer-facing rating, only present when genuine reviews exist */
  rating?: { avg: number; count: number }
  sold?: number
  active: boolean
  /** regulatory controls */
  regulated?: boolean
  regStatus: 'approved' | 'pending' | 'off'
  age18?: boolean
  createdAt: string
}

export interface Review {
  id: string
  productSlug: string
  userId?: string
  name: string
  rating: number
  comment: string
  createdAt: string
  /** bundled starter review (demo only): shown with a "demo review" tag and never counted in averages */
  seed?: boolean
}

export interface Address {
  id: string
  userId?: string
  label?: string
  fullName: string
  phone: string
  city: string
  district: string
  street: string
  building?: string
  isDefault?: boolean
}

export interface UserProfile {
  id: string
  email: string
  name: string
  phone?: string
  role: 'customer' | 'admin'
  createdAt: string
}

export interface OrderItem {
  slug: string
  label: L10n
  price: number
  comparePrice?: number
  qty: number
  image?: string
}

export type OrderStatus = 'pending' | 'shipped' | 'delivered' | 'cancelled'

export interface Order {
  id: string
  number: string
  userId?: string
  items: OrderItem[]
  contact: { name: string; email: string; phone: string }
  address: { city: string; district: string; street: string; building?: string; notes?: string }
  subtotal: number
  shipping: number
  discount: number
  total: number
  paymentMethod: 'cod' | 'bank'
  shippingMethod: 'standard' | 'express'
  status: OrderStatus
  createdAt: string
}

export interface Banner {
  id: string
  title: L10n
  sub: L10n
  ctaLink?: string
  image?: string
  active: boolean
  sort: number
}

export interface Settings {
  shipStandard: number
  shipExpress: number
  freeOver: number
  vat: number
  /** prices already include VAT (B2C norm) — when false, VAT is added on top at order time */
  vatInclusive: boolean
  storeName: L10n
  banners: Banner[]
  payments: { cod: boolean; bank: boolean; bankName: string; bankIban: string; bankNote: string }
  /** admin-managed contact details (footer, WhatsApp, invoices) */
  contacts: { phone: string; email: string; address: string; hours: string }
}

/** Promo codes are simple site-level coupons; validated against settings-backed list in demo, promos table in Supabase. */
export interface Promo {
  code: string
  kind: 'percent' | 'fixed'
  value: number
  active: boolean
}

export interface CartLine {
  slug: string
  qty: number
  /** chosen variation, reserved for future use */
  variant?: string
}

export interface CheckoutDraft {
  contact: { name: string; email: string; phone: string }
  address: { city: string; district: string; street: string; building?: string; notes?: string }
  shippingMethod: 'standard' | 'express'
  paymentMethod: 'cod' | 'bank'
  promoCode?: string
}
