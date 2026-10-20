import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { api } from '../data/api'
import Logo from '../components/Logo'
import { useApp } from '../state/app'
import type { Order } from '../data/types'

/** Printable invoice for a completed order: /invoice/:number (attach to customer delivery). */
export default function Invoice() {
  const { number = '' } = useParams()
  const { t, locale, money, formatDate } = useI18n()
  const { settings } = useApp()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void api.getOrder(number).then((o) => {
      setOrder(o)
      setLoading(false)
    })
  }, [number])

  if (loading) return <div className="loading-block"><div className="spinner" /></div>
  if (!order) return <main className="page"><div className="wrap"><div className="empty card"><h2>{t('shop.noResults')}</h2><Link to="/shop" className="btn btn-primary">{t('checkout.continue')}</Link></div></div></main>

  const l = locale as 'ar' | 'en' | 'tl'
  const cod = t(`checkout.pay_${order.paymentMethod}`)
  const ship = t(`checkout.${order.shippingMethod}`)

  return (
    <main className="page invoice-page">
      <div className="wrap invoice-wrap">
        <div className="invoice-bar no-print">
          <Link to={`/order/${order.number}`} className="btn btn-ghost" dir="auto">← {t('invoice.back')}</Link>
          <button className="btn btn-primary" onClick={() => window.print()}>{t('invoice.print')}</button>
        </div>

        <div className="card invoice-card">
          <header className="invoice-head">
            <div className="invoice-brand">
              <Logo height={44} withTagline={false} />
              <p className="muted">{t('invoice.legalNote')}</p>
            </div>
            <div className="invoice-meta" dir="ltr">
              <h1>{t('invoice.title')}</h1>
              <dl>
                <div><dt>{t('invoice.no')}</dt><dd>{order.number}</dd></div>
                <div><dt>{t('admin.dateCol')}</dt><dd>{formatDate(order.createdAt)}</dd></div>
                <div><dt>{t('cart.total')}</dt><dd><b>{money(order.total)}</b></dd></div>
              </dl>
            </div>
          </header>

          <section className="invoice-parties">
            <div>
              <h3>{t('invoice.soldTo')}</h3>
              <p><b>{order.contact.name}</b></p>
              <p dir="ltr" className="muted">{order.contact.phone}</p>
              <p dir="ltr" className="muted">{order.contact.email}</p>
            </div>
            <div>
              <h3>{t('invoice.shipTo')}</h3>
              <p><b>{[order.address.city, order.address.district].filter(Boolean).join(' — ')}</b></p>
              <p className="muted">{order.address.street}{order.address.building ? `, ${order.address.building}` : ''}</p>
            </div>
            <div className="invoice-facts">
              <div><small>{t('checkout.payment')}</small><b>{cod}</b></div>
              <div><small>{t('checkout.shipping')}</small><b>{ship}</b></div>
              <div><small>{t('account.view')}</small><b>{t(`account.st_${order.status}`)}</b></div>
            </div>
          </section>

          <table className="adm-table invoice-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t('invoice.item')}</th>
                <th>{t('product.qty')}</th>
                <th>{t('product.price')}</th>
                <th>{t('cart.total')}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((i, n) => (
                <tr key={i.slug}>
                  <td>{n + 1}</td>
                  <td><b>{i.label[l] || i.label.en}</b></td>
                  <td>{i.qty}</td>
                  <td>{money(i.price)}</td>
                  <td><b>{money(i.price * i.qty)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>

          <section className="invoice-totals">
            <dl>
              <div><dt>{t('cart.subtotal')}</dt><dd>{money(order.subtotal)}</dd></div>
              {order.discount > 0 && (
                <div><dt>{t('cart.discount')}</dt><dd className="pos">− {money(order.discount)}</dd></div>
              )}
              <div><dt>{t('cart.shipping')}</dt><dd>{order.shipping === 0 ? t('cart.free') : money(order.shipping)}</dd></div>
              {settings.vat > 0 && (
                <div>
                  <dt>{t('invoice.vatLabel')} ({settings.vat}%)</dt>
                  <dd>
                    {settings.vatInclusive === false
                      ? money(Math.round(((order.subtotal - order.discount) * settings.vat) / 100 * 100) / 100)
                      : money(Math.round((order.total - order.total / (1 + settings.vat / 100)) * 100) / 100)}
                  </dd>
                </div>
              )}
              <div className="invoice-grand"><dt>{t('cart.total')}</dt><dd><b>{money(order.total)}</b></dd></div>
              {settings.vat > 0 && (
                <p className="muted small">
                  {settings.vatInclusive === false ? t('invoice.vatExcl') : t('invoice.vatIncl')}
                </p>
              )}
            </dl>
          </section>

          <footer className="invoice-foot">
            {order.paymentMethod === 'bank' && settings.payments && (
              <p className="pay-iban" dir="ltr">{settings.payments.bankName} — IBAN: {settings.payments.bankIban}</p>
            )}
            <p>{t('invoice.thanks')}</p>
            <small className="muted">{t('invoice.footerNote')}</small>
          </footer>
        </div>
      </div>
    </main>
  )
}
