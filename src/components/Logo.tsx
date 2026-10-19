import { useId } from 'react'

/**
 * Health Harmony brand lockup — rose-gradient heart + leaf mark
 * with the wordmark and "Wellness · Balance · Vitality" tagline.
 */
export default function Logo({
  height = 38,
  withTagline = false,
  tone = 'dark',
}: {
  /** Height of the mark in px */
  height?: number
  withTagline?: boolean
  tone?: 'dark' | 'light'
}) {
  const gid = useId().replace(/[:]/g, '')
  const textColor = tone === 'dark' ? '#a24963' : '#ffffff'
  return (
    <span className="logo-lockup" style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
      <svg width={height} height={height} viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={`hh-grad-${gid}`} x1="12" y1="10" x2="52" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#f2a08c" />
            <stop offset="0.55" stopColor="#e57f95" />
            <stop offset="1" stopColor="#c2557b" />
          </linearGradient>
        </defs>
        {/* Heart */}
        <path
          d="M32.4 54.5C18.6 44 11.8 34.6 11.8 25.4 11.8 17.9 17.7 12 25.1 12c2.9 0 5.6 1 7.3 2.9 1.7-1.9 4.4-2.9 7.3-2.9 7.4 0 13.3 5.9 13.3 13.4 0 9.2-6.8 18.6-20.6 29.1Z"
          stroke={`url(#hh-grad-${gid})`}
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Leaf inside the heart */}
        <path
          d="M31.5 49.5c-2.6-7.4-2-13.4 1.4-18.2 2.7-3.8 6.7-6 11.6-6.6-1.5 5.2-2.2 8.6-4.6 12.4-2.3 3.7-5.2 7.3-8.4 12.4Z"
          fill={`url(#hh-grad-${gid})`}
        />
        <path
          d="M31.5 49.5c3.1-5 6.1-8.7 8.4-12.4.6-1 1.2-2 1.7-3"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
        <span
          style={{
            fontFamily: 'var(--font-en)',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: textColor,
            fontSize: Math.round(height * 0.5),
            textTransform: 'uppercase',
          }}
        >
          Health Harmony
        </span>
        {withTagline && (
          <span
            style={{
              fontFamily: 'var(--font-en)',
              fontWeight: 500,
              letterSpacing: '0.35em',
              color: tone === 'dark' ? 'var(--ink-500)' : 'rgba(255,255,255,0.8)',
              fontSize: Math.max(8, Math.round(height * 0.2)),
              textTransform: 'uppercase',
              marginTop: 3,
            }}
          >
            Wellness · Balance · Vitality
          </span>
        )}
      </span>
    </span>
  )
}
