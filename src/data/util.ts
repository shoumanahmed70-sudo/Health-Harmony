import type { L10n, Product } from './types'

export type TextField = 'description' | 'overview' | 'ingredients' | 'usage'

function loc(locale: string): keyof L10n {
  return (['ar', 'en', 'tl'].includes(locale) ? locale : 'en') as keyof L10n
}

export function productTitle(p: Product, locale: string): string {
  return p.label[loc(locale)] || p.label.en
}

export function productText(p: Product, field: TextField, locale: string): string {
  const f = p[field]
  if (!f) return ''
  return f[loc(locale)] || f.en
}

/** Normalize a Saudi phone to international wa.me format (9665...). */
export function toIntlPhone(phone: string): string {
  const p = phone.replace(/[\s-]/g, '')
  if (/^05\d{8}$/.test(p)) return '966' + p.slice(1)
  if (/^\+9665\d{8}$/.test(p)) return p.slice(1)
  return p.replace(/^\+/, '')
}

/** Prefilled WhatsApp deep-link used by admin to notify the customer about order status. */
export function waLink(phone: string, text: string): string {
  return 'https://wa.me/' + toIntlPhone(phone) + '?text=' + encodeURIComponent(text)
}

/* ─────────────────────────────────────────────────────────────
   Placeholder detection — seeded demo values must never be shown
   to real customers as if they were the store's contact details.
   ───────────────────────────────────────────────────────────── */

/** True when a phone is empty, all zeros, or the seeded 0550000000 value. */
export function isPlaceholderPhone(phone?: string): boolean {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (!digits) return true
  if (/^0+$/.test(digits)) return true
  if (/0{6,}/.test(digits)) return true
  return digits === '966500000000'
}

/** True when an email is empty or still uses an example/placeholder domain. */
export function isPlaceholderEmail(email?: string): boolean {
  const value = (email ?? '').trim().toLowerCase()
  if (!value) return true
  return value.includes('example') || value.endsWith('@health-harmony.example')
}

/** True when an address still contains the seeded "edit from admin" marker. */
export function isPlaceholderAddress(address?: string): boolean {
  const value = (address ?? '').trim()
  if (!value) return true
  return /عدّل|مثال|example|placeholder/i.test(value)
}

/** True when bank details are missing or still the seeded placeholder IBAN. */
export function bankIsPlaceholder(payments?: { bankName?: string; bankIban?: string } | null): boolean {
  const iban = (payments?.bankIban ?? '').replace(/\s+/g, '').toUpperCase()
  if (!iban) return true
  if (/^SA0+$/.test(iban)) return true
  return /مثال|example/i.test(payments?.bankName ?? '')
}

/** At least one real contact channel is configured. */
export function hasRealContact(contacts?: { phone?: string; email?: string; address?: string } | null): boolean {
  if (!contacts) return false
  return !isPlaceholderPhone(contacts.phone) || !isPlaceholderEmail(contacts.email) || !isPlaceholderAddress(contacts.address)
}
