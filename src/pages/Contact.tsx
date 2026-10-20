import { useState } from 'react'
import { useI18n } from '../i18n'
import { useApp } from '../state/app'
import { api } from '../data/api'
import { PageHead } from '../components/ui'
import { Mail, Phone, Pin, Clock } from '../components/Icons'
import { isPlaceholderPhone, isPlaceholderEmail, isPlaceholderAddress, hasRealContact } from '../data/util'

export default function Contact() {
  const { t } = useI18n()
  const { notify, settings } = useApp()
  const c = settings.contacts
  const [f, setF] = useState({ name: '', email: '', message: '' })
  const [err, setErr] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) { setErr(t('err.reqEmail')); return }
    setBusy(true)
    const r = await api.submitContact(f)
    setBusy(false)
    if (r.ok) {
      setSent(true)
      notify(t('pages.sent'))
      setF({ name: '', email: '', message: '' })
    } else setErr(t('err.generic'))
  }

  return (
    <main className="page">
      <div className="wrap contact-grid">
        <div>
          <PageHead title={t('pages.contactTitle')} sub={t('pages.contactSub')} />
          <ul className="contact-cards">
            {!isPlaceholderPhone(c.phone) && (
              <li className="card"><Phone className="ci" /><div><b>{t('checkout.phone')}</b><span dir="ltr">{c.phone}</span></div></li>
            )}
            {!isPlaceholderEmail(c.email) && (
              <li className="card"><Mail className="ci" /><div><b>{t('checkout.email')}</b><span dir="ltr">{c.email}</span></div></li>
            )}
            {!isPlaceholderAddress(c.address) && (
              <li className="card"><Pin className="ci" /><div><b>{t('footer.address')}</b><span>{c.address}</span></div></li>
            )}
            {c.hours && hasRealContact(c) && (
              <li className="card"><Clock className="ci" /><div><b>{t('footer.hours')}</b><span>{c.hours}</span></div></li>
            )}
            {!hasRealContact(c) && (
              <li className="card"><div><b>{t('pages.contactUnset')}</b></div></li>
            )}
          </ul>
        </div>

        <form className="card contact-form" onSubmit={submit}>
          <h3>{t('pages.formTitle')}</h3>
          {sent && <p className="alert alert-success">{t('pages.sent')}</p>}
          {err && <p className="alert alert-error">{err}</p>}
          <div className="field">
            <label>{t('pages.formName')}</label>
            <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          </div>
          <div className="field">
            <label>{t('pages.formEmail')}</label>
            <input className="input" type="email" dir="ltr" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
          </div>
          <div className="field">
            <label>{t('pages.formMsg')}</label>
            <textarea className="input" rows={5} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} required />
          </div>
          <button className="btn btn-primary" disabled={busy}>{busy ? '…' : t('pages.send')}</button>
        </form>
      </div>
    </main>
  )
}
