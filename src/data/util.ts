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
