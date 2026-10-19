/**
 * Large decorative botanical background scenes (pure SVG, offline-safe).
 * Rendered as fixed full-screen layers behind the storefront.
 */

const leaf = (x: number, y: number, s: number, rot: number, g: string, op = 0.85) =>
  `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
    <path d="M0 -70C36 -36 36 36 0 70C-36 36 -36 -36 0 -70Z" fill="url(#${g})" opacity="${op}"/>
    <path d="M0 -52V50M0 0C-12 -10 -22 -16 -30 -20M0 0C12 -10 22 -16 30 -20M0 24C-10 14 -18 10 -25 8M0 24C10 14 18 10 25 8"
      stroke="#43684d" stroke-width="4" stroke-linecap="round" opacity="0.16" fill="none"/>
  </g>`

const petal = (x: number, y: number, s: number, rot: number, fill: string, op = 0.5) =>
  `<path d="M0 26C-14 16 -20 8 -20 0c0-7 5-12 11-12 3 0 7 2 9 4 2-2 6-4 9-4 6 0 11 5 11 12 0 8-6 16-20 26Z"
    fill="${fill}" opacity="${op}" transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"/>`

function scene(g1: string, g2: string, accent: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="1100" viewBox="0 0 1100 1100">
  <defs>
    <linearGradient id="lg1" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#e9f2e9"/><stop offset="0.5" stop-color="#b9d3bc"/><stop offset="1" stop-color="#7fa387"/>
    </linearGradient>
    <linearGradient id="lg2" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#fdf0f3"/><stop offset="0.5" stop-color="#f7d3dd"/><stop offset="1" stop-color="#dfa0b6"/>
    </linearGradient>
    <linearGradient id="${g1}" x1="0" y1="0" x2="0.5" y2="1">
      <stop offset="0" stop-color="#dff0e0"/><stop offset="1" stop-color="#8fae95"/>
    </linearGradient>
    <linearGradient id="${g2}" x1="0" y1="0" x2="0.5" y2="1">
      <stop offset="0" stop-color="#fbe4ea"/><stop offset="1" stop-color="#dfa0b6"/>
    </linearGradient>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="7"/>
    </filter>
  </defs>
  <g filter="url(#soft)">
    ${leaf(180, 830, 2.6, -34, g1)}
    ${leaf(120, 620, 1.9, -62, g1, 0.7)}
    ${leaf(330, 950, 2.2, -12, g1)}
    ${leaf(260, 1020, 1.4, 24, g2, 0.55)}
    ${leaf(70, 420, 1.2, -80, g2, 0.4)}
    ${petal(150, 500, 3.4, 18, accent, 0.35)}
    ${petal(250, 730, 2.6, -30, accent, 0.3)}
    ${leaf(950, 240, 2.4, 138, g1)}
    ${leaf(1020, 440, 1.8, 118, g1, 0.7)}
    ${leaf(860, 130, 1.7, 150, g2, 0.55)}
    ${leaf(780, 40, 1.1, 168, g1, 0.4)}
    ${petal(1030, 620, 3.2, 170, accent, 0.35)}
    ${petal(900, 320, 2.4, -160, accent, 0.3)}
  </g>
</svg>`
}

export const BG_LEFT = 'data:image/svg+xml;utf8,' + encodeURIComponent(scene('lg1l', 'lg2l', '#dfa0b6'))
export const BG_RIGHT = 'data:image/svg+xml;utf8,' + encodeURIComponent(scene('lg1r', 'lg2r', '#b9d3bc'))
