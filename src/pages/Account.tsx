import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useApp } from '../state/app'
import { api } from '../data/api'
import { PageHead, ProductCard } from '../components/ui'

type Tab = 'profile' | 'orders' | 'wishlist' | 'addresses'

export default function Account() {
  const { t, money, formatDate } = useI18n()
  const { user, setUser, wishlist, products, myOrders, notify } = useApp()
  const nav = useNavigate()
  const [tab, setTab] = useState<Tab>('profile')

  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [addresses, setAddresses] = useState<Awaited<ReturnType<typeof api.listAddresses>>>([])
  const [editing, setEditing] = useState<null | { id?: string }>(null)
  const [draft, setDraft] = useState({ label: '', fullName: '', phone: '', city: '', district: '', street: '', building: '', isDefault: false })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) void api.listAddresses().then(setAddresses)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) {
    nav('/login', { replace: true })
    return null
  }

  const wishItems = products.filter((p) => wishlist.includes(p.slug))
  const logout = async () => {
    await api.signOut()
    setUser(null)
    notify(t('auth.logout') + ' ✓')
    nav('/')
  }

  const saveProfile = async () => {
    const r = await api.updateProfile({ name, phone })
    if (r.ok) {
      setUser({ ...user, name, phone })
      notify(t('auth.saved'))
    } else notify(t('err.generic'))
  }

  const openNew = () => {
    setEditing({})
    setDraft({ label: '', fullName: user.name, phone: user.phone ?? '', city: '', district: '', street: '', building: '', isDefault: addresses.length === 0 })
  }

  const saveAddr = async () => {
    setSaving(true)
    const payload = { ...draft, id: editing?.id }
    const r = await api.saveAddress(payload as never)
    setSaving(false)
    if (r.ok) {
      notify(t('auth.saved'))
      setEditing(null)
      setAddresses(await api.listAddresses())
    } else notify(t('err.generic'))
  }

  return (
    <main className="page">
      <div className="wrap">
        <PageHead title={t('account.title')} sub={`${t('account.since')} ${formatDate(user.createdAt)}`} />

        <div className="acct-layout">
          <aside className="acct-side card">
            <button className={`acct-tab${tab === 'profile' ? ' on' : ''}`} onClick={() => setTab('profile')}>{t('account.profile')}</button>
            <button className={`acct-tab${tab === 'orders' ? ' on' : ''}`} onClick={() => setTab('orders')}>{t('account.orders')} ({myOrders.length})</button>
            <button className={`acct-tab${tab === 'wishlist' ? ' on' : ''}`} onClick={() => setTab('wishlist')}>{t('account.wishlist')} ({wishItems.length})</button>
            <button className={`acct-tab${tab === 'addresses' ? ' on' : ''}`} onClick={() => setTab('addresses')}>{t('account.addresses')}</button>
            <button className="acct-tab out" onClick={logout}>{t('auth.logout')}</button>
          </aside>

          <section>
            {tab === 'profile' && (
              <div className="card acct-card">
                <h3>{t('account.profile')}</h3>
                <p className="muted" dir="ltr">{user.email}</p>
                <div className="form-grid">
                  <div className="field"><label>{t('account.fullName')}</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
                  <div className="field"><label>{t('account.phone')}</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" /></div>
                </div>
                <button className="btn btn-primary" onClick={saveProfile}>{t('account.saveProfile')}</button>
              </div>
            )}

            {tab === 'orders' && (
              <div className="card acct-card">
                <h3>{t('account.orders')}</h3>
                {myOrders.length === 0 && <p className="muted">{t('account.ordersEmpty')}</p>}
                <ul className="order-list">
                  {myOrders.map((o) => (
                    <li key={o.id} className="order-row">
                      <Link to={`/order/${o.number}`} className="order-id" dir="ltr">{o.number}</Link>
                      <span className="muted">{formatDate(o.createdAt)}</span>
                      <span className="muted">{o.items.length} {t('account.items')}</span>
                      <em className={`st st-${o.status}`}>{t(`account.st_${o.status}`)}</em>
                      <b>{money(o.total)}</b>
                      <Link to={`/invoice/${o.number}`} className="order-inv no-print" title={t('invoice.print')}>🧾 {t('invoice.title')}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tab === 'wishlist' && (
              <div className="card acct-card">
                <h3>{t('account.wishlist')}</h3>
                {wishItems.length === 0 && <p className="muted">{t('account.wishlistEmpty')}</p>}
                <div className="grid">
                  {wishItems.map((p) => <ProductCard key={p.slug} p={p} />)}
                </div>
              </div>
            )}

            {tab === 'addresses' && (
              <div className="card acct-card">
                <div className="acct-head-row">
                  <h3>{t('account.addresses')}</h3>
                  <button className="btn btn-outline btn-sm" onClick={openNew}>+ {t('account.addAddr')}</button>
                </div>

                {editing && (
                  <div className="addr-form">
                    <div className="form-grid">
                      <div className="field"><label>{t('account.label')}</label><input className="input" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} /></div>
                      <div className="field"><label>{t('account.fullName')}</label><input className="input" value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} /></div>
                      <div className="field"><label>{t('account.phone')}</label><input className="input" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} dir="ltr" /></div>
                      <div className="field"><label>{t('checkout.city')} *</label><input className="input" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} /></div>
                      <div className="field"><label>{t('checkout.district')}</label><input className="input" value={draft.district} onChange={(e) => setDraft({ ...draft, district: e.target.value })} /></div>
                      <div className="field"><label>{t('checkout.street')} *</label><input className="input" value={draft.street} onChange={(e) => setDraft({ ...draft, street: e.target.value })} /></div>
                      <div className="field"><label>{t('checkout.building')}</label><input className="input" value={draft.building} onChange={(e) => setDraft({ ...draft, building: e.target.value })} /></div>
                    </div>
                    <label className="agree-row">
                      <input type="checkbox" checked={draft.isDefault} onChange={(e) => setDraft({ ...draft, isDefault: e.target.checked })} />
                      <span>{t('account.isDefault')}</span>
                    </label>
                    <div className="addr-actions">
                      <button className="btn btn-primary" disabled={saving || !draft.city || !draft.street || !draft.fullName} onClick={saveAddr}>{t('admin.save')}</button>
                      <button className="btn btn-ghost" onClick={() => setEditing(null)}>{t('admin.cancel')}</button>
                    </div>
                  </div>
                )}

                {addresses.length === 0 && !editing && <p className="muted">{t('account.addrEmpty')}</p>}
                <ul className="addr-list">
                  {addresses.map((a) => (
                    <li key={a.id}>
                      <div>
                        <strong>{a.label || a.city} {a.isDefault && <span className="badge badge-rose">{t('account.isDefault')}</span>}</strong>
                        <span className="muted small" dir="ltr">{a.fullName} · {a.phone}</span>
                        <span className="muted small">{a.city} — {a.district} — {a.street} {a.building}</span>
                      </div>
                      <div className="addr-ops">
                        {!a.isDefault && <button className="btn btn-ghost btn-sm" onClick={async () => { await api.setDefaultAddress(a.id); setAddresses(await api.listAddresses()) }}>{t('account.makeDefault')}</button>}
                        <button className="btn btn-danger btn-sm" onClick={async () => { await api.deleteAddress(a.id); setAddresses(await api.listAddresses()) }}>{t('account.delete')}</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
