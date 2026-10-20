import type { Banner, Category, Product, Promo, Review, Settings } from './types'

/* ─────────────────────────────────────────────────────────────
   Product & category artwork generator (offline-safe SVG data URIs)
   ───────────────────────────────────────────────────────────── */

const PALETTES: Record<string, [string, string]> = {
  skincare: ['#fdeef1', '#f7d3dd'],
  haircare: ['#fdf3ec', '#f3dcc7'],
  bodycare: ['#f3f0fa', '#ddd4f0'],
  personalcare: ['#eef7f4', '#cfe8e0'],
  fitness: ['#eef2fb', '#d3ddf2'],
  supplements: ['#fbf6e9', '#f0e2bd'],
  wellness: ['#f6f0ec', '#e7d6ca'],
  hormone: ['#fdeef1', '#f3cdd9'],
}

/** Deterministic hash from string to keep art stable per product. */
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/** Local, always-available product artwork (soft gradient + minimal product silhouette). */
export function artFor(kind: string, seed: string, size = 720): string {
  const [c1, c2] = PALETTES[kind] ?? PALETTES.wellness
  const h = hash(seed)
  const rot = (h % 10) - 5
  const dark = '#3f4a41'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 0.85)}" viewBox="0 0 720 612">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="720" y2="612" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.97"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.8"/></linearGradient>
  </defs>
  <rect width="720" height="612" fill="url(#bg)"/>
  <circle cx="${580 + (h % 70)}" cy="${110 + (h % 70)}" r="${110 + (h % 50)}" fill="#ffffff" opacity="0.22"/>
  <circle cx="${120 + (h % 60)}" cy="${470 - (h % 80)}" r="${70 + (h % 46)}" fill="#ffffff" opacity="0.16"/>
  <g opacity="0.16" fill="#ffffff">
    <path transform="translate(${40 + (h % 40)} ${392}) rotate(-18) scale(1.9)" d="M0 30C-16 20 -24 10 -24 0c0-8 6-14 13-14 4 0 8 2 11 5 3-3 7-5 11-5 7 0 13 6 13 14 0 10-8 20-24 30Z"/>
    <path transform="translate(${600 - (h % 50)} ${420}) rotate(24) scale(1.5)" d="M0 30C-16 20 -24 10 -24 0c0-8 6-14 13-14 4 0 8 2 11 5 3-3 7-5 11-5 7 0 13 6 13 14 0 10-8 20-24 30Z"/>
  </g>
  <g transform="rotate(${rot} 360 306)">${shapeFor(seed, c2)}
  </g>
  <text x="40" y="62" font-family="Jost, sans-serif" font-size="17" letter-spacing="5" fill="${dark}" opacity="0.45">HEALTH HARMONY</text>
  <ellipse cx="360" cy="500" rx="160" ry="24" fill="#3f4a41" opacity="0.10"/>
</svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

/** Product-type silhouettes so every catalog image looks like its product. */
function shapeFor(seed: string, accent: string): string {
  const label = (y: number, w = 84) =>
    `<line x1="${360 - w / 2}" y1="${y}" x2="${360 + w / 2}" y2="${y}" stroke="#3f4a41" stroke-width="2.6" opacity="0.2"/>
     <text x="360" y="${y - 26}" text-anchor="middle" font-family="Jost, sans-serif" font-size="27" letter-spacing="7" fill="#3f4a41" opacity="0.5">HH</text>
     <line x1="${360 - w / 2}" y1="${y + 20}" x2="${360 + w / 2}" y2="${y + 20}" stroke="#3f4a41" stroke-width="2.6" opacity="0.12"/>`
  if (/serum|oil|essence/.test(seed))
    return `
    <rect x="322" y="150" width="76" height="46" rx="10" fill="${accent}" opacity="0.9"/>
    <rect x="338" y="120" width="44" height="34" rx="8" fill="#ffffff" opacity="0.95"/>
    <path d="M349 60c0 22 11 34 11 34s11-12 11-34c0-7-22-7-22 0Z" fill="${accent}" opacity="0.85"/>
    <rect x="316" y="196" width="88" height="256" rx="22" fill="url(#body)"/>
    ${label(300, 62)}`
  if (/mask|cream|butter|moisturizer/.test(seed))
    return `
    <rect x="286" y="252" width="148" height="170" rx="26" fill="url(#body)"/>
    <rect x="286" y="228" width="148" height="58" rx="20" fill="${accent}" opacity="0.88"/>
    ${label(336, 100)}`
  if (/yoga/.test(seed))
    return `
    <rect x="216" y="330" width="288" height="56" rx="28" fill="url(#body)"/>
    <rect x="252" y="282" width="252" height="52" rx="26" fill="${accent}" opacity="0.55"/>
    <rect x="288" y="234" width="216" height="52" rx="26" fill="url(#body)" opacity="0.9"/>
    <circle cx="360" cy="186" r="34" fill="${accent}" opacity="0.3"/>
    ${label(452, 90)}`
  if (/dumbbell/.test(seed))
    return `
    <rect x="300" y="294" width="120" height="26" rx="13" fill="url(#body)"/>
    <rect x="236" y="256" width="54" height="102" rx="16" fill="url(#body)"/>
    <rect x="430" y="256" width="54" height="102" rx="16" fill="url(#body)"/>
    <rect x="252" y="226" width="22" height="162" rx="11" fill="${accent}" opacity="0.85"/>
    <rect x="446" y="226" width="22" height="162" rx="11" fill="${accent}" opacity="0.85"/>
    ${label(392, 90)}`
  if (/band/.test(seed))
    return `
    <circle cx="360" cy="300" r="104" fill="none" stroke="url(#body)" stroke-width="26"/>
    <path d="M300 330c40 40 120 30 140-24" fill="none" stroke="${accent}" stroke-width="14" stroke-linecap="round" opacity="0.8"/>
    <circle cx="256" cy="240" r="20" fill="url(#body)"/>
    <circle cx="470" cy="352" r="20" fill="url(#body)"/>
    ${label(452, 90)}`
  if (/diffuser/.test(seed))
    return `
    <rect x="294" y="236" width="132" height="212" rx="30" fill="url(#body)"/>
    <rect x="312" y="180" width="96" height="60" rx="18" fill="${accent}" opacity="0.85"/>
    <circle cx="360" cy="126" r="16" fill="#ffffff" opacity="0.65"/>
    <circle cx="392" cy="100" r="9" fill="#ffffff" opacity="0.5"/>
    <circle cx="338" cy="112" r="6" fill="#ffffff" opacity="0.45"/>
    ${label(352, 84)}`
  if (/roller/.test(seed))
    return `
    <rect x="246" y="266" width="228" height="92" rx="46" fill="url(#body)"/>
    <rect x="246" y="266" width="228" height="30" rx="15" fill="${accent}" opacity="0.4"/>
    <circle cx="360" cy="226" r="8" fill="#ffffff" opacity="0.6"/>
    <circle cx="420" cy="238" r="6" fill="#ffffff" opacity="0.5"/>
    ${label(392, 84)}`
  if (/brush|toothbrush/.test(seed))
    return `
    <rect x="332" y="140" width="26" height="300" rx="13" fill="url(#body)"/>
    <rect x="328" y="112" width="34" height="52" rx="12" fill="${accent}" opacity="0.9"/>
    ${label(300, 60)}`
  if (/kit|panel|infusion|tea|chamomile/.test(seed))
    return `
    <rect x="282" y="246" width="156" height="196" rx="18" fill="url(#body)"/>
    <rect x="282" y="246" width="156" height="52" rx="18" fill="${accent}" opacity="0.85"/>
    <circle cx="360" cy="196" r="26" fill="none" stroke="#ffffff" stroke-width="4" opacity="0.55"/>
    ${label(352, 84)}`
  if (/sunscreen/.test(seed))
    return `
    <rect x="304" y="196" width="112" height="256" rx="20" fill="url(#body)"/>
    <rect x="304" y="166" width="112" height="44" rx="14" fill="${accent}" opacity="0.88"/>
    <rect x="322" y="140" width="76" height="30" rx="10" fill="#cfd8cf" opacity="0.9"/>
    ${label(330, 74)}`
  return `
    <rect x="304" y="150" width="112" height="302" rx="26" fill="url(#body)"/>
    <rect x="304" y="150" width="112" height="104" rx="26" fill="${accent}" opacity="0.85"/>
    <rect x="330" y="122" width="60" height="42" rx="12" fill="#ffffff" opacity="0.95"/>
    ${label(300, 90)}`
}

export function heroArt(seed = 'hero', size = 900): string {
  return artFor('skincare', seed, size)
}

/* ─────────────────────────────────────────────────────────────
   Categories
   ───────────────────────────────────────────────────────────── */

export const CATEGORIES: Category[] = [
  {
    id: 'c1',
    slug: 'care-health',
    experience: 'health',
    sort: 1,
    active: true,
    label: { ar: 'العناية والصحة', en: 'Care & Health', tl: 'Pangangalaga at Kalusugan' },
    desc: {
      ar: 'كل ما يخص العناية بالبشرة والشعر والجسم والعافية المنتجات المصرح بها في مكان واحد',
      en: 'Everything for skin, hair, body, wellness and licensed essentials in one place',
      tl: 'Lahat para sa balat, buhok, katawan, wellness at mga awtorisadong produkto',
    },
  },
]

/* ─────────────────────────────────────────────────────────────
   Products (demo catalog — editorial, no medical claims)
   ───────────────────────────────────────────────────────────── */

type P = {
  slug: string
  cat: string
  sku: string
  label: [string, string, string] // ar, en, tl
  description: [string, string, string]
  overview?: [string, string, string]
  ingredients?: [string, string, string]
  usage?: [string, string, string]
  brand: string
  manufacturer?: string
  origin?: string
  price: number
  comparePrice?: number
  stock: number
  badges: Product['badges']
  regulated?: boolean
  regStatus?: Product['regStatus']
  age18?: boolean
  sold?: number
  created: number // days ago, newest first = smallest
}

const raw: P[] = [
  {
    slug: 'gentle-facial-cleanser',
    cat: 'skincare',
    sku: 'HH-SC-001',
    label: ['غسول الوجه اللطيف — عسل الليمون', 'Gentle Facial Cleanser — Lemon Honey', 'Malambot na Facial Cleanser — Lemon Honey'],
    description: [
      'غسول يومي لطيف يزيل الشوائب وتراكم اليوم دون أن يجفف البشرة، بتركيبة شعر حساسة وتوازن ملين.',
      'A daily, sulfate-free gel cleanser that lifts away impurities without stripping, leaving skin comfortable and soft.',
      'Pang-araw-araw na sulfate-free gel cleanser na nag-aalis ng impurities nang hindi pinapait ang balat.',
    ],
    overview: [
      'مناسب لجميع أنواع البشرة، صباحاً ومساءً.',
      'Suitable for all skin types, morning and evening.',
      'Bagay sa lahat ng uri ng balat, umaga at gabi.',
    ],
    ingredients: [
      'ماء، جليسرين، بيتين، مركز عسل، مستخلص ليمون، حمض الهيالورونيك.',
      'Aqua, Glycerin, Betaine, Honey extract, Lemon extract, Sodium Hyaluronate.',
      'Aqua, Glycerin, Betaine, Honey extract, Lemon extract, Sodium Hyaluronate.',
    ],
    usage: [
      'بلّل الوجه، دلّك كمية صغيرة بحركات دائرية ثم اغسلها.',
      'Apply to damp skin, massage gently, rinse thoroughly.',
      'I-apply sa mamasa-masang balat, himasin nang banayad at banlawan.',
    ],
    brand: 'Harmony Basics',
    manufacturer: 'PureLine Labs',
    origin: 'South Korea',
    price: 89,
    comparePrice: 109,
    stock: 25,
    badges: ['bestseller', 'sale'],
    sold: 141,
    created: 50,
  },
  {
    slug: 'hydrating-day-moisturizer',
    cat: 'skincare',
    sku: 'HH-SC-002',
    label: ['مرطب يومي منعش', 'Hydrating Day Moisturizer', 'Hydrating Day Moisturizer'],
    description: [
      'كريم خفيف امتصاص سريع للحفاظ على نعومة البشرة طوال اليوم.',
      'A lightweight cream that absorbs quickly and keeps skin comfortable all day.',
      'Isang magaan na cream na mabilis sumipsip at pananatilihing komportable ang balat.',
    ],
    brand: 'Harmony Basics',
    manufacturer: 'PureLine Labs',
    origin: 'South Korea',
    price: 119,
    stock: 40,
    badges: ['featured'],
    sold: 96,
    created: 80,
  },
  {
    slug: 'vitamin-c-serum',
    cat: 'skincare',
    sku: 'HH-SC-003',
    label: ['سيروم فيتامين سي 10%', 'Vitamin C Serum 10%', 'Vitamin C Serum 10%'],
    description: [
      'سيروم مركّز لمعانكة إشراقة صباحية بلمسة ناعمة.',
      'A concentrated brightening serum for your morning glow routine.',
      'Isang concentrated serum para sa morning glow routine mo.',
    ],
    brand: 'Harmony Actives',
    manufacturer: 'PureLine Labs',
    origin: 'South Korea',
    price: 149,
    comparePrice: 179,
    stock: 18,
    badges: ['featured', 'sale', 'new'],
    sold: 77,
    created: 5,
  },
  {
    slug: 'mineral-sunscreen-spf50',
    cat: 'skincare',
    sku: 'HH-SC-004',
    label: ['واقي شمس معدني SPF 50', 'Mineral Sunscreen SPF 50', 'Mineral na Sunscreen SPF 50'],
    description: [
      'حماية معدنية واسعة الطيف بلمسة نهائية بدون لون أبيض.',
      'Broad-spectrum mineral protection with a no-white-cast finish.',
      'Broad-spectrum mineral proteksyon na walang white cast.',
    ],
    brand: 'Harmony Basics',
    manufacturer: 'SunGuard LLC',
    origin: 'Germany',
    price: 129,
    stock: 34,
    badges: [],
    sold: 52,
    created: 120,
  },
  {
    slug: 'strengthening-shampoo',
    cat: 'haircare',
    sku: 'HH-HC-001',
    label: ['شامبو مقوّي — بذور الكتان', 'Strengthening Shampoo — Flax Seed', 'Panibagong-lakas na Shampoo — Flax Seed'],
    description: [
      'شامبو بدون سولفات يعطّف الشعر لينة ومنتفخة قريبة.',
      'A sulfate-free wash that softens and plumps hair strands.',
      'Sulfate-free shampoo na nagpapanatili ng buhok na malambot at buhay.',
    ],
    brand: 'Harmony Basics',
    origin: 'Turkey',
    price: 69,
    stock: 47,
    badges: ['bestseller'],
    sold: 133,
    created: 200,
  },
  {
    slug: 'silk-repair-hair-mask',
    cat: 'haircare',
    sku: 'HH-HC-002',
    label: ['ماسك ترميم الشعر الحريري', 'Silk Repair Hair Mask', 'Silk Repair na Hair Mask'],
    description: [
      'قناع أسبوعي مكثّف للنعومة واللمعان.',
      'An intensive weekly treatment for softness and shine.',
      'Intensive weekly treatment para sa lambot at kintab.',
    ],
    brand: 'Harmony Basics',
    origin: 'Turkey',
    price: 99,
    comparePrice: 119,
    stock: 22,
    badges: ['sale'],
    sold: 61,
    created: 90,
  },
  {
    slug: 'nourishing-hair-oil',
    cat: 'haircare',
    sku: 'HH-HC-003',
    label: ['زيت الشعر المغذي', 'Nourishing Hair Oil', 'Nourishing na Hair Oil'],
    description: [
      'خليط خفيف من زيت الأرگان والجوبا للأطراف الجافة.',
      'A light blend of argan and jojoba for dry ends.',
      'Isang magaan na halo ng argan at jojoba para sa tuyong dulo.',
    ],
    brand: 'Harmony Naturals',
    origin: 'Morocco',
    price: 79,
    stock: 30,
    badges: ['new'],
    sold: 20,
    created: 2,
  },
  {
    slug: 'vanilla-oat-body-lotion',
    cat: 'bodycare',
    sku: 'HH-BC-001',
    label: ['لوشن الجسم — فانيلا وشوفان', 'Body Lotion — Vanilla & Oat', 'Body Lotion — Vanilla & Oat'],
    description: [
      'لوشن غني برطوب 24 ساعة ورائحة دافئة.',
      'A rich lotion with 24-hour moisture and a warm scent.',
      'Mayamang lotion na 24-hour moisture at mainit-init na amoy.',
    ],
    brand: 'Harmony Basics',
    origin: 'Poland',
    price: 65,
    stock: 38,
    badges: ['bestseller'],
    sold: 120,
    created: 150,
  },
  {
    slug: 'renewal-body-scrub',
    cat: 'bodycare',
    sku: 'HH-BC-002',
    label: ['مقشر الجسم المتجدد', 'Renewal Body Scrub', 'Renewal na Body Scrub'],
    description: [
      'حبيبات سكر دقيقة في قاعدة زيوت لنعومة فورية.',
      'Fine sugar grains in an oil base for instant softness.',
      'Maliliit na sugar grains sa oil base para instant malambot.',
    ],
    ingredients: undefined,
    usage: undefined,
    brand: 'Harmony Naturals',
    origin: 'Poland',
    price: 75,
    stock: 26,
    badges: [],
    sold: 44,
    created: 130,
  },
  {
    slug: 'rose-foaming-bath-wash',
    cat: 'bodycare',
    sku: 'HH-BC-003',
    label: ['غسول استحمام ورد رائع', 'Rose Foaming Bath Wash', 'Rose Foaming Bath Wash'],
    description: ['رغوة كريمية برائحة الورد المهني.', 'A creamy rose-scented foam wash.', 'Creamy, rose-scented foam wash.'],
    brand: 'Harmony Naturals',
    origin: 'Poland',
    price: 55,
    stock: 42,
    badges: [],
    sold: 33,
    created: 170,
  },
  {
    slug: 'bamboo-toothbrush-2-pack',
    cat: 'personalcare',
    sku: 'HH-PC-001',
    label: ['فرشاة أسنان خيزران — علبتان', 'Bamboo Toothbrush — Pack of 2', 'Bamboo Toothbrush — Bayro ng 2'],
    description: ['شعيرات لطيفة ومقابض خيزران قابلة للتحلل.', 'Soft bristles with compostable bamboo handles.', 'Soft bristles at compostable bamboo handles.'],
    brand: 'Harmony Basics',
    origin: 'China',
    price: 45,
    stock: 60,
    badges: [],
    sold: 88,
    created: 60,
  },
  {
    slug: 'shea-hand-cream',
    cat: 'personalcare',
    sku: 'HH-PC-002',
    label: ['كريم يدين — زبدة شيا', 'Hand Cream — Shea', 'Hand Cream — Shea'],
    description: ['إصلاحات سريعة لليدين الجافة بدون ملمس زيتي.', 'Fast-absorbing relief for dry hands, no greasy feel.', 'Mabilis sumipsip, walang malagkit na dating.'],
    brand: 'Harmony Naturals',
    origin: 'France',
    price: 55,
    stock: 8,
    badges: ['new'],
    sold: 15,
    created: 3,
  },
  {
    slug: 'resistance-bands-set',
    cat: 'fitness',
    sku: 'HH-FI-002',
    label: ['مجموعة أحزمة المقاومة (5 قطع)', 'Resistance Bands Set (5 pcs)', 'Resistance Bands Set (5 pcs)'],
    description: ['مستويات مقاومة مختلفة لتنويع التمارين.', 'Different resistance levels to vary your workouts.', 'Iba’t ibang resistance para iba-ibang workout.'],
    brand: 'MoveHarmony',
    origin: 'China',
    price: 89,
    stock: 51,
    badges: ['bestseller'],
    sold: 98,
    created: 100,
  },
  {
    slug: 'adjustable-dumbbell-pair',
    cat: 'fitness',
    sku: 'HH-FI-003',
    label: ['دمبل قابل للتعديل (زوج)', 'Adjustable Dumbbell (Pair)', 'Adjustable Dumbbell (Pares)'],
    description: ['2–10 كجم لكل قطعة بمقود مانع للانزلاق.', '2–10 kg per piece with an anti-slip grip.', '2–10 kg bawat isa, anti-slip na grip.'],
    brand: 'MoveHarmony',
    origin: 'China',
    price: 249,
    stock: 0,
    badges: ['featured'],
    sold: 40,
    created: 10,
  },
  {
    slug: 'foam-roller',
    cat: 'fitness',
    sku: 'HH-FI-004',
    label: ['أسطوانة فوم للتمدد', 'Foam Roller', 'Foam Roller'],
    description: ['لاسترخاء العضلات بعد التمرين.', 'A recovery essential for after-workout muscle care.', 'Recovery essential pagkatapos ng workout.'],
    brand: 'MoveHarmony',
    origin: 'China',
    price: 119,
    stock: 24,
    badges: ['new'],
    sold: 22,
    created: 4,
  },
  {
    slug: 'vitamin-d3-1000',
    cat: 'supplements',
    sku: 'HH-SP-001',
    label: ['فيتامين د3 1000 وحدة — 60 قرصاً', 'Vitamin D3 1000IU — 60 Tablets', 'Vitamin D3 1000IU — 60 Tablets'],
    description: [
      'مكمل غذائي مصرّح به. يُتناوف الجرعة اليومية الموضحة على العبوة مع وجبة تحتوي دهوناً.',
      'An authorized vitamin supplement. Take the serving shown on the label with a meal containing fat.',
      'Awtorisadong vitamin supplement. Kunin ang serving ayon sa label kasama ng pagkain na may taba.',
    ],
    overview: [
      'مكمل غذائي — ليس دواءً. لا يُستخدم لتشخيص أو علاج أي مرض. استشر اختصاصياً إذا كنت حاملاً أو مرضعاً أو تتناول أدوية.',
      'A food supplement — not a medicine and not intended to diagnose or treat any condition. Consult a professional if pregnant, nursing or on medication.',
      'Food supplement — hindi gamot at hindi para mangdiyagnos o mag-lunas. I-consulet ang propesyunal kapag nagbubuntis o nagpapasuso o may gamot.',
    ],
    ingredients: ['فيتامين د3 (كوليكالسيفيرول)، سليلوز، ستيرات مغنيزيوم.', 'Vitamin D3 (Cholecalciferol), Bulking agent (cellulose), Magnesium stearate.', 'Vitamin D3 (Cholecalciferol), Bulking agent (cellulose), Magnesium stearate.'],
    brand: 'VitaHarmony',
    manufacturer: 'NutriCare Labs',
    origin: 'United Kingdom',
    price: 79,
    stock: 70,
    badges: ['bestseller'],
    regulated: true,
    regStatus: 'approved',
    sold: 210,
    created: 300,
  },
  {
    slug: 'omega-3-90',
    cat: 'supplements',
    sku: 'HH-SP-002',
    label: ['أوميغا-3 زيت السمك — 90 كبسولة', 'Omega-3 Fish Oil — 90 Softgels', 'Omega-3 Fish Oil — 90 Softgels'],
    description: [
      'مكمل غذائي مصرّح به بزيت سمك مركّز، بدون طعم وردّ لاذع.',
      'An authorized fish-oil supplement, concentrated and reflux-free.',
      'Awtorisadong fish-oil supplement, concentrated at walang reflux.',
    ],
    overview: [
      'مكمل غذائي — ليس بديلاً عن نظام غذائي متنوع. احفظ بعيداً عن متناول الأطفال.',
      'A food supplement — not a substitute for a varied diet. Keep out of children’s reach.',
      'Food supplement — hindi kapalit ng balanseng pagkain. Panatilihing malayo sa mga bata.',
    ],
    brand: 'VitaHarmony',
    manufacturer: 'NutriCare Labs',
    origin: 'Norway',
    price: 119,
    stock: 45,
    badges: [],
    regulated: true,
    regStatus: 'approved',
    sold: 154,
    created: 210,
  },
  {
    slug: 'electric-aroma-diffuser',
    cat: 'wellness',
    sku: 'HH-WL-001',
    label: ['ناشر روائح إلكتروني', 'Electric Aroma Diffuser', 'Electric Aroma Diffuser'],
    description: ['ضباب بارد بإضاءة لطيفة لجلسات استرخاء منزلية.', 'Cool-mist diffusion with soft light for home relaxation sessions.', 'Cool-mist diffusion na may banayad na ilaw para sa pahinga sa bahay.'],
    brand: 'Harmony Home',
    origin: 'China',
    price: 189,
    stock: 9,
    badges: ['featured'],
    sold: 71,
    created: 95,
  },
  {
    slug: 'herbal-chamomile-infusion',
    cat: 'wellness',
    sku: 'HH-WL-002',
    label: ['شاي البابونج العشبي', 'Herbal Chamomile Infusion', 'Herbal na Chamomile Infusion'],
    description: ['أعشاب بابونج مجففة طبيعياً لمشروب مسائي هادئ.', 'Naturally dried chamomile for a calm evening drink.', 'Natural na tuyong chamomile para sa payapang gabi.'],
    brand: 'Harmony Naturals',
    origin: 'Egypt',
    price: 39,
    stock: 62,
    badges: [],
    sold: 67,
    created: 110,
  },
  {
    slug: 'hormone-test-kit-home-5',
    cat: 'hormone',
    sku: 'HH-HR-001',
    label: ['اختبار هرمونات منزلي — بانل 5', 'Hormone Test Kit — Home 5-Panel', 'Hormone Test Kit — Home 5-Panel'],
    description: [
      'اختبار منزلي وأنت في منزلك بخمس قياسات، مع تفسير مختبري عبر شريك معتمد. يُستخدم للاختبار الشخصي ولا يُغني عن استشارة طبية.',
      'A home collection kit with five measurements and lab-based interpretation through a certified partner. For personal testing only — it does not replace medical advice.',
      'Home collection kit na may limang sukat at lab-based interpretasyon sa certified partner. Para sa personal na pagsubok lang — hindi kapalit ng medikal na payo.',
    ],
    overview: [
      'منتج منظّم مقيد بالعمر +18. لا يتضمن أي دواء. النتائج توضيحية وتتطلب متابعة مهنية عند وجود مؤشرات غير طبيعية.',
      'A regulated, age-restricted (18+) product. Contains no medicine. Results are informational — follow up with a professional if markers look unusual.',
      'Regulado, 18+ na produkto. Walang gamot sa loob. Ang resulta ay pawang impormasyon — magpakonsulti ka pa rin sa propesyunal.',
    ],
    brand: 'CheckUp@Home',
    manufacturer: 'Medistream Diagnostics',
    origin: 'Netherlands',
    price: 399,
    stock: 11,
    badges: ['new'],
    regulated: true,
    regStatus: 'approved',
    age18: true,
    sold: 19,
    created: 8,
  },
  {
    slug: 'extended-hormone-panel-10',
    cat: 'hormone',
    sku: 'HH-HR-002',
    label: ['اختبار هرمونات موسّع — بانل 10', 'Extended Hormone Panel — 10 Markers', 'Extended Hormone Panel — 10 Markers'],
    description: [
      'اختبار منزلي ببانل موسّع يعرض في المتجر بعد استيفاء سجل الاعتماد كاملاً.',
      'A home extended-panel test listed in the store only once its approval record is complete.',
      'Home extended-panel test na inililistada lang kapag kumpleto na ang tala ng pag-apruba.',
    ],
    brand: 'CheckUp@Home',
    manufacturer: 'Medistream Diagnostics',
    origin: 'Netherlands',
    price: 549,
    stock: 5,
    badges: [],
    regulated: true,
    regStatus: 'pending', // intentionally pending — hidden from the storefront until approved
    age18: true,
    sold: 0,
    created: 1,
  },
]

const now = Date.now()
const DAY = 86400000

export const PRODUCTS: Product[] = raw.map((p) => ({
  id: 'p_' + p.slug.replace(/-/g, '_'),
  slug: p.slug,
  categorySlug: p.cat,
  sku: p.sku,
  label: { ar: p.label[0], en: p.label[1], tl: p.label[2] },
  description: { ar: p.description[0], en: p.description[1], tl: p.description[2] },
  overview: p.overview ? { ar: p.overview[0], en: p.overview[1], tl: p.overview[2] } : undefined,
  ingredients: p.ingredients ? { ar: p.ingredients[0], en: p.ingredients[1], tl: p.ingredients[2] } : undefined,
  usage: p.usage ? { ar: p.usage[0], en: p.usage[1], tl: p.usage[2] } : undefined,
  brand: p.brand,
  manufacturer: p.manufacturer,
  origin: p.origin,
  price: p.price,
  comparePrice: p.comparePrice,
  stock: p.stock,
  images: [artFor(p.cat, p.slug, 720), artFor('wellness', p.slug + '_b', 720), artFor('fitness', p.slug + '_c', 720)],
  badges: p.badges as Product['badges'],
  regulated: p.regulated,
  regStatus: p.regStatus ?? 'off',
  age18: p.age18,
  sold: p.sold,
  active: true,
  createdAt: new Date(now - p.created * DAY).toISOString(),
}))

/** Storefront shows exactly two sections; legacy category slugs fold into these two. */
const CAT_MAP: Record<string, string> = {
  skincare: 'care-health',
  haircare: 'care-health',
  bodycare: 'care-health',
  personalcare: 'care-health',
  fitness: 'care-health',
  supplements: 'care-health',
  wellness: 'care-health',
  hormone: 'care-health',
}
for (const p of PRODUCTS) {
  p.categorySlug = CAT_MAP[p.categorySlug] ?? 'care-health'
}

/* ─────────────────────────────────────────────────────────────
   Seed reviews (genuine customer submissions in this demo)
   ───────────────────────────────────────────────────────────── */

const rv = (
  slug: string,
  name: string,
  rating: number,
  comment: [string, string, string],
  daysAgo: number,
): Review => ({
  id: 'r_' + slug + '_' + daysAgo,
  productSlug: slug,
  name,
  rating,
  comment: comment[0], // store the submitted text as-is (reviews are not machine-translated)
  createdAt: new Date(now - daysAgo * DAY).toISOString(),
  seed: true, // starter review — tagged in the UI, excluded from rating averages
})

export const REVIEWS: Review[] = [
  rv('gentle-facial-cleanser', 'Noura K.', 5, ['خفيف جداً ولا يجفف بشرتي — روتين صباح جميل.', 'Lovely scent and good foam.', 'Lovely scent and good foam.'], 9),
  rv('gentle-facial-cleanser', 'Reem A.', 4, ['رائحته لطيفة ورغوته ممتازة.', 'Lovely scent and good foam.', 'Lovely scent and good foam.'], 22),
  rv('vitamin-c-serum', 'Lindsey M.', 5, ['“My skin looks fresher in the morning. Small bottle, lasts about two months.”', '', ''], 6),
  rv('hydrating-day-moisturizer', 'Sara T.', 4, ['“Comfortable without feeling heavy under makeup.”', '', ''], 13),
  rv('vanilla-oat-body-lotion', 'Mariam S.', 5, ['“Scent is cozy — not too sweet. Great for winter.”', '', ''], 11),
  rv('vitamin-d3-1000', 'Faisal B.', 4, ['“Easy-to-swap small tablets. Label is very clear.”', '', ''], 26),
  rv('electric-aroma-diffuser', 'Hana R.', 5, ['“Quieter than my old diffuser and the light is gentle.”', '', ''], 8,),
]

/* ─────────────────────────────────────────────────────────────
   Settings, banners, promos
   ───────────────────────────────────────────────────────────── */

export const DEFAULT_SETTINGS: Settings = {
  shipStandard: 25,
  shipExpress: 45,
  freeOver: 300,
  vat: 15,
  vatInclusive: true,
  storeName: { ar: 'Health Harmony', en: 'Health Harmony', tl: 'Health Harmony' },
  contacts: {
    phone: '0550000000', // placeholder — replace from the admin dashboard
    email: 'care@health-harmony.example',
    address: 'الرياض — حي العليا (عدّل من لوحة الأدمن)',
    hours: 'السبت–الخميس 9ص–9م',
  },
  payments: {
    cod: true,
    bank: true,
    bankName: 'البنك الأهلي — Health Harmony (مثال)',
    bankIban: 'SA00 0000 0000 0000 0000 0000',
    bankNote: 'حوّل المبلغ على الآيبان ثم أرسل رقم الحوالة واتساب؛ يُشحن طلبك بعد تأكيد الحوالة.',
  },
  banners: [
    {
      id: 'b1',
      active: true,
      sort: 1,
      title: { ar: 'عناية تبدأ من التفاصيل', en: 'Care that starts with details', tl: 'Care na nagsisimula sa detalye' },
      sub: { ar: 'منتجات مختارة من موزعين معتمدين', en: 'Curated from authorized distributors', tl: 'Pinili mula sa awtorisadong distributor' },
      ctaLink: '/shop',
    },
    {
      id: 'b2',
      active: true,
      sort: 2,
      title: { ar: 'روتين رشاقة متوازن', en: 'A balanced fitness routine', tl: 'Balanseng fitness routine' },
      sub: { ar: 'تجهيزات تدعم نشاطك اليومي في المنزل', en: 'Gear for your home training days', tl: 'Kagamitan para sa home workout mo' },
      ctaLink: '/shop',
    },
  ] as Banner[],
}

export const PROMOS: Promo[] = [
  { code: 'HARMONY10', kind: 'percent', value: 10, active: true },
  { code: 'WELCOME15', kind: 'fixed', value: 15, active: true },
]
