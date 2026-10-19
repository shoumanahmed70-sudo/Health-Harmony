import { useI18n } from '../i18n'
import { Globe, Check } from './Icons'

/** The 3 supported languages with correct native labels. */
const LANGS = [
  { code: 'ar', name: 'العربية', dirNote: 'RTL' },
  { code: 'en', name: 'English', dirNote: 'LTR' },
  { code: 'tl', name: 'Filipino', dirNote: 'LTR' },
] as const

export function LangButton({ onToggle }: { onToggle: () => void }) {
  const { t, locale } = useI18n()
  return (
    <button
      className="icon-btn lang-btn"
      onClick={onToggle}
      title={t('header.langLabel')}
      aria-label={t('header.langLabel')}
      aria-haspopup="menu"
      aria-expanded={false}
      data-locale={locale}
    >
      <Globe />
      <span className="lang-code">{locale}</span>
      <ChevronInline />
    </button>
  )
}

function ChevronInline() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export default function LanguageSelect({ onPick, current, currentInline }: { onPick: () => void; current: string; currentInline?: boolean }) {
  const { setLocale, t } = useI18n()

  return (
    <div className={`lang-select${currentInline ? ' inline' : ''}`} role="menu" aria-label={t('header.langLabel')}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          role="menuitem"
          className={`lang-item${l.code === current ? ' on' : ''}`}
          onClick={() => {
            setLocale(l.code)
            onPick()
          }}
        >
          <span className="lang-name">{l.name}</span>
          <span className="lang-dir">{l.dirNote}</span>
          {l.code === current && <Check size={14} />}
        </button>
      ))}
    </div>
  )
}
