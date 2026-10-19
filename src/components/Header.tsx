import Logo from './Logo'
import { Menu, User, X, Bag, Search } from './Icons'
import { productTitle } from '../data/util'
import LanguageSelect, { LangButton } from './LanguageSelect'
import { useI18n } from '../i18n'
import { useApp } from '../state/app'
import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'

export default function Header() {
  const { t, locale, dir, money } = useI18n()
  const { user, cart, categories, products } = useApp()
  const l = locale as 'ar' | 'en' | 'tl'
  const [openMenu, setOpenMenu] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [q, setQ] = useState('')
  const nav = useNavigate()
  const count = cart.reduce((s, c) => s + c.qty, 0)

  const go = (path: string) => {
    setOpenMenu(false)
    nav(path)
  }

  const links = [
    { to: '/', label: t('nav.home') },
    { to: '/shop', label: t('nav.shop') },
    ...categories.map((c) => ({ to: `/shop/category/${c.slug}`, label: c.label[l] })),
    { to: '/shop?sale=1', label: t('nav.offers') },
    { to: '/contact', label: t('nav.contact') },
  ]

  return (
    <header className="site">
      <div className="main" dir={dir}>
        <div className="wrap main-row">
          <Link to="/" className="brand" aria-label="Health Harmony">
            <Logo height={44} />
          </Link>

          <form
            className="search"
            onSubmit={(e) => {
              e.preventDefault()
              nav(`/shop?q=${encodeURIComponent(q)}`)
            }}
          >
            <Search />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('header.search')}
              aria-label={t('header.search')}
            />
            <button type="submit" className="search-btn">{t('header.search') ? '→' : ''}</button>
          </form>

          <nav className="actions">
            <div className="lang-wrap">
              <LangButton onToggle={() => setLangOpen((v) => !v)} />
              {langOpen && (
                <>
                  <div className="lang-backdrop" onClick={() => setLangOpen(false)} />
                  <LanguageSelect onPick={() => setLangOpen(false)} current={locale} />
                </>
              )}
            </div>

            <Link className="icon-btn" to="/account" title={t('header.account')} aria-label={t('header.account')}>
              <User />
            </Link>

            <div className="bag-wrap">
              <Link className="icon-btn bag" to="/cart" aria-label={t('header.cart')} title={t('header.cart')}>
                <Bag />
                {count > 0 && <span className="bag-n">{count}</span>}
              </Link>
              {/* Shopify-style mini cart: lines + subtotal + go to cart */}
              <div className="bag-panel card" aria-hidden={count === 0}>
                {count === 0 ? (
                  <p className="bag-empty muted">{t('cart.empty')}</p>
                ) : (
                  <>
                    <ul className="bag-lines">
                      {(cart as { slug: string; qty: number }[]).slice(0, 3).map((c) => {
                        const p = products.find((x) => x.slug === c.slug)
                        if (!p) return null
                        return (
                          <li key={c.slug}>
                            <img src={p.images[0]} alt="" />
                            <div>
                              <Link to={`/product/${p.slug}`}>{productTitle(p, locale)}</Link>
                              <small className="muted">× {c.qty}</small>
                            </div>
                            <b>{money(p.price * c.qty)}</b>
                          </li>
                        )
                      })}
                    </ul>
                    <div className="bag-sub">
                      <span>{t('cart.subtotal')}</span>
                      <b>{money(cart.reduce((s, c) => s + (products.find((x) => x.slug === c.slug)?.price ?? 0) * c.qty, 0))}</b>
                    </div>
                    <Link to="/cart" className="btn btn-primary btn-block btn-sm">{t('checkout.continue')}</Link>
                  </>
                )}
              </div>
            </div>

            <button className="icon-btn burger" onClick={() => setOpenMenu(true)} aria-label={t('header.menu')}>
              <Menu />
            </button>
          </nav>
        </div>

        <nav className="cat-row">
          <div className="wrap cat-list">
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'on' : '')}>{t('nav.home')}</NavLink>
            <NavLink to="/shop" className={({ isActive }) => (isActive ? 'on' : '')}>{t('nav.shop')}</NavLink>
            {categories.map((c) => (
              <NavLink key={c.slug} to={`/shop/category/${c.slug}`} className={({ isActive }) => (isActive ? 'on' : '')}>{c.label[l]}</NavLink>
            ))}
            <NavLink to="/shop?sale=1">{t('nav.offers')}</NavLink>
            <NavLink to="/contact">{t('nav.contact')}</NavLink>
            {user?.role === 'admin' && <NavLink to="/admin" className="admin-link">{t('nav.admin')}</NavLink>}
          </div>
        </nav>
      </div>

      {openMenu && (
        <div className="drawer-backdrop" onClick={() => setOpenMenu(false)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()} dir={dir}>
            <div className="drawer-head">
              <Logo height={36} />
              <button className="icon-btn" onClick={() => setOpenMenu(false)} aria-label="close"><X /></button>
            </div>
            {links.map((l) => (
              <button key={l.to} className="drawer-link" onClick={() => go(l.to)}>{l.label}</button>
            ))}
            <button className="drawer-link" onClick={() => go(user ? '/account' : '/login')}>{user ? t('header.account') : t('auth.login')}</button>
            <button className="drawer-link" onClick={() => go('/cart')}>{t('header.cart')}{count ? ` (${count})` : ''}</button>
          </aside>
        </div>
      )}
    </header>
  )
}
