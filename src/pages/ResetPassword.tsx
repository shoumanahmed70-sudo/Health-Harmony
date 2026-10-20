import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useApp } from '../state/app'
import { api } from '../data/api'
import Logo from '../components/Logo'

/** /reset-password — lands here from the Supabase recovery email.
 *  The client SDK turns the recovery token in the URL into a session
 *  automatically, after which updateUser() sets the new password. */
export default function ResetPassword() {
  const { t } = useI18n()
  const { notify } = useApp()
  const nav = useNavigate()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (pw.length < 6) {
      setErr(t('auth.errPass'))
      return
    }
    if (pw !== pw2) {
      setErr(t('auth.errMatch'))
      return
    }
    setBusy(true)
    const r = await api.changePassword(pw)
    setBusy(false)
    if (!r.ok) {
      setErr(t('err.generic'))
      return
    }
    setDone(true)
    notify(t('resetpw.saved'))
    window.setTimeout(() => nav('/login', { replace: true }), 1200)
  }

  return (
    <main className="page auth-page">
      <div className="wrap">
        <div className="auth-card card">
          <div className="auth-logo"><Logo height={40} /></div>
          <h1>{t('resetpw.title')}</h1>
          <p className="muted">{t('resetpw.sub')}</p>

          {done && <p className="alert alert-success">{t('resetpw.saved')}</p>}
          {err && <p className="alert alert-error">{err}</p>}

          <form onSubmit={submit} className="auth-form">
            <div className="field">
              <label>{t('resetpw.password')}</label>
              <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required autoComplete="new-password" dir="ltr" minLength={6} />
            </div>
            <div className="field">
              <label>{t('auth.confirm')}</label>
              <input className="input" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required autoComplete="new-password" dir="ltr" minLength={6} />
            </div>
            <button className="btn btn-primary btn-block" disabled={busy || done}>
              {busy ? '…' : t('resetpw.save')}
            </button>
          </form>

          <div className="auth-alt">
            <Link to="/login">{t('auth.haveAccount')}</Link>
          </div>
        </div>
      </div>
    </main>
  )
}
