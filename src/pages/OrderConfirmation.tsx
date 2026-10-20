import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { api } from '../data/api'
import { Check } from '../components/Icons'
import type { Order } from '../data/types'

export default function OrderConfirmation() {
  const { number = '' } = useParams()
  const { t, locale, money, formatDate } = useI18n()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void api.getOrder(number).then((o) => {
      setOrder(o)
      setLoading(false)
    })
  }, [number])

  if (loading) return <div className="loading-block"><div className="spinner" /></div>

  const l = locale as 'ar' | 'en' | 'tl'

  if (order) {
    return (
      <main className="page">
        <div className="wrap confirm-wrap">
          <div className="confirm card">
            <div className="confirm-ico"><Check size={30} /></div>
            <h1>{t('checkout.okTitle')}</h1>
            <p>{t('checkout.okText')}</p>
            <dl className="confirm-meta">
              <div><dt>{t('checkout.orderNo')}</dt><dd dir="ltr">{order.number}</dd></div>
              <div><dt>{t('admin.dateCol')}</dt><dd>{formatDate(order.createdAt)}</dd></div>
              <div><dt>{t('account.view')}</dt><dd>{t(`account.st_${order.status}`)}</dd></div>
              <div><dt>{t('cart.total')}</dt><dd><b>{money(order.total)}</b></dd></div>
            </dl>
            <ul className="sum-list">
              {order.items.map((i) => (
                <li key={i.slug}>
                  <img src={i.image} alt="" loading="lazy" />
                  <div><span>{i.label[l] || i.label.en}</span><small className="muted">× {i.qty}</small></div>
                  <strong>{money(i.price * i.qty)}</strong>
                </li>
              ))}
            </ul>
            <div className="confirm-cta">
              <Link to="/shop" className="btn btn-primary">{t('checkout.continue')}</Link>
              <Link to={`/invoice/${order.number}`} className="btn btn-outline">{t('invoice.print')}</Link>
              <Link to="/account" className="btn btn-ghost">{t('account.orders')}</Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <div className="wrap confirm-wrap">
        <div className="confirm card">
          <div className="confirm-ico">🧾</div>
          <h1>{t('checkout.orderNotFound')}</h1>
          <p className="muted">{t('checkout.orderNotFoundSub')}</p>
          <div className="confirm-cta">
            <Link to="/shop" className="btn btn-primary">{t('checkout.continue')}</Link>
            <Link to="/login" className="btn btn-outline">{t('auth.login')}</Link>
          </div>
        </div>
      </div>
    </main>
  )
}
