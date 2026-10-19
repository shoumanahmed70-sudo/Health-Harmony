import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useApp } from '../state/app'
import { api } from '../data/api'
import { Modal, QtyStepper, SectionHead, Stars, StockBadge, productTitle, productText } from '../components/ui'
import { artFor } from '../data/catalog'
import { Badge } from '../components/ui'
import { Check, Shield, Truck } from '../components/Icons'
import type { Product, Review } from '../data/types'

export default function ProductPage() {
  const { slug = '' } = useParams()
  const { t, locale, money, formatDate } = useI18n()
  const { products, addToCart, toggleWishlist, inWishlist, notify, user } = useApp()
  const nav = useNavigate()

  const [active, setActive] = useState(0)
  const [qty, setQty] = useState(1)
  const [tab, setTab] = useState<'overview' | 'ingredients' | 'usage' | 'shipping' | 'regulatory'>('overview')
  const [reviews, setReviews] = useState<Review[]>([])
  const [ratingInput, setRatingInput] = useState(5)
  const [comment, setComment] = useState('')
  const [sendingReview, setSendingReview] = useState(false)
  const [ageModal, setAgeModal] = useState(false)

  const p: Product | undefined = useMemo(() => products.find((x) => x.slug === slug), [products, slug])

  useEffect(() => {
    void api.listReviews(slug).then(setReviews).catch(() => setReviews([]))
  }, [slug])

  useEffect(() => {
    if (p?.age18 && !ageConfirmed()) setAgeModal(true)
  }, [p?.age18]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!p) {
    return (
      <main className="page">
        <div className="wrap empty-pane">
          <div className="empty-emoji">🌸</div>
          <div className="empty-title">{t('shop.noResults')}</div>
          <Link to="/shop" className="btn btn-outline">{t('cart.continue')}</Link>
        </div>
      </main>
    )
  }

  const l = locale as 'ar' | 'en' | 'tl'
  const img = p.images[active] ?? p.images[0] ?? artFor(p.categorySlug, p.slug)
  const price = money(p.price)
  const was = p.comparePrice && p.comparePrice > p.price ? money(p.comparePrice) : undefined
  const offPct = was ? Math.round(((p.comparePrice! - p.price) / p.comparePrice!) * 100) : undefined

  const related = products.filter((x) => x.slug !== p.slug && x.categorySlug === p.categorySlug).slice(0, 4)

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) return
    setSendingReview(true)
    const res = await api.addReview({
      slug: p.slug,
      name: user?.name ?? t('auth.name'),
      rating: ratingInput,
      comment: comment.trim(),
      userId: user?.id,
    })
    setSendingReview(false)
    if (res.ok) {
      notify(t('auth.saved'))
      setComment('')
      const rs = await api.listReviews(slug)
      setReviews(rs)
    } else {
      notify(t('err.generic'))
    }
  }

  const confirmAge = () => {
    try { localStorage.setItem('hh_age_ok', '1') } catch { /* ignore */ }
    setAgeModal(false)
  }

  return (
    <main className="page">
      {ageModal && (
        <Modal open={ageModal} onClose={() => nav('/')} width={430}>
          <div className="age-gate">
            <h3>{t('product.gateTitle')}</h3>
            <p>{t('product.gateText')}</p>
            <div className="age-actions">
              <button className="btn btn-primary" onClick={confirmAge}>{t('product.gateYes')}</button>
              <button className="btn btn-outline" onClick={() => nav('/')}>{t('product.gateNo')}</button>
            </div>
          </div>
        </Modal>
      )}

      <div className="wrap">
        <nav className="crumbs" aria-label="breadcrumb">
          <Link to="/">{t('nav.home')}</Link>
          <span aria-hidden="true">/</span>
          <Link to={`/shop/category/${p.categorySlug}`}>{p.categorySlug}</Link>
          <span aria-hidden="true">/</span>
          <b>{productTitle(p, l)}</b>
        </nav>

        <div className="prod-layout">
          {/* gallery */}
          <div className="prod-gallery">
            <div className="prod-main-img card"><img src={img} alt={productTitle(p, l)} /></div>
            <div className="prod-thumbs">
              {(p.images.length ? p.images : [artFor(p.categorySlug, p.slug + i(), 720)]).map((src, i) => (
                <button key={i} className={`thumb${i === active ? ' on' : ''}`} onClick={() => setActive(i)}>
                  <img src={src} alt={`${productTitle(p, l)} ${i + 1}`} loading="lazy" />
                </button>
              ))}
            </div>
          </div>

          {/* info */}
          <div className="prod-info">
            <div className="prod-badges">
              {p.badges.includes('new') && <Badge tone="badge-rose">{t('product.new')}</Badge>}
              {p.badges.includes('bestseller') && <Badge tone="badge-cream">{t('home.bestTitle')}</Badge>}
              {offPct !== undefined && <Badge tone="badge-red">{`−${offPct}%`}</Badge>}
              {p.regulated && p.regStatus === 'approved' && <Badge tone="badge-green"><Shield size={13} /> {t('admin.st_approved')}</Badge>}
            </div>

            <h1 className="prod-title">{productTitle(p, l)}</h1>

            <div className="prod-price-row">
              <strong className="prod-price">{price}</strong>
              {was && <del className="prod-was">{was}</del>}
              {offPct !== undefined && <em className="prod-off">{t('product.save')} {offPct}%</em>}
            </div>

            {p.rating ? (
              <div className="prod-rating"><Stars avg={p.rating.avg} count={p.rating.count} /> <span className="muted">{p.rating.count} {t('product.reviews')}</span></div>
            ) : (
              <p className="muted small">{t('product.noReviews')}</p>
            )}

            <p className="prod-desc">{productText(p, 'description', l)}</p>

            <div className="prod-meta">
              <span className="muted">{t('product.sku')}: <b>{p.sku}</b></span>
              {p.brand && <span className="muted">{t('product.brand')}: <b>{p.brand}</b></span>}
              <StockBadge stock={p.stock} />
              {p.age18 && <Badge tone="badge-red">{t('product.ageTitle')}</Badge>}
            </div>

            <div className="prod-cta">
              <QtyStepper value={qty} onChange={setQty} max={Math.max(1, p.stock)} />
              <button
                className="btn btn-primary btn-lg"
                disabled={p.stock <= 0}
                onClick={() => {
                  addToCart(p.slug, qty)
                  notify(t('product.added'))
                }}
              >
                {t('product.addToCart')}
              </button>
              <button
                className={`btn btn-outline btn-lg ${inWishlist(p.slug) ? 'wished' : ''}`}
                onClick={() => toggleWishlist(p.slug)}
              >
                {inWishlist(p.slug) ? '♥' : '♡'} {t('account.wishlist')}
              </button>
            </div>

            <ul className="prod-trust">
              <li><Truck size={15} /> {t('pages.shipB1')}</li>
              <li><Check size={15} /> {t('product.returnText')}</li>
              {p.regulated && <li><Shield size={15} /> {t('product.regApproved')}</li>}
            </ul>
          </div>
        </div>

        {/* tabs */}
        <div className="prod-tabs card">
          <div className="tab-head" role="tablist">
            {(['overview', 'ingredients', 'usage', 'shipping', 'regulatory'] as const).map((key) => (
              <button key={key} role="tab" aria-selected={tab === key} className={`tab-btn${tab === key ? ' on' : ''}`} onClick={() => setTab(key)}>
                {t(`product.${key === 'overview' ? 'overview' : key === 'ingredients' ? 'ingredients' : key === 'usage' ? 'usage' : key === 'shipping' ? 'shipping' : 'regulatory'}`)}
              </button>
            ))}
          </div>
          <div className="tab-body">
            {tab === 'overview' && (
              <div>
                <p>{p.overview ? productText(p, 'overview', l) : productText(p, 'description', l)}</p>
                {p.manufacturer && <p className="muted small">{t('product.manufacturer')}: {p.manufacturer} · {t('product.madeIn')}: {p.origin}</p>}
                <p className="disclaim">{t('product.disclaimer')}</p>
              </div>
            )}
            {tab === 'ingredients' && <p>{p.ingredients ? productText(p, 'ingredients', l) : '—'}</p>}
            {tab === 'usage' && <p>{p.usage ? productText(p, 'usage', l) : '—'}</p>}
            {tab === 'shipping' && (
              <ul className="dotlist">
                <li>{t('product.shipText')}</li>
                <li>{t('product.returnText')}</li>
              </ul>
            )}
            {tab === 'regulatory' && (
              <div>
                {p.regulated ? (
                  <>
                    <p><b>{t('product.complianceLabel')}:</b> {p.regStatus === 'approved' ? t('product.regApproved') : p.regStatus === 'pending' ? t('product.regPending') : t('product.regOff')}</p>
                    <p className="disclaim">{t('pages.regB2')}</p>
                  </>
                ) : (
                  <p className="muted">{t('footer.disclaimer')}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* reviews */}
        <section className="prod-reviews card">
          <h2>{t('home.reviewsTitle')}</h2>
          {reviews.length === 0 && <p className="muted">{t('product.noReviews')}</p>}
          <ul className="review-list">
            {reviews.map((r) => (
              <li key={r.id}>
                <div className="review-head">
                  <b>{r.name}</b>
                  <Stars avg={r.rating} small />
                  <span className="muted">{formatDate(r.createdAt)}</span>
                </div>
                <p>{r.comment}</p>
              </li>
            ))}
          </ul>

          <form className="review-form" onSubmit={submitReview}>
            <h3>{t('product.write')}</h3>
            {!user && <p className="muted small">{t('product.loginToWrite')}</p>}
            <div className="rate-inputs">
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} className={`star-btn${n <= ratingInput ? ' on' : ''}`} onClick={() => setRatingInput(n)} aria-label={`${n}`}>★</button>
              ))}
            </div>
            <textarea
              className="input"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('pages.formMsg')}
              rows={3}
              required
            />
            <button className="btn btn-primary" disabled={sendingReview}>{sendingReview ? '…' : t('pages.send')}</button>
          </form>
        </section>

        {related.length > 0 && (
          <section className="section">
            <SectionHead title={t('product.related')} />
            <div className="grid">{related.map((r2) => <MiniCard key={r2.slug} p={r2} />)}</div>
          </section>
        )}
      </div>
    </main>
  )
}

function i() {
  return Math.random().toString(36).slice(2, 6)
}

function MiniCard({ p }: { p: Product }) {
  const { locale, money } = useI18n()
  const l = locale as 'ar' | 'en' | 'tl'
  return (
    <Link to={`/product/${p.slug}`} className="mini-card card">
      <img src={p.images[0]} alt={p.label[l]} loading="lazy" />
      <strong>{productTitle(p, l)}</strong>
      <span className="mini-price">{money(p.price)}</span>
    </Link>
  )
}

function ageConfirmed(): boolean {
  try { return localStorage.getItem('hh_age_ok') === '1' } catch { return false }
}
