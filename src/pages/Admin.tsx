import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { waLink, bankIsPlaceholder, isPlaceholderPhone, isPlaceholderEmail, isPlaceholderAddress } from '../data/util'
import { useI18n } from '../i18n'
import { useApp } from '../state/app'
import { api } from '../data/api'
import { PageHead, productTitle, Modal } from '../components/ui'
import { artFor } from '../data/catalog'
import type { Category, Order, OrderStatus, Product, Promo, Settings, UserProfile } from '../data/types'

type AdminTab = 'overview' | 'products' | 'categories' | 'orders' | 'customers' | 'settings'

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

const slugify = (s: string): string =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'product'

export default function Admin() {
  const { user, settings, notify } = useApp()
  const { t } = useI18n()
  const [tab, setTab] = useState<AdminTab>('overview')
  const [orders, setOrders] = useState<Order[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [promos, setPromos] = useState<Promo[]>([])
  // admin list = ALL products (public + inactive/pending), reloaded after every write
  const [adminProducts, setAdminProducts] = useState<Product[]>([])

  const reloadAdminProducts = async () => {
    const list = await api.listProducts({ publicOnly: false })
    setAdminProducts(list)
  }

  useEffect(() => {
    void api.admin.listOrders().then(setOrders)
    void api.admin.listUsers().then(setUsers)
    void api.admin.listPromos().then(setPromos)
    void reloadAdminProducts()
  }, [])

  if (!user || user.role !== 'admin') {
    return (
      <main className="page">
        <div className="wrap empty-pane">
          <div className="empty-emoji">🔒</div>
          <div className="empty-title">{t('admin.locked')}</div>
          <div className="empty-sub">{t('admin.lockedSub')}</div>
          <Link to="/login?next=admin" className="btn btn-primary">{t('auth.login')}</Link>
        </div>
      </main>
    )
  }

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'overview', label: t('admin.navDash') },
    { id: 'products', label: t('admin.navProducts') },
    { id: 'categories', label: t('admin.navCategories') },
    { id: 'orders', label: t('admin.navOrders') },
    { id: 'customers', label: t('admin.navCustomers') },
    { id: 'settings', label: t('admin.navSettings') },
  ]

  const revenue = orders.reduce((s, o) => (o.status === 'cancelled' ? s : s + o.total), 0)

  return (
    <main className="admin-page">
      <div className="wrap">
        <PageHead title={t('admin.title')} sub={user?.name ? t('admin.welcome').replace('{name}', user.name) : t('admin.subtitle')} />
        <nav className="admin-tabs">
          {tabs.map((x) => (
            <button key={x.id} className={`a-tab${tab === x.id ? ' on' : ''}`} onClick={() => setTab(x.id)}>{x.label}</button>
          ))}
          <Link className="a-tab lnk" to="/">{t('admin.viewStore')}</Link>
        </nav>

        {tab === 'overview' && (
          <OverviewTab products={adminProducts} orders={orders} users={users} revenue={revenue} />
        )}
        {tab === 'products' && (
          <ProductsTab products={adminProducts} notify={notify} onSaved={reloadAdminProducts} />
        )}
        {tab === 'categories' && (
          <CategoriesTab products={adminProducts} notify={notify} onSaved={reloadAdminProducts} />
        )}
        {tab === 'orders' && <OrdersTab orders={orders} setOrders={setOrders} notify={notify} />}
        {tab === 'customers' && <CustomersTab users={users} setUsers={setUsers} me={user.id} notify={notify} />}
        {tab === 'settings' && (
          <SettingsTab
            settings={settings}
            promos={promos}
            products={adminProducts}
            notify={notify}
            onSaved={reloadAdminProducts}
          />
        )}
      </div>
    </main>
  )
}

/* ═══════════════ overview — top-level component ═══════════════ */

function OverviewTab({ products, orders, users, revenue }: { products: Product[]; orders: Order[]; users: UserProfile[]; revenue: number }) {
  const { t, money, locale } = useI18n()
  const l = locale as 'ar' | 'en' | 'tl'
  const low = products.filter((p) => p.stock > 0 && p.stock <= 10)
  const regulated = products.filter((p) => p.regulated)
  const top = [...products].sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0)).slice(0, 5)
  return (
    <div className="admin-body">
      <div className="stat-grid">
        <div className="card stat"><span className="n">{orders.length}</span><span className="lbl">{t('admin.orders')}</span></div>
        <div className="card stat"><span className="n">{money(revenue)}</span><span className="lbl">{t('admin.revenue')}</span></div>
        <div className="card stat"><span className="n">{products.length}</span><span className="lbl">{t('admin.products')}</span></div>
        <div className="card stat"><span className="n">{users.length}</span><span className="lbl">{t('admin.customers')}</span></div>
        <div className="card stat warn"><span className="n">{low.length}</span><span className="lbl">{t('admin.lowStock')}</span></div>
        <div className="card stat"><span className="n">{regulated.length}</span><span className="lbl">{t('admin.regulatedN')}</span></div>
      </div>

      <div className="two-col">
        <div className="card panel">
          <h3>{t('admin.recentOrders')}</h3>
          {orders.length === 0 && <p className="muted">{t('shop.noResults')}</p>}
          {orders.slice(0, 6).map((o) => (
            <div key={o.id} className="row-item">
              <b dir="ltr">{o.number}</b>
              <span>{o.contact.name}</span>
              <em className={`st st-${o.status}`}>{t(`account.st_${o.status}`)}</em>
              <b>{money(o.total)}</b>
            </div>
          ))}
        </div>
        <div className="card panel">
          <h3>{t('admin.topProducts')}</h3>
          {top.map((p) => (
            <div key={p.slug} className="row-item">
              <span>{productTitle(p, l)}</span>
              <b>{p.sold ?? 0}</b>
            </div>
          ))}
          <h3 className="mt">{t('admin.regTitle')}</h3>
          <p className="muted small">{t('admin.regHint')}</p>
          {regulated.map((p) => (
            <div key={p.slug} className="row-item">
              <span>{productTitle(p, l)}</span>
              <em className={`regbadge r-${p.regStatus}`}>{t(`admin.st_${p.regStatus === 'approved' ? 'approved' : p.regStatus}`)}</em>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════ products — top-level component ═══════════════ */

function ProductsTab({ products, notify, onSaved }: { products: Product[]; notify: (s: string) => void; onSaved: () => Promise<void> }) {
  const { t, money, locale } = useI18n()
  const { categories } = useApp()
  const l = locale as 'ar' | 'en' | 'tl'
  const [editing, setEditing] = useState<Product | null>(null)
  const [waiting, setWaiting] = useState(false)

  if (editing) {
    return (
      <AdminProductForm
        product={editing}
        all={products}
        categories={categories}
        notify={notify}
        onCancel={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null)
          setWaiting(true)
          await onSaved()
          setWaiting(false)
          notify(t('admin.save') + ' ✓')
        }}
      />
    )
  }

  return (
    <div className="admin-body">
      <div className="panel-head">
        <h3>{t('admin.navProducts')}</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing(newProductTemplate(categories))}>+ {t('admin.addP')}</button>
      </div>
      <div className="card panel">
        <table className="adm-table">
          <thead>
            <tr><th>{t('admin.name')}</th><th>{t('admin.cat')}</th><th>{t('admin.price')}</th><th>{t('admin.stock')}</th><th>{t('admin.regStatus')}</th><th>{t('admin.actions')}</th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{productTitle(p, l)}</td>
                <td>
                  <span className="muted small" style={{ display: 'block' }}>{p.categorySlug}</span>
                  {p.active === false && <em className="muted small">{t('admin.st_inactive')}</em>}
                </td>
                <td>{money(p.price)}</td>
                <td className={p.stock <= 10 ? 'low' : ''}>{p.stock}</td>
                <td>{p.regulated ? <em className={`regbadge r-${p.regStatus}`}>{t(`admin.st_${p.regStatus === 'approved' ? 'approved' : p.regStatus}`)}</em> : '—'}</td>
                <td className="acts">
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(clone(p))}>{t('account.edit')}</button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={async () => {
                      if (!window.confirm(t('admin.confirmDel'))) return
                      const r = await api.admin.deleteProduct(p.id)
                      if (r.ok) {
                        await onSaved()
                        notify(t('admin.del') + ' ✓')
                      } else notify(t('err.generic'))
                    }}
                  >
                    {t('admin.del')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {waiting && <div className="loading-block"><div className="spinner" /></div>}
    </div>
  )
}

/* ═══════════════ categories — top-level component ═══════════════ */

function CategoriesTab({ products, notify, onSaved }: { products: Product[]; notify: (s: string) => void; onSaved: () => Promise<void> }) {
  const { t } = useI18n()
  const { categories } = useApp()
  const [draft, setDraft] = useState<Category>(() => newCategoryTemplate())
  const [list, setList] = useState<Category[]>(categories)
  const isExisting = list.some((x) => x.id === draft.id)

  useEffect(() => setList(categories), [categories])

  const save = async () => {
    if (!draft.slug.trim()) { notify(t('err.generic')); return }
    const r = await api.admin.saveCategory(draft)
    if (r.ok) {
      const cs = await api.listCategories()
      setList(cs)
      setDraft(newCategoryTemplate())
      await onSaved()
      notify(t('admin.save') + ' ✓')
    } else notify(t('err.generic'))
  }

  return (
    <div className="admin-body">
      <div className="card panel">
        <h3>{t('admin.navCategories')}</h3>
        <table className="adm-table">
          <thead><tr><th>Slug</th><th>{t('admin.nameAr')}</th><th>{t('admin.nameEn')}</th><th>Exp.</th><th>{t('admin.actions')}</th></tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td dir="ltr">{c.slug}</td>
                <td>{c.label.ar}</td>
                <td>{c.label.en}</td>
                <td>{c.experience}</td>
                <td className="acts">
                  <button className="btn btn-ghost btn-sm" onClick={() => setDraft(clone(c))}>{t('account.edit')}</button>
                  <button className="btn btn-danger btn-sm" onClick={async () => {
                    const used = products.filter((p) => p.categorySlug === c.slug).length
                    if (used > 0) {
                      notify(t('admin.catHasProducts').replace('{n}', String(used)))
                      return
                    }
                    if (!window.confirm(t('admin.confirmDel'))) return
                    const r = await api.admin.deleteCategory(c.id)
                    if (r.ok) {
                      await onSaved()
                      setList(await api.listCategories())
                      notify(t('admin.del') + ' ✓')
                    } else notify(t('err.generic'))
                  }}>{t('admin.del')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="cat-form">
          <div className="form-grid">
            <div className="field"><label>Slug</label><input className="input" dir="ltr" disabled={isExisting} value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value.replace(/\s+/g, '-').toLowerCase() })} /></div>
            <div className="field"><label>Experience (beauty|health)</label>
              <select className="input" value={draft.experience} onChange={(e) => setDraft({ ...draft, experience: e.target.value as Category['experience'] })}>
                <option value="beauty">beauty</option>
                <option value="health">health</option>
              </select>
            </div>
            <div className="field"><label>{t('admin.nameAr')}</label><input className="input" value={draft.label.ar} onChange={(e) => setDraft({ ...draft, label: { ...draft.label, ar: e.target.value } })} /></div>
            <div className="field"><label>{t('admin.nameEn')}</label><input className="input" dir="ltr" value={draft.label.en} onChange={(e) => setDraft({ ...draft, label: { ...draft.label, en: e.target.value } })} /></div>
            <div className="field"><label>{t('admin.nameTl')}</label><input className="input" dir="ltr" value={draft.label.tl} onChange={(e) => setDraft({ ...draft, label: { ...draft.label, tl: e.target.value } })} /></div>
            <div className="field"><label>Sort</label><input className="input" type="number" value={draft.sort} onChange={(e) => setDraft({ ...draft, sort: Number(e.target.value) })} /></div>
          </div>
          <button className="btn btn-primary" onClick={save}>{t('admin.add')}</button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════ orders — top-level component ═══════════════ */

function OrdersTab({ orders, setOrders, notify }: { orders: Order[]; setOrders: (o: Order[]) => void; notify: (s: string) => void }) {
  const { t, money, formatDate, locale } = useI18n()
  const l = locale as 'ar' | 'en' | 'tl'
  const [open, setOpen] = useState<Order | null>(null)

  const upd = async (id: string, status: OrderStatus) => {
    const r = await api.admin.updateOrderStatus(id, status)
    if (r.ok) {
      setOrders(orders.map((o) => (o.id === id ? { ...o, status } : o)))
      setOpen((o) => (o && o.id === id ? { ...o, status } : o))
      notify(t('admin.save') + ' ✓')
    } else notify(t('err.generic'))
  }

  const statuses: OrderStatus[] = ['pending', 'shipped', 'delivered', 'cancelled']

  return (
    <div className="admin-body">
      <div className="card panel">
        <h3>{t('admin.navOrders')}</h3>
        {orders.length === 0 && <p className="muted">{t('shop.noResults')}</p>}
        <table className="adm-table">
          <thead><tr><th>№</th><th>{t('admin.customer')}</th><th>{t('admin.dateCol')}</th><th>{t('admin.totalCol')}</th><th>{t('admin.statusCol')}</th><th></th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td dir="ltr">{o.number}</td>
                <td>{o.contact.name}</td>
                <td>{formatDate(o.createdAt)}</td>
                <td>{money(o.total)}</td>
                <td><em className={`st st-${o.status}`}>{t(`account.st_${o.status}`)}</em></td>
                <td><button className="btn btn-ghost btn-sm" onClick={() => setOpen(o)}>{t('account.view')}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={Boolean(open)} onClose={() => setOpen(null)} width={560}>
        {open && (
          <div className="ord-detail">
            <h3 dir="ltr">{open.number}</h3>
            <p className="muted">{open.contact.name} · {open.contact.phone} · {open.contact.email}</p>
            <p className="muted">{open.address.city} — {open.address.district} — {open.address.street} {open.address.building ?? ''}</p>
            <ul className="ord-items">
              {open.items.map((i) => (
                <li key={i.slug}>
                  <img src={i.image} alt="" />
                  <span>{i.label[l] || i.label.en} × {i.qty}</span>
                  <b>{money(i.price * i.qty)}</b>
                </li>
              ))}
            </ul>
            <dl className="sum-dl">
              <div><dt>{t('cart.shipping')}</dt><dd>{open.shipping === 0 ? t('cart.free') : money(open.shipping)}</dd></div>
              <div className="grand"><dt>{t('cart.total')}</dt><dd>{money(open.total)}</dd></div>
            </dl>
            <div className="ord-status">
              <label>{t('admin.statusCol')}</label>
              <select className="input" value={open.status} disabled={open.status === 'cancelled'} onChange={(e) => upd(open.id, e.target.value as OrderStatus)}>
                {statuses.map((s) => <option key={s} value={s}>{t(`account.st_${s}`)}</option>)}
              </select>
              <Link className="btn btn-outline btn-sm" to={`/invoice/${open.number}`} target="_blank">🧾 {t('invoice.print')}</Link>
            </div>
            <div className="ord-status">
              <a className="btn btn-ghost btn-sm" href={waLink(open.contact.phone, t('wa.ready').replace('{number}', open.number))} target="_blank" rel="noreferrer">💬 {t('wa.readyBtn')}</a>
              <a className="btn btn-ghost btn-sm" href={waLink(open.contact.phone, t('wa.shipped').replace('{number}', open.number))} target="_blank" rel="noreferrer">🚚 {t('wa.shippedBtn')}</a>
              <small className="muted" dir="ltr">{open.contact.phone}</small>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ═══════════════ customers — top-level component ═══════════════ */

function CustomersTab({ users, setUsers, me, notify }: { users: UserProfile[]; setUsers: (u: UserProfile[]) => void; me: string; notify: (s: string) => void }) {
  const { t } = useI18n()
  const setRole = async (id: string, role: 'customer' | 'admin') => {
    const r = await api.admin.setRole(id, role)
    if (r.ok) {
      setUsers(users.map((u) => (u.id === id ? { ...u, role } : u)))
      notify(t('admin.save') + ' ✓')
    } else notify(t('err.generic'))
  }
  return (
    <div className="admin-body">
      <div className="card panel">
        <h3>{t('admin.navCustomers')}</h3>
        <table className="adm-table">
          <thead><tr><th>{t('pages.formName')}</th><th>{t('auth.email')}</th><th>{t('account.phone')}</th><th>{t('admin.role')}</th><th>{t('admin.actions')}</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}{u.id === me && <span className="badge badge-rose">{t('admin.you')}</span>}</td>
                <td dir="ltr">{u.email}</td>
                <td dir="ltr">{u.phone ?? '—'}</td>
                <td><em className={`regbadge r-${u.role === 'admin' ? 'approved' : 'pending'}`}>{u.role === 'admin' ? t('admin.roleAdmin') : t('admin.roleCustomer')}</em></td>
                <td className="acts">
                  {u.role === 'customer'
                    ? <button className="btn btn-ghost btn-sm" onClick={() => setRole(u.id, 'admin')}>{t('admin.makeAdmin')}</button>
                    : u.id !== me && <button className="btn btn-danger btn-sm" onClick={() => setRole(u.id, 'customer')}>{t('admin.removeAdmin')}</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ═══════════════ settings — top-level component ═══════════════ */

function SettingsTab({ settings, promos, products, notify, onSaved }: {
  settings: Settings
  promos: Promo[]
  products: Product[]
  notify: (s: string) => void
  onSaved: () => Promise<void>
}) {
  const { t } = useI18n()
  const [s, setS] = useState<Settings>(settings)
  const [promoList, setPromoList] = useState<Promo[]>(promos)
  const [payWarn, setPayWarn] = useState('')

  useEffect(() => setS(settings), [settings])
  useEffect(() => setPromoList(promos), [promos])

  const saveAll = async () => {
    if (!s.payments.cod && !s.payments.bank) {
      setPayWarn(t('admin.payAtLeastOne'))
      notify(t('admin.payAtLeastOne'))
      return
    }
    setPayWarn('')
    const r1 = await api.admin.saveSettings(s)
    const r2 = await api.admin.savePromos(promoList)
    if (r1.ok && r2.ok) {
      await onSaved()
      notify(t('admin.save') + ' ✓')
    } else notify(t('err.generic'))
  }

  // warn when bank details are still the seeded placeholders
  const bankIsExample = bankIsPlaceholder(s.payments)

  return (
    <div className="admin-body">
      <div className="card panel">
        <h3>{t('admin.navSettings')}</h3>
        <div className="form-grid">
          <div className="field"><label>{t('admin.shipFlat')}</label><input className="input" type="number" value={s.shipStandard} onChange={(e) => setS({ ...s, shipStandard: Number(e.target.value) })} /></div>
          <div className="field"><label>{t('admin.shipExpress')}</label><input className="input" type="number" value={s.shipExpress} onChange={(e) => setS({ ...s, shipExpress: Number(e.target.value) })} /></div>
          <div className="field"><label>{t('admin.freeOver')}</label><input className="input" type="number" value={s.freeOver} onChange={(e) => setS({ ...s, freeOver: Number(e.target.value) })} /></div>
          <div className="field"><label>{t('admin.vat')}</label><input className="input" type="number" value={s.vat} onChange={(e) => setS({ ...s, vat: Number(e.target.value) })} /></div>
          <div className="field form-check">
            <label><input type="checkbox" checked={s.vatInclusive !== false} onChange={(e) => setS({ ...s, vatInclusive: e.target.checked })} /> {t('admin.vatIncl')}</label>
          </div>
        </div>

        <h3 className="mt">📞 {t('admin.contactsTitle')}</h3>
        <div className="form-grid">
          <div className="field"><label>{t('admin.cPhone')}</label><input className="input" dir="ltr" value={s.contacts.phone} onChange={(e) => setS({ ...s, contacts: { ...s.contacts, phone: e.target.value } })} /></div>
          <div className="field"><label>{t('admin.cEmail')}</label><input className="input" dir="ltr" value={s.contacts.email} onChange={(e) => setS({ ...s, contacts: { ...s.contacts, email: e.target.value } })} /></div>
          <div className="field"><label>{t('admin.cAddress')}</label><input className="input" value={s.contacts.address} onChange={(e) => setS({ ...s, contacts: { ...s.contacts, address: e.target.value } })} /></div>
          <div className="field"><label>{t('admin.cHours')}</label><input className="input" value={s.contacts.hours} onChange={(e) => setS({ ...s, contacts: { ...s.contacts, hours: e.target.value } })} /></div>
        </div>
        {(!isPlaceholderPhone(s.contacts.phone) && !isPlaceholderEmail(s.contacts.email) && !isPlaceholderAddress(s.contacts.address))
          ? null
          : <p className="alert alert-error">{t('admin.contactsUnset')}</p>}

        <h3 className="mt">💵 {t('admin.payTitle')}</h3>
        <div className="form-grid">
          <div className="field"><label>{t('checkout.cod')}</label><input type="checkbox" checked={s.payments.cod} onChange={(e) => setS({ ...s, payments: { ...s.payments, cod: e.target.checked } })} /></div>
          <div className="field"><label>{t('checkout.pay_bank')}</label><input type="checkbox" checked={s.payments.bank} onChange={(e) => setS({ ...s, payments: { ...s.payments, bank: e.target.checked } })} /></div>
          <div className="field"><label>{t('admin.payBankName')}</label><input className="input" value={s.payments.bankName} onChange={(e) => setS({ ...s, payments: { ...s.payments, bankName: e.target.value } })} /></div>
          <div className="field"><label>IBAN</label><input className="input" dir="ltr" value={s.payments.bankIban} onChange={(e) => setS({ ...s, payments: { ...s.payments, bankIban: e.target.value } })} /></div>
        </div>
        <div className="field"><label>{t('admin.payBankNote')}</label><input className="input" value={s.payments.bankNote} onChange={(e) => setS({ ...s, payments: { ...s.payments, bankNote: e.target.value } })} /></div>
        {(bankIsExample || (!s.payments.cod && !s.payments.bank)) && (
          <p className="alert alert-error">
            {(!s.payments.cod && !s.payments.bank) ? t('admin.payAtLeastOne') : ''}
            {bankIsExample ? ` ${t('admin.payPlaceholder')}` : ''}
          </p>
        )}
        {payWarn && <p className="form-error">{payWarn}</p>}

        <h3 className="mt">{t('cart.code')}</h3>
        {promoList.map((pr, i) => (
          <div key={i} className="promo-row-edit">
            <input className="input" dir="ltr" value={pr.code} onChange={(e) => setPromoList(promoList.map((x, xi) => (xi === i ? { ...x, code: e.target.value.toUpperCase() } : x)))} />
            <select className="input" value={pr.kind} onChange={(e) => setPromoList(promoList.map((x, xi) => (xi === i ? { ...x, kind: e.target.value as Promo['kind'] } : x)))}>
              <option value="percent">%</option>
              <option value="fixed">SAR</option>
            </select>
            <input className="input" type="number" value={pr.value} onChange={(e) => setPromoList(promoList.map((x, xi) => (xi === i ? { ...x, value: Number(e.target.value) } : x)))} />
            <button className="btn btn-danger btn-sm" onClick={() => setPromoList(promoList.filter((_, xi) => xi !== i))}>✕</button>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={() => setPromoList([...promoList, { code: 'NEW', kind: 'percent', value: 5, active: true }])}>+ {t('cart.code')}</button>

        <div className="mt"><button className="btn btn-primary" onClick={saveAll}>{t('admin.save')}</button></div>
      </div>

      <RegulatedPanel products={products} notify={notify} onSaved={onSaved} />

      <BannersEditor settings={s} onChange={setS} />
    </div>
  )
}

/* ═══════════════ regulated approvals — full list ═══════════════ */

function RegulatedPanel({ products, notify, onSaved }: { products: Product[]; notify: (s: string) => void; onSaved: () => Promise<void> }) {
  const { t, locale } = useI18n()
  const l = locale as 'ar' | 'en' | 'tl'
  const [note, setNote] = useState('')

  const decide = async (p: Product, status: 'approved' | 'pending' | 'off') => {
    const r = await api.admin.setRegStatus(p.id, status, note || undefined)
    if (r.ok) {
      await onSaved()
      notify(t('admin.save') + ' ✓')
    } else notify(t('err.generic'))
  }

  return (
    <div className="card panel">
      <h3>{t('admin.regTitle')}</h3>
      <p className="muted small">{t('admin.regHint')}</p>
      <div className="field"><label>{t('admin.note')}</label><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('admin.noteHint')} /></div>
      <table className="adm-table">
        <thead><tr><th>{t('admin.name')}</th><th>{t('admin.regStatus')}</th><th>{t('admin.actions')}</th></tr></thead>
        <tbody>
          {products.filter((p) => p.regulated).map((p) => (
            <tr key={p.id}>
              <td>{productTitle(p, l)}</td>
              <td><em className={`regbadge r-${p.regStatus}`}>{t(`admin.st_${p.regStatus === 'approved' ? 'approved' : p.regStatus}`)}</em></td>
              <td className="acts">
                {p.regStatus !== 'approved'
                  ? <button className="btn btn-ghost btn-sm" onClick={() => decide(p, 'approved')}>{t('admin.approve')}</button>
                  : <button className="btn btn-ghost btn-sm" onClick={() => decide(p, 'pending')}>{t('admin.underReview')}</button>}
                <button className="btn btn-danger btn-sm" onClick={() => decide(p, 'off')}>{t('admin.st_off')}</button>
              </td>
            </tr>
          ))}
          {products.filter((p) => p.regulated).length === 0 && <tr><td colSpan={3}><p className="muted">{t('shop.noResults')}</p></td></tr>}
        </tbody>
      </table>
    </div>
  )
}

/* ═══════════════ banners editor ═══════════════ */

function BannersEditor({ settings: s, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const { t } = useI18n()
  const { notify } = useApp()
  const save = async () => {
    const r = await api.admin.saveSettings(s)
    if (r.ok) notify(t('admin.save') + ' ✓')
    else notify(t('err.generic'))
  }
  return (
    <div className="card panel">
      <h3>Banners</h3>
      {s.banners.map((b, i) => (
        <div key={b.id} className="banner-row card">
          <div className="form-grid">
            <div className="field"><label>{t('admin.nameAr')}</label><input className="input" value={b.title.ar} onChange={(e) => onChange({ ...s, banners: s.banners.map((x, xi) => (xi === i ? { ...x, title: { ...x.title, ar: e.target.value } } : x)) })} /></div>
            <div className="field"><label>{t('admin.nameEn')}</label><input className="input" dir="ltr" value={b.title.en} onChange={(e) => onChange({ ...s, banners: s.banners.map((x, xi) => (xi === i ? { ...x, title: { ...x.title, en: e.target.value } } : x)) })} /></div>
            <div className="field"><label>{t('admin.nameTl')}</label><input className="input" dir="ltr" value={b.title.tl} onChange={(e) => onChange({ ...s, banners: s.banners.map((x, xi) => (xi === i ? { ...x, title: { ...x.title, tl: e.target.value } } : x)) })} /></div>
          </div>
          <div className="form-grid">
            <div className="field"><label>{t('admin.nameAr')}</label><input className="input" value={b.sub.ar} onChange={(e) => onChange({ ...s, banners: s.banners.map((x, xi) => (xi === i ? { ...x, sub: { ...x.sub, ar: e.target.value } } : x)) })} /></div>
            <div className="field"><label>{t('admin.nameEn')}</label><input className="input" dir="ltr" value={b.sub.en} onChange={(e) => onChange({ ...s, banners: s.banners.map((x, xi) => (xi === i ? { ...x, sub: { ...x.sub, en: e.target.value } } : x)) })} /></div>
            <div className="field"><label>{t('admin.nameTl')}</label><input className="input" dir="ltr" value={b.sub.tl} onChange={(e) => onChange({ ...s, banners: s.banners.map((x, xi) => (xi === i ? { ...x, sub: { ...x.sub, tl: e.target.value } } : x)) })} /></div>
          </div>
          <div className="form-grid">
            <div className="field"><label>CTA link</label><input className="input" dir="ltr" value={b.ctaLink ?? ''} onChange={(e) => onChange({ ...s, banners: s.banners.map((x, xi) => (xi === i ? { ...x, ctaLink: e.target.value } : x)) })} /></div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={() => onChange({ ...s, banners: s.banners.filter((_, xi) => xi !== i) })}>{t('admin.del')}</button>
        </div>
      ))}
      <button
        className="btn btn-ghost btn-sm"
        onClick={() =>
          onChange({ ...s, banners: [...s.banners, { id: 'b' + Date.now(), sort: s.banners.length + 1, active: true, title: { ar: '', en: '', tl: '' }, sub: { ar: '', en: '', tl: '' } }] })
        }
      >
        + {t('admin.add')}
      </button>
      <div className="mt"><button className="btn btn-primary" onClick={save}>{t('admin.save')}</button></div>
    </div>
  )
}

/* ---------- templates & product form ---------- */

function newProductTemplate(categories: Category[]): Product {
  const slug = 'new-product-' + Math.random().toString(36).slice(2, 6)
  const cat = categories[0]?.slug ?? 'care-health'
  return {
    id: uid(),
    slug,
    categorySlug: cat,
    sku: 'HH-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    label: { ar: 'منتج جديد', en: 'New Product', tl: 'Bagong Produkto' },
    description: { ar: '', en: '', tl: '' },
    brand: 'Harmony Basics',
    price: 0,
    stock: 0,
    images: [artFor(cat, slug)],
    badges: [],
    regStatus: 'off',
    active: true,
    createdAt: new Date().toISOString(),
  }
}

function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'p_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function newCategoryTemplate(): Category {
  return {
    id: 'c_' + Math.random().toString(36).slice(2, 8),
    slug: 'new-category',
    experience: 'beauty',
    label: { ar: 'فئة جديدة', en: 'New Category', tl: 'Bagong Kategorya' },
    desc: { ar: '', en: '', tl: '' },
    sort: 99,
    active: true,
  }
}

function AdminProductForm({ product, all, categories, notify, onCancel, onSaved }: {
  product: Product
  all: Product[]
  categories: Category[]
  notify: (s: string) => void
  onCancel: () => void
  onSaved: () => Promise<void> | void
}) {
  const { t } = useI18n()
  const [p, setP] = useState<Product>(product)
  const [busy, setBusy] = useState(false)
  const [slugTaken, setSlugTaken] = useState(false)
  const isNew = !all.some((x) => x.id === product.id)
  const [slugTouched, setSlugTouched] = useState(false)

  const set = (k: keyof Product, v: unknown) => setP((prev) => ({ ...prev, [k]: v }) as Product)

  const setL10n = (field: 'label' | 'description' | 'overview' | 'ingredients' | 'usage', lang: 'ar' | 'en' | 'tl', value: string) => {
    setP((prev) => ({ ...prev, [field]: { ...(prev[field] as Record<string, string> | undefined ?? {}), [lang]: value } }) as Product)
  }

  const onEnName = (value: string) => {
    setL10n('label', 'en', value)
    if (isNew && !slugTouched) set('slug', slugify(value))
  }

  const upload = async (file: File) => {
    try {
      const url = await api.admin.uploadImage(file)
      set('images', [...p.images, url])
    } catch {
      notify(t('err.generic'))
    }
  }

  const save = async () => {
    if (all.some((x) => x.slug === p.slug.trim() && x.id !== p.id)) {
      setSlugTaken(true)
      notify(t('err.generic'))
      return
    }
    setSlugTaken(false)
    setBusy(true)
    const r = await api.admin.saveProduct(p)
    setBusy(false)
    if (r.ok) await onSaved()
    else notify(t('err.generic'))
  }

  const l10nField = (field: 'overview' | 'ingredients' | 'usage', label: string) => (
    <>
      <h3 className="mt">{label}</h3>
      <div className="form-grid">
        <div className="field"><label>{t('admin.nameAr')}</label><textarea className="input" rows={2} value={p[field]?.ar ?? ''} onChange={(e) => setL10n(field, 'ar', e.target.value)} /></div>
        <div className="field"><label>{t('admin.nameEn')}</label><textarea className="input" rows={2} dir="ltr" value={p[field]?.en ?? ''} onChange={(e) => setL10n(field, 'en', e.target.value)} /></div>
        <div className="field"><label>{t('admin.nameTl')}</label><textarea className="input" rows={2} dir="ltr" value={p[field]?.tl ?? ''} onChange={(e) => setL10n(field, 'tl', e.target.value)} /></div>
      </div>
    </>
  )

  return (
    <div className="admin-body">
      <div className="card panel">
        <div className="panel-head">
          <h3>{t('admin.editP')}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>←</button>
        </div>

        <div className="form-grid">
          <div className="field"><label>{t('admin.nameAr')}</label><input className="input" value={p.label.ar} onChange={(e) => setL10n('label', 'ar', e.target.value)} /></div>
          <div className="field"><label>{t('admin.nameEn')}</label><input className="input" dir="ltr" value={p.label.en} onChange={(e) => onEnName(e.target.value)} /></div>
          <div className="field"><label>{t('admin.nameTl')}</label><input className="input" dir="ltr" value={p.label.tl} onChange={(e) => setL10n('label', 'tl', e.target.value)} /></div>
        </div>
        <div className="form-grid">
          <div className="field">
            <label>{t('admin.slug')}</label>
            <input
              className={`input${slugTaken ? ' invalid' : ''}`}
              dir="ltr"
              disabled={!isNew}
              value={p.slug}
              onChange={(e) => {
                setSlugTouched(true)
                set('slug', e.target.value.replace(/\s+/g, '-').toLowerCase())
              }}
            />
            {slugTaken && <span className="form-error">{t('admin.slugTaken')}</span>}
          </div>
          <div className="field"><label>SKU</label><input className="input" dir="ltr" value={p.sku} onChange={(e) => set('sku', e.target.value)} /></div>
        </div>
        <div className="form-grid">
          <div className="field"><label>{t('admin.descAr')}</label><textarea className="input" rows={3} value={p.description.ar} onChange={(e) => setL10n('description', 'ar', e.target.value)} /></div>
          <div className="field"><label>{t('admin.descEn')}</label><textarea className="input" rows={3} dir="ltr" value={p.description.en} onChange={(e) => setL10n('description', 'en', e.target.value)} /></div>
          <div className="field"><label>{t('admin.descTl')}</label><textarea className="input" rows={3} dir="ltr" value={p.description.tl} onChange={(e) => setL10n('description', 'tl', e.target.value)} /></div>
        </div>

        {l10nField('overview', t('product.overview'))}
        {l10nField('ingredients', t('product.ingredients'))}
        {l10nField('usage', t('product.usage'))}

        <div className="form-grid">
          <div className="field"><label>{t('admin.price')}</label><input className="input" type="number" value={p.price} onChange={(e) => set('price', Number(e.target.value))} /></div>
          <div className="field"><label>{t('admin.compare')}</label><input className="input" type="number" value={p.comparePrice ?? ''} onChange={(e) => set('comparePrice', e.target.value === '' ? undefined : Number(e.target.value))} /></div>
          <div className="field"><label>{t('admin.stock')}</label><input className="input" type="number" value={p.stock} onChange={(e) => set('stock', Number(e.target.value))} /></div>
          <div className="field"><label>{t('admin.brand')}</label><input className="input" value={p.brand} onChange={(e) => set('brand', e.target.value)} /></div>
          <div className="field"><label>{t('product.manufacturer')}</label><input className="input" value={p.manufacturer ?? ''} onChange={(e) => set('manufacturer', e.target.value)} /></div>
          <div className="field"><label>{t('product.madeIn')}</label><input className="input" value={p.origin ?? ''} onChange={(e) => set('origin', e.target.value)} /></div>
          <div className="field"><label>{t('admin.cat')}</label>
            <select className="input" value={p.categorySlug} onChange={(e) => set('categorySlug', e.target.value)}>
              {categories.map((c) => <option key={c.id} value={c.slug}>{c.label.ar} / {c.label.en}</option>)}
            </select>
          </div>
        </div>

        <div className="form-grid">
          <div className="field form-check"><label><input type="checkbox" checked={p.active !== false} onChange={(e) => set('active', e.target.checked)} /> {t('admin.active')}</label></div>
          <div className="field form-check"><label><input type="checkbox" checked={p.regulated ?? false} onChange={(e) => set('regulated', e.target.checked)} /> {t('admin.regTitle')}</label></div>
          <div className="field">
            <label>{t('admin.regStatus')}</label>
            <select className="input" value={p.regStatus} disabled={!p.regulated} onChange={(e) => set('regStatus', e.target.value as Product['regStatus'])}>
              <option value="off">{t('admin.st_off')}</option>
              <option value="pending">{t('admin.st_pending')}</option>
              <option value="approved">{t('admin.st_approved')}</option>
            </select>
          </div>
          <div className="field form-check"><label><input type="checkbox" checked={p.age18 ?? false} onChange={(e) => set('age18', e.target.checked)} /> {t('product.ageTitle')}</label></div>
        </div>

        <div className="flag-row">
          {(['featured', 'bestseller', 'new', 'sale'] as const).map((b) => (
            <label key={b} className="form-check-inline">
              <input type="checkbox" checked={p.badges.includes(b)} onChange={(e) => set('badges', e.target.checked ? [...p.badges, b] : p.badges.filter((x) => x !== b))} />
              <span>{b}</span>
            </label>
          ))}
        </div>

        <h3 className="mt">{t('admin.image')}</h3>
        <div className="gall-row">
          {p.images.map((src, i) => (
            <div key={i} className="thumb-wrap">
              <img src={src} alt="" />
              <div className="thumb-ops">
                <button type="button" disabled={i === 0} onClick={() => { const a = [...p.images]; const tmp = a[i - 1]; a[i - 1] = a[i]; a[i] = tmp; set('images', a) }}>←</button>
                <button type="button" disabled={i === p.images.length - 1} onClick={() => { const a = [...p.images]; const tmp = a[i + 1]; a[i + 1] = a[i]; a[i] = tmp; set('images', a) }}>→</button>
                <button type="button" onClick={() => set('images', p.images.filter((_, xi) => xi !== i))}>✕</button>
              </div>
            </div>
          ))}
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
        </div>
        <p className="form-hint">{t('admin.imgOr')}</p>

        <button className="btn btn-primary" onClick={save} disabled={busy}>{t('admin.save')}</button>
      </div>
    </div>
  )
}