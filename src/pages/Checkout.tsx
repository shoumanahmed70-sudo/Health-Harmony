import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useApp } from '../state/app'
import { api } from '../data/api'
import { PageHead, productTitle } from '../components/ui'
import { productTitle as pt } from '../data/util'
import type { Product, Settings } from '../data/types'

type Errors = Partial<Record<'name' | 'email' | 'phone' | 'city' | 'street' | 'agree', string>>

export default function Checkout() {
  const { t, locale, money } = useI18n()
  const { cart, products, settings, user, clearCart, notify } = useApp()
  const payFallback = settings.payments as Partial<Settings['payments']> | undefined
  const pay = {
    cod: true,
    bank: true,
    bankName: 'Al-Ahli Bank — Health Harmony (example)',
    bankIban: 'SA00 0000 0000 0000 0000 0000',
    bankNote: t('checkout.bankNote'),
    ...(payFallback ?? {}),
  } as Settings['payments']
  const nav = useNavigate()
  const loc = useLocation() as { state?: { promo?: string | null } }

  const l = locale as 'ar' | 'en' | 'tl'
  const [promoCode] = useState(loc.state?.promo ?? '')

  const [f, setF] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    city: '',
    district: '',
    street: '',
    building: '',
    notes: '',
    shippingMethod: 'standard' as 'standard' | 'express',
    payment: 'cod' as 'cod' | 'bank',
    agree: false,
  })
  const [errors, setErrors] = useState<Errors>({})
  const [placing, setPlacing] = useState(false)
  const [orderErr, setOrderErr] = useState<string | null>(null)

  const bySlug = useMemo(() => new Map<string, Product>(products.map((p) => [p.slug, p])), [products])
  const lines = useMemo(
    () =>
      cart
        .map((c) => ({ slug: c.slug, qty: c.qty, p: bySlug.get(c.slug) }))
        .filter((x): x is { slug: string; qty: number; p: Product } => Boolean(x.p)),
    [cart, bySlug],
  )

  const subtotal = lines.reduce((s, x) => s + x.p.price * x.qty, 0)
  // live promo preview — same rule the order backend enforces (clamped, % or fixed)
  const [disc, setDisc] = useState(0)
  useEffect(() => {
    let alive = true
    const code = loc.state?.promo as string | undefined
    if (!code) {
      setDisc(0)
      return
    }
    void api.checkPromo(code).then((pr) => {
      if (!alive || !pr) {
        if (alive) setDisc(0)
        return
      }
      setDisc(pr.kind === 'percent' ? Math.round(((subtotal * pr.value) / 100) * 100) / 100 : Math.min(pr.value, subtotal))
    })
    return () => {
      alive = false
    }
  }, [loc.state, subtotal])
  const discount = disc
  const shipBase = f.shippingMethod === 'express' ? settings.shipExpress : settings.shipStandard
  const shipping = subtotal - discount >= settings.freeOver ? 0 : shipBase
  const total = Math.max(0, subtotal - discount + shipping)

  void productTitle

  if (lines.length === 0) {
    return (
      <main className="page">
        <div className="wrap empty-pane">
          <div className="empty-emoji">🛒</div>
          <div className="empty-title">{t('cart.empty')}</div>
          <Link to="/shop" className="btn btn-primary">{t('cart.continue')}</Link>
        </div>
      </main>
    )
  }

  const set = (k: keyof typeof f, v: string | boolean) => setF((prev) => ({ ...prev, [k]: v }) as typeof prev)

  const validate = (): boolean => {
    const e: Errors = {}
    if (f.name.trim().length < 2) e.name = t('err.reqName')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = t('err.reqEmail')
    if (!/^(\+9665\d{8}|05\d{8})$/.test(f.phone.replace(/[\s-]/g, ''))) e.phone = t('err.reqPhone')
    if (f.city.trim().length < 2) e.city = t('err.reqCity')
    if (f.street.trim().length < 2) e.street = t('err.reqStreet')
    if (!f.agree) e.agree = t('err.reqAgree')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const place = async () => {
    if (!validate()) return
    setPlacing(true)
    setOrderErr(null)
    const res = await api.createOrder(
      {
        contact: { name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() },
        address: { city: f.city.trim(), district: f.district.trim(), street: f.street.trim(), building: f.building.trim() || undefined, notes: f.notes.trim() || undefined },
        shippingMethod: f.shippingMethod,
        paymentMethod: f.payment,
        promoCode: promoCode || undefined,
      },
      lines,
      user?.id,
    )
    setPlacing(false)
    if ('err' in res) {
      setOrderErr(t('err.generic'))
      return
    }
    clearCart()
    notify(t('checkout.okTitle'))
    nav(`/order/${res.number}`, { replace: true })
  }

  const hasAge18 = lines.some((x) => x.p.age18)

  return (
    <main className="page">
      <div className="wrap checkout-layout">
        <section>
          <PageHead title={t('checkout.title')} />

          <div className="form card">
            <h3>{t('checkout.contact')}</h3>
            <div className="form-grid">
              <div className="field">
                <label>{t('checkout.name')} *</label>
                <input className={`input${errors.name ? ' invalid' : ''}`} value={f.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>
              <div className="field">
                <label>{t('checkout.email')} *</label>
                <input className={`input${errors.email ? ' invalid' : ''}`} value={f.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" dir="ltr" />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>
              <div className="field">
                <label>{t('checkout.phone')} *</label>
                <input className={`input${errors.phone ? ' invalid' : ''}`} value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="05xxxxxxxx" dir="ltr" autoComplete="tel" />
                {errors.phone && <span className="form-error">{errors.phone}</span>}
              </div>
            </div>

            <h3>{t('checkout.address')}</h3>
            <div className="form-grid">
              <div className="field">
                <label>{t('checkout.city')} *</label>
                <input className={`input${errors.city ? ' invalid' : ''}`} value={f.city} onChange={(e) => set('city', e.target.value)} autoComplete="address-level2" />
                {errors.city && <span className="form-error">{errors.city}</span>}
              </div>
              <div className="field">
                <label>{t('checkout.district')}</label>
                <input className="input" value={f.district} onChange={(e) => set('district', e.target.value)} />
              </div>
              <div className="field">
                <label>{t('checkout.street')} *</label>
                <input className={`input${errors.street ? ' invalid' : ''}`} value={f.street} onChange={(e) => set('street', e.target.value)} autoComplete="street-address" />
                {errors.street && <span className="form-error">{errors.street}</span>}
              </div>
              <div className="field">
                <label>{t('checkout.building')}</label>
                <input className="input" value={f.building} onChange={(e) => set('building', e.target.value)} />
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>{t('checkout.notes')}</label>
                <textarea className="input" value={f.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
              </div>
            </div>

            <h3>{t('checkout.shippingM')}</h3>
            <div className="ship-cards">
              <button type="button" className={`ship-opt${f.shippingMethod === 'standard' ? ' on' : ''}`} onClick={() => set('shippingMethod', 'standard')}>
                <strong>{t('checkout.standard')}</strong>
                <span>{t('checkout.standardEta')} · {subtotal >= settings.freeOver ? t('cart.free') : money(settings.shipStandard)}</span>
              </button>
              <button type="button" className={`ship-opt${f.shippingMethod === 'express' ? ' on' : ''}`} onClick={() => set('shippingMethod', 'express')}>
                <strong>{t('checkout.express')}</strong>
                <span>{t('checkout.expressEta')} · {money(settings.shipExpress)}</span>
              </button>
            </div>

            <h3>{t('checkout.payTitle')}</h3>
            <div className="pay-box">
              {pay.cod && (
                <label className={`pay-opt${f.payment === 'cod' ? ' on' : ''}`}>
                  <input type="radio" name="paym" checked={f.payment === 'cod'} readOnly onClick={() => set('payment', 'cod')} />
                  <div>
                    <strong>💵 {t('checkout.cod')}</strong>
                    <span>{t('checkout.codNote')}</span>
                  </div>
                </label>
              )}
              {pay.bank && (
                <label className={`pay-opt${f.payment === 'bank' ? ' on' : ''}`}>
                  <input type="radio" name="paym" checked={f.payment === 'bank'} readOnly onClick={() => set('payment', 'bank')} />
                  <div>
                    <strong>🏦 {t('checkout.pay_bank')}</strong>
                    <span>{t('checkout.bankNote')}</span>
                    {f.payment === 'bank' && (
                      <b className="pay-iban" dir="ltr">{pay.bankName} — IBAN: {pay.bankIban}</b>
                    )}
                  </div>
                </label>
              )}
              <div className="pay-opt soon">
                <div>
                  <span aria-hidden="true">💳</span>
                  <div>
                    <strong>{t('checkout.cardSoon')}</strong>
                    <span>Supabase · Stripe/Mada — <i>integration marked as pending configuration</i></span>
                  </div>
                </div>
              </div>
            </div>

            {hasAge18 && (
              <p className="alert alert-info">
                🔞 {t('product.ageTitle')} — {t('product.ageText')}
              </p>
            )}

            <label className="agree-row">
              <input type="checkbox" checked={f.agree} onChange={(e) => set('agree', e.target.checked)} />
              <span>{t('checkout.agree')}</span>
            </label>
            {errors.agree && <p className="form-error">{errors.agree}</p>}

            {orderErr && <p className="alert alert-error">{orderErr}</p>}

            <button className="btn btn-primary btn-lg btn-block" disabled={placing} onClick={place}>
              {placing ? t('checkout.placing') : `${t('checkout.place')} — ${money(total)}`}
            </button>
          </div>
        </section>

        <aside className="checkout-summary card">
          <h3>{t('checkout.summary')}</h3>
          <ul className="sum-list">
            {lines.map(({ p, qty }) => (
              <li key={p.slug}>
                <img src={p.images[0]} alt="" loading="lazy" />
                <div>
                  <span>{pt(p, l)}</span>
                  <small className="muted">× {qty}</small>
                </div>
                <strong>{money(p.price * qty)}</strong>
              </li>
            ))}
          </ul>
          <dl className="sum-dl">
            <div><dt>{t('cart.subtotal')}</dt><dd>{money(subtotal)}</dd></div>
            {discount > 0 && (
              <div><dt>{t('cart.discount')}</dt><dd>− {money(discount)}</dd></div>
            )}
            <div><dt>{t('cart.shipping')}</dt><dd>{shipping === 0 ? t('cart.free') : money(shipping)}</dd></div>
            <div className="grand"><dt>{t('cart.total')}</dt><dd>{money(total)}</dd></div>
          </dl>
          <p className="muted small">{t('cart.vatNote')}</p>
        </aside>
      </div>
    </main>
  )
}
