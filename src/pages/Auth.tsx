import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useApp } from '../state/app'
import { api } from '../data/api'
import Logo from '../components/Logo'

type Mode = 'login' | 'register' | 'forgot'

export default function AuthPage() {
  const { t } = useI18n()
  const { user, setUser, notify } = useApp()
  const nav = useNavigate()
  const loc = useLocation() as { state?: { from?: string } }
  const [sp] = useSearchParams()
  const mode = (sp.get('mode') as Mode) ?? 'login'
  // internal-only redirect: 'admin' shortcut, absolute paths allowed, external links dropped
  const rawNext = sp.get('next') ?? loc.state?.from ?? '/'
  const nextTo = rawNext === 'admin' ? '/admin' : rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [verifySent, setVerifySent] = useState(false)

  if (user && mode !== 'forgot') {
    return (
      <main className="page">
        <div className="wrap auth-card card">
          <h2>{t('auth.myAccount')}</h2>
          <p className="muted">{user.email}</p>
          <Link to="/account" className="btn btn-primary">{t('account.title')}</Link>
        </div>
      </main>
    )
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      if (mode === 'login') {
        const r = await api.signIn({ email, password: pw })
        if (!r.ok) {
          setErr(r.err === 'bad' ? t('auth.errLogin') : t('err.generic'))
          return
        }
        const u = await api.getUser()
        setUser(u)
        notify(t('auth.login') + ' ✓')
        nav(u?.role === 'admin' && nextTo === '/admin' ? '/admin' : nextTo, { replace: true })
      } else if (mode === 'register') {
        if (phone.trim() && !/^(\+9665\d{8}|05\d{8})$/.test(phone.replace(/[\s-]/g, ''))) { setErr(t('err.reqPhone')); return }
        if (pw.length < 6) { setErr(t('auth.errPass')); return }
        if (pw !== pw2) { setErr(t('auth.errMatch')); return }
        const r = await api.signUp({ name, email, password: pw, phone: phone.trim() || undefined })
        if (!r.ok) {
          setErr(r.err === 'in_use' ? t('auth.errInUse') : r.err === 'weak' ? t('auth.errPass') : t('err.generic'))
          return
        }
        // Supabase (with email confirmation ON) creates the account but no
        // session — never pretend the customer is signed in.
        if (r.verify) {
          setVerifySent(true)
          notify(t('auth.confirmEmail'))
          return
        }
        const r2 = await api.signIn({ email, password: pw })
        const u = r2.ok ? await api.getUser() : null
        setUser(u)
        notify(t('auth.okRegister'))
        nav(nextTo, { replace: true })
      } else {
        const r = await api.resetPassword(email)
        if (r.ok) setSent(true)
        else setErr(t('err.generic'))
      }
    } finally {
      setBusy(false)
    }
  }

  const isLogin = mode === 'login'
  const isRegister = mode === 'register'

  return (
    <main className="page auth-page">
      <div className="wrap">
        <div className="auth-card card">
          <div className="auth-logo"><Logo height={40} /></div>
          <h1>{isLogin ? t('auth.loginTitle') : isRegister ? t('auth.registerTitle') : t('auth.forgotTitle')}</h1>
          <p className="muted">{isLogin ? t('auth.loginSub') : isRegister ? t('auth.registerSub') : t('auth.forgotSub')}</p>

          {sent && <p className="alert alert-success">{isSupabase() ? t('auth.sent') : t('auth.demoReset')}</p>}
          {verifySent && <p className="alert alert-success">{t('auth.confirmEmail')}</p>}
          {err && <p className="alert alert-error">{err}</p>}

          <form onSubmit={submit} className="auth-form">
            {isRegister && (
              <div className="field">
                <label>{t('auth.name')}</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
              </div>
            )}
            <div className="field">
              <label>{isRegister ? t('auth.email') : t('auth.identifier')}</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete={isRegister ? 'email' : 'username'} dir="ltr" placeholder={isLogin ? t('auth.identifierHint') : undefined} />
            </div>
            {isRegister && (
              <div className="field">
                <label>{t('auth.phone')}</label>
                <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" dir="ltr" placeholder="05XXXXXXXX" />
              </div>
            )}
            {mode !== 'forgot' && (
              <div className="field">
                <label>{t('auth.password')}</label>
                <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required autoComplete={isLogin ? 'current-password' : 'new-password'} dir="ltr" minLength={6} />
              </div>
            )}
            {isRegister && (
              <div className="field">
                <label>{t('auth.confirm')}</label>
                <input className="input" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required autoComplete="new-password" dir="ltr" minLength={6} />
              </div>
            )}
            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? '…' : isLogin ? t('auth.login') : isRegister ? t('auth.register') : t('auth.send')}
            </button>
          </form>

          {isLogin && <button className="link-muted" onClick={() => nav('/login?mode=forgot')}>{t('auth.forgot')}</button>}
          <div className="auth-alt">
            {isLogin ? (
              <Link to="/login?mode=register">{t('auth.noAccount')}</Link>
            ) : (
              <Link to="/login">{t('auth.haveAccount')}</Link>
            )}
          </div>
          {!isSupabase() && !import.meta.env.PROD && <p className="demo-hint">{t('demo.banner')}</p>}
        </div>
      </div>
    </main>
  )
}

function isSupabase(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}
