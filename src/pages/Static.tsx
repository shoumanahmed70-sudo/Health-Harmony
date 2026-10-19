import { useI18n } from '../i18n'
import { PageHead } from '../components/ui'
import { Link } from 'react-router-dom'

/** Generic content page: /policies/:slug, /about, /faq, /spring/(unused) */
const MAP: Record<string, { title: string; bodies: string[] }> = {
  privacy: { title: 'pages.privacyTitle', bodies: ['pages.privacyB1', 'pages.privacyB2'] },
  terms: { title: 'pages.termsTitle', bodies: ['pages.termsB1', 'pages.termsB2'] },
  shipping: { title: 'pages.shipTitle', bodies: ['pages.shipB1', 'pages.shipB2'] },
  returns: { title: 'pages.retTitle', bodies: ['pages.retB1', 'pages.retB2'] },
  regulated: { title: 'pages.regTitle', bodies: ['pages.regB1', 'pages.regB2', 'pages.regB3'] },
}

export function PolicyPage({ slug }: { slug: string }) {
  const { t } = useI18n()
  const def = MAP[slug]
  if (!def) return <NotFound />
  return (
    <main className="page">
      <div className="wrap narrow">
        <PageHead title={t(def.title)} />
        <div className="card policy-card">
          {def.bodies.map((k) => (
            <p key={k}>{t(k)}</p>
          ))}
        </div>
      </div>
    </main>
  )
}

export function About() {
  const { t } = useI18n()
  return (
    <main className="page">
      <div className="wrap narrow">
        <PageHead title={t('pages.aboutTitle')} />
        <div className="card policy-card">
          <p>{t('pages.aboutB1')}</p>
          <p>{t('pages.aboutB2')}</p>
        </div>
      </div>
    </main>
  )
}

export function Faq() {
  const { t } = useI18n()
  const items = [1, 2, 3, 4]
  return (
    <main className="page">
      <div className="wrap narrow">
        <PageHead title={t('pages.faqTitle')} />
        {items.map((i) => (
          <div key={i} className="card faq-item">
            <h3>{t(`pages.q${i}`)}</h3>
            <p>{t(`pages.a${i}`)}</p>
          </div>
        ))}
      </div>
    </main>
  )
}

export function NotFound() {
  const { t } = useI18n()
  return (
    <main className="page">
      <div className="wrap empty-pane">
        <div className="empty-emoji">🧭</div>
        <div className="empty-title">{t('notFound.title')}</div>
        <div className="empty-sub">{t('notFound.sub')}</div>
        <Link to="/" className="btn btn-primary">{t('notFound.back')}</Link>
      </div>
    </main>
  )
}
