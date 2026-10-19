import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Dictionary, Locale } from './types'
import ar from './ar'
import en from './en'
import tl from './tl'

export const LOCALES: Locale[] = ['ar', 'en', 'tl']

const DICTS: Record<Locale, Dictionary> = { ar, en, tl }

const LANG_NAMES: Record<Locale, string> = {
  ar: 'العربية',
  en: 'English',
  tl: 'Filipino',
}

export const DIRS: Record<Locale, 'rtl' | 'ltr'> = { ar: 'rtl', en: 'ltr', tl: 'ltr' }

export const DEFAULT_LOCALE: Locale = 'ar'

const STORAGE_KEY = 'hh_lang'

function detectInitial(): Locale {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved && LOCALES.includes(saved as Locale)) return saved as Locale
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE
}

type I18nValue = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (path: string) => string
  dir: 'rtl' | 'ltr'
  langName: string
  money: (n: number) => string
  formatDate: (d: string | Date) => string
}

const I18nContext = createContext<I18nValue | null>(null)

/** Resolve "a.b.c" against nested dictionaries, with graceful en fallback. */
export function resolve(dict: Dictionary, path: string): string {
  const parts = path.split('.')
  let cur: string | Dictionary | undefined = dict as Dictionary
  for (const p of parts) {
    if (typeof cur !== 'object' || cur === null) return ''
    cur = (cur as Dictionary)[p]
  }
  return typeof cur === 'string' ? cur : ''
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitial)

  useEffect(() => {
    const dir = DIRS[locale]
    document.documentElement.lang = locale
    document.documentElement.dir = dir
    try {
      window.localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      /* ignore */
    }
  }, [locale])

  const setLocale = useCallback((l: Locale) => {
    if (LOCALES.includes(l)) setLocaleState(l)
  }, [])

  // Fake locale for Saudi-style Arabic numerals; standard for en/tl.
  const intlLocale = useMemo(() => {
    if (locale === 'ar') return 'ar-SA'
    return 'en-US'
  }, [locale])

  const t = useCallback(
    (path: string): string => {
      const primary = resolve(DICTS[locale], path)
      if (primary) return primary
      // graceful fallback: English, then Arabic
      return resolve(en, path) || resolve(ar, path) || path
    },
    [locale],
  )

  const money = useCallback(
    (n: number): string => {
      const rounded = Math.round(n * 100) / 100
      if (locale === 'ar') {
        // "ر.س" after number, Arabic-Indic digits via 'ar-SA'
        const num = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(rounded)
        return `${num} ر.س`
      }
      const num = new Intl.NumberFormat(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rounded)
      return `SAR ${num}`
    },
    [intlLocale, locale],
  )

  const formatDate = useCallback(
    (d: string | Date): string => {
      const date = typeof d === 'string' ? new Date(d) : d
      if (Number.isNaN(date.getTime())) return ''
      return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : intlLocale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date)
    },
    [intlLocale, locale],
  )

  const value = useMemo<I18nValue>(
    () => ({ locale, setLocale, t, dir: DIRS[locale], langName: LANG_NAMES[locale], money, formatDate }),
    [locale, setLocale, t, money, formatDate],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
