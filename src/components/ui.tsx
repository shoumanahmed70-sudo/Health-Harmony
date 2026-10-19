import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useApp } from '../state/app'
import type { Product } from '../data/types'
import { productTitle, productText } from '../data/util'

export { productTitle, productText }

/* ─────────────────────────────────────────────────────────────
   Money / text helpers
   ───────────────────────────────────────────────────────────── */

export function priceLabel(p: Product): { now: string; was?: string; off?: number } {
  const { money, locale } = useI18n()
  const now = money(p.price)
  const was = p.comparePrice && p.comparePrice > p.price ? money(p.comparePrice) : undefined
  const off =
    p.comparePrice && p.comparePrice > p.price
      ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)
      : undefined
  void locale
  return { now, was, off }
}

/* ─────────────────────────────────────────────────────────────
   Star rating (only rendered when genuine reviews exist)
   ───────────────────────────────────────────────────────────── */

export function Stars({ avg, count, small }: { avg: number; count?: number; small?: boolean }) {
  const { t } = useI18n()
  const stars = []
  const full = Math.floor(avg)
  const half = avg - full >= 0.5
  for (let i = 1; i <= 5; i++) {
    const cls = i <= full ? 'full' : i === full + 1 && half ? 'half' : 'empty'
    stars.push(
      <span key={i} className={`star ${cls}${small ? ' s-sm' : ''}`} aria-hidden="true">
        ★
      </span>,
    )
  }
  return (
    <span className="stars" title={`${avg.toFixed(1)} / 5`}>
      {stars}
      {typeof count === 'number' && <em className="stars-n"> ({count})</em>}
      <span className="sr-only">{`${avg.toFixed(1)} / 5 — ${count ?? 0} ${t('product.reviews')}`}</span>
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────
   Badges
   ───────────────────────────────────────────────────────────── */

export function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>
}

export function StockBadge({ stock }: { stock: number }) {
  const { t } = useI18n()
  if (stock <= 0) return <Badge tone="badge-gray">{t('product.out')}</Badge>
  if (stock <= 10) return <Badge tone="badge-cream">{t('product.lowStock')}</Badge>
  return <Badge tone="badge-green">{t('product.inStock')}</Badge>
}

/* ─────────────────────────────────────────────────────────────
   Product card
   ───────────────────────────────────────────────────────────── */

export function ProductCard({ p }: { p: Product }) {
  const { locale, t } = useI18n()
  const { addToCart, toggleWishlist, inWishlist, notify } = useApp()
  const wished = inWishlist(p.slug)
  const { now, was, off } = priceLabel(p)
  let ageOk = true
  try {
    ageOk = p.age18 ? window.localStorage.getItem('hh_age_ok') === '1' : true
  } catch {
    ageOk = !p.age18
  }
  const addDisabled = p.stock <= 0 || (p.age18 && !ageOk)

  return (
    <article className="p-card">
      <div className="p-card-media">
        <Link to={`/product/${p.slug}`}>
          <img src={p.images[0]} alt={productTitle(p, locale)} loading="lazy" />
        </Link>
        <div className="p-card-badges">
          {p.badges.includes('new') && <Badge tone="badge-rose">{t('product.new')}</Badge>}
          {p.badges.includes('bestseller') && <Badge tone="badge-cream">{t('home.bestTitle')}</Badge>}
          {off !== undefined && <Badge tone="badge-red">{`${off}% ${t('product.off')}`}</Badge>}
        </div>
        <button
          className={`wish-btn${wished ? ' on' : ''}`}
          onClick={() => {
            toggleWishlist(p.slug)
            notify(wished ? t('account.wishlist') + ' —' : t('account.wishlist') + ' ✓')
          }}
          aria-label={t('account.wishlist')}
          title={t('account.wishlist')}
        >
          {wished ? '♥' : '♡'}
        </button>
        {p.stock <= 0 && <div className="p-card-out">{t('product.out')}</div>}
      </div>
      <div className="p-card-body">
        {p.rating && <Stars avg={p.rating.avg} count={p.rating.count} small />}
        <Link to={`/product/${p.slug}`} className="p-card-title">
          {productTitle(p, locale)}
        </Link>
        <div className="p-card-price">
          <strong>{now}</strong>
          {was && <del>{was}</del>}
        </div>
        <div className="p-card-actions">
          <button
            className="btn btn-primary btn-sm"
            disabled={addDisabled}
            title={p.age18 && !ageOk ? t('product.ageTitle') : undefined}
            onClick={() => {
              addToCart(p.slug)
              notify(t('product.added'))
            }}
          >
            {t('product.addToCart')}
          </button>
          <Link className="btn btn-outline btn-sm" to={`/product/${p.slug}`}>
            {t('product.viewDetails')}
          </Link>
        </div>
      </div>
    </article>
  )
}

export function ProductGrid({ items }: { items: Product[] }) {
  if (!items.length) return null
  return (
    <div className="grid" style={{ '--min': '240px' } as CSSProperties}>
      {items.map((p) => (
        <ProductCard key={p.slug} p={p} />
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Section head
   ───────────────────────────────────────────────────────────── */

export function SectionHead({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="section-head">
      <div>
        <h2 className="section-title">{title}</h2>
        {sub && <p className="section-sub">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Page top strip (hero-lite for secondary pages)
   ───────────────────────────────────────────────────────────── */

export function PageHead({ title, sub, crumb }: { title: string; sub?: string; crumb?: { to: string; label: string } }) {
  const { dir } = useI18n()
  return (
    <div className="page-head card" dir={dir}>
      {crumb && (
        <nav className="crumbs" aria-label="breadcrumb">
          <Link to="/">{crumb.label === 'Home' ? crumb.label : crumb.label}</Link>
          <span aria-hidden="true">/</span>
          <b>{title}</b>
        </nav>
      )}
      <h1>{title}</h1>
      {sub && <p className="section-sub">{sub}</p>}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Route guards
   ───────────────────────────────────────────────────────────── */

export function RequireUser({ children }: { children: ReactNode }) {
  const { authReady, user } = useApp()
  const loc = useLocation()
  if (!authReady) return <div className="loading-block"><div className="spinner" /></div>
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  return <>{children}</>
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { authReady, user } = useApp()
  if (!authReady) return <div className="loading-block"><div className="spinner" /></div>
  if (!user || user.role !== 'admin') return <Navigate to="/login?next=admin" replace />
  return <>{children}</>
}

/* ─────────────────────────────────────────────────────────────
   Modal
   ───────────────────────────────────────────────────────────── */

export function Modal({ open, onClose, children, width = 480 }: { open: boolean; onClose: () => void; children: ReactNode; width?: number }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal card" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Quantity stepper
   ───────────────────────────────────────────────────────────── */

export function QtyStepper({ value, onChange, max = 99 }: { value: number; onChange: (v: number) => void; max?: number }) {
  const { t } = useI18n()
  return (
    <div className="qty" role="group" aria-label={t('product.qty')}>
      <button className="qty-btn" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label="−">−</button>
      <span className="qty-n">{value}</span>
      <button className="qty-btn" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="+">+</button>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Toasts host
   ───────────────────────────────────────────────────────────── */

export function Toasts() {
  const { toasts } = useApp()
  return (
    <>
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          {t.text}
        </div>
      ))}
    </>
  )
}
