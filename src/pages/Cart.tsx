import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useApp } from '../state/app'
import { api } from '../data/api'
import { QtyStepper, PageHead } from '../components/ui'
import { productTitle } from '../data/util'
import type { Product, Promo } from '../data/types'
import { Truck } from '../components/Icons'

export default function Cart() {
  const { t, locale, money } = useI18n()
  const { cart, products, settings, updateCartQty, removeFromCart, notify, user } = useApp()
  const nav = useNavigate()
  const [promo, setPromo] = useState('')
  const [applied, setApplied] = useState<Promo | null>(null)
  const [promoErr, setPromoErr] = useState('')

  const l = locale as 'ar' | 'en' | 'tl'
  const bySlug = useMemo(() => new Map(products.map((p) => [p.slug, p])), [products])

  const lines: { slug: string; qty: number; p: Product }[] = useMemo(
    () =>
      cart
        .map((c) => ({ slug: c.slug, qty: c.qty, p: bySlug.get(c.slug) }))
        .filter((x): x is { slug: string; qty: number; p: Product } => Boolean(x.p)),
    [cart, bySlug],
  )

  const subtotal = lines.reduce((s, x) => s + x.p.price * x.qty, 0)
  const discount = applied
    ? applied.kind === 'percent'
      ? Math.round(((subtotal * applied.value) / 100) * 100) / 100
      : Math.min(applied.value, subtotal)
    : 0
  const shippingEstimate = subtotal - discount >= settings.freeOver ? 0 : settings.shipStandard
  const tax = settings.vatInclusive === false && settings.vat > 0
    ? Math.round(((subtotal - discount) * settings.vat) / 100 * 100) / 100
    : 0
  const totalEstimate = Math.max(0, subtotal - discount + shippingEstimate + tax)

  void user

  async function applyPromo(e: React.FormEvent) {
    e.preventDefault()
    if (!promo.trim()) return
    const pr = await api.checkPromo(promo)
    if (pr) {
      setApplied(pr)
      setPromoErr('')
      try { window.sessionStorage.setItem('hh_promo', pr.code) } catch { /* ignore */ }
      notify(t('cart.promoApplied'))
    } else {
      setApplied(null)
      setPromoErr(t('cart.promoInvalid'))
    }
  }

  if (lines.length === 0) {
    return (
      <main className="page">
        <div className="wrap empty-pane">
          <div className="empty-emoji">🛒</div>
          <div className="empty-title">{t('cart.empty')}</div>
          <div className="empty-sub">{t('cart.emptyHint')}</div>
          <Link to="/shop" className="btn btn-primary">{t('cart.continue')}</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <div className="wrap">
        <PageHead title={t('cart.title')} />

        <div className="cart-layout">
          <section className="cart-lines card">
            {lines.map(({ p, qty }) => {
              const title = productTitle(p, l)
              return (
                <div key={p.slug} className="cart-line">
                  <Link to={`/product/${p.slug}`} className="cart-thumb"><img src={p.images[0]} alt={title} loading="lazy" /></Link>
                  <div className="cart-mid">
                    <Link to={`/product/${p.slug}`} className="cart-name">{title}</Link>
                    <span className="muted small">{p.sku}</span>
                    <span className="muted small">{money(p.price)}</span>
                  </div>
                  <QtyStepper value={qty} onChange={(v) => updateCartQty(p.slug, v)} max={Math.max(1, p.stock)} />
                  <strong className="cart-sum">{money(p.price * qty)}</strong>
                  <button className="cart-remove" onClick={() => { removeFromCart(p.slug); notify(t('cart.remove')) }} title={t('cart.remove')}>✕</button>
                </div>
              )
            })}
          </section>

          <aside className="cart-summary card">
            <h3>{t('cart.summary')}</h3>
            <dl>
              <div><dt>{t('cart.subtotal')}</dt><dd>{money(subtotal)}</dd></div>
              {discount > 0 && <div className="ok"><dt>{t('cart.discount')}</dt><dd>−{money(discount)}</dd></div>}
              <div><dt>{t('cart.shipping')}</dt><dd>{shippingEstimate === 0 ? t('cart.free') : money(shippingEstimate)}</dd></div>
              {tax > 0 && <div><dt>{t('cart.vat')} ({settings.vat}%)</dt><dd>{money(tax)}</dd></div>}
              <div className="grand"><dt>{t('cart.total')}</dt><dd>{money(totalEstimate)}</dd></div>
            </dl>

            {subtotal < settings.freeOver && (
              <p className="ship-hint"><Truck size={14} /> {money(settings.freeOver - (subtotal - discount))} → {t('cart.free')}</p>
            )}

            <form className="promo-row" onSubmit={applyPromo}>
              <input className="input" value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} placeholder={t('cart.code')} aria-label={t('cart.code')} />
              <button className="btn btn-outline" type="submit">{t('cart.apply')}</button>
            </form>
            {promoErr && <p className="form-error">{promoErr}</p>}

            <button className="btn btn-primary btn-block btn-lg" onClick={() => nav('/checkout', { state: { promo: applied?.code ?? null } })}>
              {t('cart.checkoutBtn')}
            </button>
            <Link to="/shop" className="link-muted">{t('cart.continue')}</Link>
            <p className="muted small">{settings.vatInclusive === false ? t('cart.vatExclNote') : t('cart.vatNote')}</p>
          </aside>
        </div>
      </div>
    </main>
  )
}
