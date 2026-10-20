import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useApp } from '../state/app'
import { api } from '../data/api'
import { ProductCard, SectionHead, Stars } from '../components/ui'
import { Arrow, Check, Globe, Shield, Sparkle, Truck } from '../components/Icons'

import { productTitle } from '../data/util'
import type { Review } from '../data/types'

/** Photos matched to the settings-defined promo banners, in sort order. */
const PROMO_PHOTOS = ['/photos/banner-care.jpg', '/photos/banner-offers.jpg']


export default function Home() {
  const { t, locale } = useI18n()
  const { products, categories, settings, notify } = useApp()
  const banners = useMemo(
    () => (settings.banners ?? []).filter((b) => b.active).sort((a, b) => a.sort - b.sort),
    [settings.banners],
  )
  const [reviews, setReviews] = useState<Review[]>([])
  const [newsEmail, setNewsEmail] = useState('')
  const [newsNote, setNewsNote] = useState<string | null>(null)
  const [ri, setRi] = useState(0)

  useEffect(() => {
    void api.listAllReviews().then(setReviews).catch(() => setReviews([]))
  }, [])

  const featured = useMemo(() => products.filter((p) => p.badges.includes('featured')).slice(0, 4), [products])
  const best = useMemo(() => products.filter((p) => p.badges.includes('bestseller')).slice(0, 4), [products])
  const fresh = useMemo(() => products.filter((p) => p.badges.includes('new')).slice(0, 4), [products])
  const offers = useMemo(() => products.filter((p) => p.comparePrice && p.comparePrice > p.price).slice(0, 4), [products])

  const topOffer = useMemo(() => {    let bestP = null as null | typeof products[number]
    let bestPct = 0
    for (const p of offers) {
      const pct = Math.round(((p.comparePrice! - p.price) / p.comparePrice!) * 100)
      if (pct > bestPct) {
        bestPct = pct
        bestP = p
      }
    }
    return bestP ? { pct: bestPct, name: productTitle(bestP, locale) } : null
  }, [offers, locale])

  const shown = useMemo(() => reviews.slice(0, 5), [reviews])
  useEffect(() => {
    if (shown.length < 2) return
    const id = setInterval(() => setRi((i) => (i + 1) % shown.length), 6000)
    return () => clearInterval(id)
  }, [shown.length])

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newsEmail)) {
      setNewsNote(t('home.newsInvalid'))
      return
    }
    const r = await api.subscribeNewsletter(newsEmail)
    if (r.ok) {
      setNewsNote(t('home.newsOk'))
      setNewsEmail('')
      notify(t('home.newsOk'))
    } else {
      setNewsNote(t('home.newsErr'))
    }
  }

  const l = locale as 'ar' | 'en' | 'tl'

  return (
    <main>
      {/* ───────── hero ───────── */}
      <section className="hero has-photo">
        <img className="hero-photo" src="/photos/hero-girl.jpg" alt="" aria-hidden="true" />
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <span className="hero-badge">
              <Sparkle size={15} /> {t('hero.badge')}
            </span>
            <h1>{t('hero.title')}</h1>
            <p className="hero-sub">{t('hero.sub')}</p>
            <div className="hero-cta">
              <Link to="/shop" className="btn btn-primary btn-lg">{t('hero.cta')} <Arrow /></Link>
              <a href="#categories" className="btn btn-outline btn-lg">{t('hero.cta2')}</a>
            </div>
            <ul className="hero-chips">
              <li><Check size={14} /> {t('hero.chip1')}</li>
              <li><Truck size={14} /> {t('hero.chip2')}</li>
            </ul>
          </div>
          <div className="hero-art" aria-hidden="true">
            {topOffer && (
              <div className="hero-card hc-1">
                <strong>−{topOffer.pct}%</strong>
                <span>{topOffer.name}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ───────── collection list (photo tiles) ───────── */}
      <section className="section wrap">
        <SectionHead title={t('home.catsTitle')} sub={t('home.catsSub')} />
        <div className="coll-grid">
          {[
            { img: '/photos/tile-care.jpg', to: '/shop/category/care-health', label: (categories[0]?.label[l] ?? '') || '' },
            { img: '/photos/tile-offers.jpg', to: '/shop?sale=1', label: t('nav.offers') },
            { img: '/photos/tile-best.jpg', to: '/shop?tag=bestseller', label: t('home.bestTitle') },
            { img: '/photos/tile-new.jpg', to: '/shop?tag=new', label: t('home.newTitle') },
          ].map((c2) => (
            <Link key={c2.to} to={c2.to} className="coll-tile">
              <span className="coll-media"><img src={c2.img} alt="" loading="lazy" /></span>
              <span className="coll-name">{c2.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ───────── photo promo banners (driven by settings.banners) ───────── */}
      {banners.length > 0 && (
        <section className="section wrap">
          <div className="promo-duo">
            {banners.map((b, i) => (
              <Link to={b.ctaLink || '/shop'} key={b.id} className="promo-banner has-photo">
                <img src={PROMO_PHOTOS[i % PROMO_PHOTOS.length]} alt="" loading="lazy" />
                <div className="promo-copy">
                  <b>{b.title[l]}</b>
                  <span>{b.sub[l]}</span>
                  <em className="promo-cta">{t('hero.cta')}</em>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ───────── product rows ───────── */}

      {/* ───────── product rows ───────── */}
      {featured.length > 0 && (
        <section className="section wrap">
          <SectionHead title={t('home.featuredTitle')} sub={t('home.featuredSub')}
            action={<Link className="see-all" to="/shop?tag=featured">{t('home.viewAll')} <Arrow size={14} /></Link>} />
          <div className="grid">{featured.map((p) => <ProductCard key={p.slug} p={p} />)}</div>
        </section>
      )}

      {best.length > 0 && (
        <section className="section wrap">
          <SectionHead title={t('home.bestTitle')} sub={t('home.bestSub')}
            action={<Link className="see-all" to="/shop?tag=bestseller">{t('home.viewAll')} <Arrow size={14} /></Link>} />
          <div className="grid">{best.map((p) => <ProductCard key={p.slug} p={p} />)}</div>
        </section>
      )}

      {fresh.length > 0 && (
        <section className="section wrap">
          <SectionHead title={t('home.newTitle')} sub={t('home.newSub')}
            action={<Link className="see-all" to="/shop?tag=new">{t('home.viewAll')} <Arrow size={14} /></Link>} />
          <div className="grid">{fresh.map((p) => <ProductCard key={p.slug} p={p} />)}</div>
        </section>
      )}

      {offers.length > 0 && (
        <section className="section wrap band-rose">
          <SectionHead title={t('home.offersTitle')} sub={t('home.offersSub')}
            action={<Link className="see-all" to="/shop?sale=1">{t('home.viewAll')} <Arrow size={14} /></Link>} />
          <div className="grid">{offers.map((p) => <ProductCard key={p.slug} p={p} />)}</div>
        </section>
      )}

      {/* ───────── why us ───────── */}
      <section className="section wrap">
        <SectionHead title={t('home.whyTitle')} sub={t('home.whySub')} />
        <div className="why-grid">
          {[
            { ico: <Shield />, x: 'w1' },
            { ico: <Truck />, x: 'w2' },
            { ico: <Globe />, x: 'w4' },
          ].map((i) => (
            <div key={i.x} className="why-card">
              <span className="why-ico">{i.ico}</span>
              <strong>{t(`why.${i.x}t`)}</strong>
              <p>{t(`why.${i.x}d`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── genuine reviews (rotating) ───────── */}
      {shown.length > 0 && (
        <section className="testi-band">
          <div className="wrap testi-card">
            <Stars avg={shown[ri].rating} />
            <p className="testi-text">“{shown[ri].comment}”</p>
            <footer>
              <strong>{shown[ri].name}</strong>
              <span className="muted">
                {' · '}
                {(() => {
                  const p = products.find((x) => x.slug === shown[ri].productSlug)
                  return p ? productTitle(p, l) : ''
                })()}
              </span>
            </footer>
            <div className="testi-dots">
              {shown.map((_, i) => (
                <button key={i} className={i === ri ? 'dot on' : 'dot'} aria-label={String(i + 1)} onClick={() => setRi(i)} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───────── instant discount band ───────── */}
      <section className="deals-band">
        <div className="wrap deals-inner">
          <div>
            <b>{t('deals.title')}</b>
            <span>{t('deals.sub')}</span>
          </div>
          <Link to="/shop" className="btn btn-light">{t('hero.cta')} <Arrow size={14} /></Link>
        </div>
      </section>

      {/* ───────── newsletter (split with photo) ───────── */}
      <section className="section wrap">
        <div className="news has-photo">
          <div className="news-side">
            <img src="/photos/subscribe.jpg" alt="" loading="lazy" />
          </div>
          <div className="news-card">
            <h3>{t('home.newsTitle')}</h3>
            <p>{t('home.newsSub')}</p>
            {newsNote && <p className="form-error">{newsNote}</p>}
            <form onSubmit={subscribe}>
              <input
                type="email"
                value={newsEmail}
                onChange={(e) => setNewsEmail(e.target.value)}
                placeholder={t('home.newsPlaceholder')}
                aria-label={t('home.newsPlaceholder')}
              />
              <button className="btn btn-primary" type="submit">{t('home.newsBtn')}</button>
            </form>
          </div>
        </div>
      </section>
    </main>
  )
}
