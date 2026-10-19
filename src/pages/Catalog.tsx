import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useApp } from '../state/app'
import { ProductCard, PageHead } from '../components/ui'
import type { Product } from '../data/types'

const CAT_EXP: Record<string, string> = {
  beauty: 'beauty',
  wellness: 'health',
  health: 'health',
}

export default function Catalog() {
  const routeParams = useParams<{ params?: string; slug?: string }>()
  const [sp, setSp] = useSearchParams()
  const { t, locale } = useI18n()
  const { products, categories, loading } = useApp()

  const [q, setQ] = useState(sp.get('q') ?? '')
  const [cat, setCat] = useState<string>(sp.get('cat') ?? '')
  const [min, setMin] = useState<number | ''>(sp.get('min') ? Number(sp.get('min')) : '')
  const [max, setMax] = useState<number | ''>(sp.get('max') ? Number(sp.get('max')) : '')
  const [inStockOnly, setInStockOnly] = useState(sp.get('stock') === '1')
  const [onSaleOnly, setOnSaleOnly] = useState(sp.get('sale') === '1')
  const [tag, setTag] = useState(sp.get('tag') ?? '')
  const [sort, setSort] = useState(sp.get('sort') ?? 'featured')

  // segment pages: /shop, /shop/beauty|wellness|health, /shop/category/:slug
  const segment = routeParams.params ?? (routeParams.slug ? 'category/' + routeParams.slug : '')
  const catSlug = segment.startsWith('category/') ? segment.slice('category/'.length) : ''

  useEffect(() => {
    if (segment === 'beauty') setCat('')
    else if (segment === 'wellness' || segment === 'health') setCat('')
    else if (catSlug) setCat(catSlug)
    else setCat(sp.get('cat') ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment, catSlug])

  const list = useMemo(() => {
    let out: Product[] = products
    if (catSlug) out = out.filter((p) => p.categorySlug === catSlug)
    else if (CAT_EXP[segment]) {
      const exp = CAT_EXP[segment]
      const catSlugs = new Set(categories.filter((c) => c.experience === exp).map((c) => c.slug))
      out = out.filter((p) => catSlugs.has(p.categorySlug))
    }
    if (cat && !catSlug) out = out.filter((p) => p.categorySlug === cat)
    if (q.trim()) {
      const n = q.trim().toLowerCase()
      out = out.filter(
        (p) =>
          ['ar', 'en', 'tl'].some((lng) => p.label[lng as 'ar' | 'en' | 'tl'].toLowerCase().includes(n)) ||
          p.sku.toLowerCase().includes(n) ||
          p.brand.toLowerCase().includes(n),
      )
    }
    if (min !== '') out = out.filter((p) => p.price >= (min as number))
    if (max !== '') out = out.filter((p) => p.price <= (max as number))
    if (inStockOnly) out = out.filter((p) => p.stock > 0)
    if (onSaleOnly) out = out.filter((p) => p.comparePrice && p.comparePrice > p.price)
    if (tag === 'sale') out = out.filter((p) => p.comparePrice && p.comparePrice > p.price)
    if (tag && tag !== 'sale') out = out.filter((p) => p.badges.includes(tag as Product['badges'][number]))

    const sorted = [...out]
    switch (sort) {
      case 'price_asc':
        sorted.sort((a, b) => a.price - b.price)
        break
      case 'price_desc':
        sorted.sort((a, b) => b.price - a.price)
        break
      case 'rating':
        sorted.sort((a, b) => (b.rating?.avg ?? 0) - (a.rating?.avg ?? 0))
        break
      case 'new':
        sorted.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        break
      default:
        sorted.sort((a, b) => (b.rating?.count ?? 0) - (a.rating?.count ?? 0) || a.price - b.price)
    }
    return sorted
  }, [products, categories, catSlug, cat, q, min, max, inStockOnly, onSaleOnly, tag, sort, segment])

  const titleKey = segment === 'beauty' ? 'page.beautyTitle' : segment === 'wellness' ? 'page.wellnessTitle' : segment === 'health' ? 'page.healthTitle' : segment === 'category' || catSlug ? (catSlug && catSlug === 'hormone' ? '' : 'shop.title') : 'shop.title'
  const subKey = segment === 'beauty' ? 'page.beautySub' : segment === 'wellness' ? 'page.wellnessSub' : segment === 'health' ? 'page.healthSub' : 'shop.noResultsHint'
  void titleKey
  void subKey

  const theCat = categories.find((c) => c.slug === catSlug)
  const heading =
    theCat ? theCat.label[locale as 'ar' | 'en' | 'tl']
      : segment === 'beauty' ? t('page.beautyTitle')
      : segment === 'wellness' ? t('page.wellnessTitle')
      : segment === 'health' ? t('page.healthTitle')
      : q ? `${t('page.offersTitle')} · ${q}` // search shows query context
      : onSaleOnly ? t('page.offersTitle')
      : t('shop.title')

  const subheading =
    theCat ? theCat.desc[locale as 'ar' | 'en' | 'tl']
      : segment === 'beauty' ? t('page.beautySub')
      : segment === 'wellness' ? t('page.wellnessSub')
      : segment === 'health' ? t('page.healthSub')
      : onSaleOnly ? t('page.offersSub')
      : t('shop.results')

  if (loading) {
    return <div className="loading-block"><div className="spinner" /></div>
  }

  return (
    <main className="page">
      <div className="wrap">
        <PageHead title={heading} sub={subheading} />

        <div className="cat-layout">
          <aside className="filters card">
            <h3 className="filters-title">{t('shop.filters')}</h3>

            <div className="filter-block">
              <label>{t('shop.category')}</label>
              <select className="input" value={cat} onChange={(e) => { setCat(e.target.value); const nsp = new URLSearchParams(sp); if (e.target.value) nsp.set('cat', e.target.value); else nsp.delete('cat'); setSp(nsp) }}>
                <option value="">{t('shop.allCats')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>{c.label[locale as 'ar' | 'en' | 'tl']}</option>
                ))}
              </select>
            </div>

            <div className="filter-block">
              <label>{t('shop.price')}</label>
              <div className="two-num">
                <input className="input" type="number" placeholder={t('shop.min')} value={min} onChange={(e) => setMin(e.target.value === '' ? '' : Number(e.target.value))} />
                <input className="input" type="number" placeholder={t('shop.max')} value={max} onChange={(e) => setMax(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
            </div>

            <div className="filter-block form-check">
              <label><input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} /> {t('shop.inStockOnly')}</label>
              <label><input type="checkbox" checked={onSaleOnly} onChange={(e) => setOnSaleOnly(e.target.checked)} /> {t('shop.onSaleOnly')}</label>
            </div>

            <div className="filter-block">
              <label>{t('shop.sort')}</label>
              <select className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="featured">{t('shop.sortFeatured')}</option>
                <option value="price_asc">{t('shop.sortPriceAsc')}</option>
                <option value="price_desc">{t('shop.sortPriceDesc')}</option>
                <option value="rating">{t('shop.sortRating')}</option>
                <option value="new">{t('shop.sortNew')}</option>
              </select>
            </div>

            <button className="btn btn-outline btn-sm btn-block" onClick={() => { setQ(''); setCat(''); setMin(''); setMax(''); setInStockOnly(false); setOnSaleOnly(false); setTag(''); setSp(new URLSearchParams()) }}>
              {t('shop.reset')}
            </button>
          </aside>

          <section>
            <div className="results-bar">
              <span>{list.length} {t('shop.results')}</span>
              {q && <button className="chip-x" onClick={() => { setQ(''); const nsp = new URLSearchParams(sp); nsp.delete('q'); setSp(nsp) }}>✕ {q}</button>}
            </div>
            {list.length === 0 ? (
              <div className="empty-pane">
                <div className="empty-emoji">🌻</div>
                <div className="empty-title">{t('shop.noResults')}</div>
                <div className="empty-sub">{t('shop.noResultsHint')}</div>
              </div>
            ) : (
              <div className="grid">{list.map((p) => <ProductCard key={p.slug} p={p} />)}</div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

export function CatalogLink() {
  return <Link to="/shop" />
}
