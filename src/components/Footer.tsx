import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { api } from '../data/api'
import { useApp } from '../state/app'
import LanguageSelect from './LanguageSelect'
import { waLink } from '../data/util'
import Logo from './Logo'
import { Mail, Phone, Pin, Clock } from './Icons'

export default function Footer() {
  const { t, locale } = useI18n()
  const { categories, settings } = useApp()
  const c = settings.contacts
  const l = locale as 'ar' | 'en' | 'tl'
  const [email, setEmail] = useState('')
  const [note, setNote] = useState<string | null>(null)

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNote(t('err.reqEmail'))
      return
    }
    const r = await api.subscribeNewsletter(email)
    if (r.ok) {
      setNote(t('home.newsOk'))
      setEmail('')
    } else {
      setNote(t('home.newsErr'))
    }
  }

  return (
    <footer className="footer" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="wrap f-grid">
        <div className="f-brand">
          <Logo height={40} />
          <p className="f-about">{t('footer.about')}</p>
          <p className="tagline">Wellness · Balance · Vitality</p>
          <ul className="f-contact">
            <li><Pin size={15} /> {c.address}</li>
            <li><Mail size={15} /> <a dir="ltr" href={`mailto:${c.email}`}>{c.email}</a></li>
            <li><Phone size={15} /> <a dir="ltr" href={`tel:${c.phone}`}>{c.phone}</a></li>
            <li><Clock size={15} /> {c.hours}</li>
          </ul>
        </div>

        <nav className="f-col">
          <h4>{t('footer.links')}</h4>
          <Link to="/shop">{t('nav.shop')}</Link>
          {categories.map((c) => (
            <Link key={c.slug} to={`/shop/category/${c.slug}`}>{c.label[l]}</Link>
          ))}
          <Link to="/shop?sale=1">{t('nav.offers')}</Link>
          <Link to="/contact">{t('nav.contact')}</Link>
        </nav>

        <nav className="f-col">
          <h4>{t('footer.contact')}</h4>
          <Link to="/policies/shipping">{t('pages.shipTitle')}</Link>
          <Link to="/policies/returns">{t('pages.retTitle')}</Link>
          <Link to="/policies/privacy">{t('pages.privacyTitle')}</Link>
          <Link to="/policies/terms">{t('pages.termsTitle')}</Link>
          <Link to="/policies/regulated">{t('pages.regTitle')}</Link>
        </nav>

        <div className="f-col f-news">
          <h4>{t('home.newsTitle')}</h4>
          <p>{t('home.newsSub')}</p>
          <form onSubmit={subscribe} className="f-form">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('home.newsPlaceholder')}
              aria-label={t('home.newsPlaceholder')}
            />
            <button className="btn btn-primary btn-sm" type="submit">{t('home.newsBtn')}</button>
          </form>
          {note && <p className={`f-note ${note === t('home.newsOk') ? 'ok' : 'err'}`}>{note}</p>}          <div className="f-lang">
            <h4>{t('header.langLabel')}</h4>
            <LanguageSelect current={locale} currentInline onPick={() => {}} />
          </div>
          <p className="f-pay">{t('footer.payments')}</p>
        </div>
      </div>

      <div className="wrap f-bottom">
        <p>{t('footer.disclaimer')}</p>
        <p>© {new Date().getFullYear()} Health Harmony — {t('footer.rights')}</p>
      </div>
      <a
        className="wa-float"
        href={waLink(settings.contacts.phone, t('wa.hello'))}
        target="_blank"
        rel="noreferrer"
        title="WhatsApp"
        aria-label="WhatsApp"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.2 1.2-1.7 1.2-.4 0-1 0-2-.4a11.4 11.4 0 0 1-4.6-4c-.6-.9-1-2-1-2.9 0-1 .5-1.5.7-1.7.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.4l.8 1.9c.1.2.1.4 0 .6l-.4.6c-.1.2-.2.3 0 .5.7 1.2 1.6 2 2.8 2.6.2.1.4.1.5 0l.7-.8c.2-.2.4-.2.6-.1l1.8.8c.3.2.4.3.4.5s0 .8-.3 1.1Z" />
        </svg>
      </a>
    </footer>
  )
}
