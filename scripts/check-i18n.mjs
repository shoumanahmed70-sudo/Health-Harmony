// Verifies every statically-referenced t('...') key exists in all dictionaries
// (ar / en / tl) and that the three dictionaries expose identical key sets.
// Run: npm run check:i18n
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const issues = []

/* ── parse data structures without executing TS: convert to JSON-ish via vm ── */
// The dictionaries are `export default { ... }` object literals; strip the
// surrounding TS and eval the object body safely (no function calls inside).
function loadDict(file) {
  const src = readFileSync(file, 'utf8')
    .replace(/^[\s\S]*?export default/, 'module.exports =')
    .replace(/\bas const\b/g, '')
    .replace(/\}\s*as\s+[A-Za-z]+\s*\}?$/, (m) => m.replace(/\s*as\s+[A-Za-z]+/, ''))
  const mod = { exports: {} }
  // eslint-disable-next-line no-new-func
  new Function('module', '"use strict";' + src)(mod)
  return mod.exports
}

const readDict = (name) => {
  try {
    return loadDict(join(root, 'src', 'i18n', name + '.ts'))
  } catch (e) {
    issues.push(`${name}.ts could not be parsed: ${e.message}`)
    return {}
  }
}

const dicts = { ar: readDict('ar'), en: readDict('en'), tl: readDict('tl') }

/* ── key extraction helpers ── */
function flatten(obj, prefix = '', out = new Set()) {
  for (const [k, v] of Object.entries(obj ?? {})) {
    const path = prefix ? prefix + '.' + k : k
    if (typeof v === 'object' && v !== null) flatten(v, path, out)
    else out.add(path)
    if (typeof v === 'object' && v !== null ? Object.keys(v).length === 0 : true) {
      // empty object → record the path itself so missing parents are caught
    }
  }
  return out
}

function hasPath(obj, path) {
  let cur = obj
  for (const p of path.split('.')) {
    if (typeof cur !== 'object' || cur === null || !(p in cur)) return false
    cur = cur[p]
  }
  return typeof cur === 'string'
}

const keySets = {}
for (const [name, dict] of Object.entries(dicts)) keySets[name] = flatten(dict)

const allKeys = new Set()
for (const s of Object.values(keySets)) for (const k of s) allKeys.add(k)

/* ── 1) dictionary parity ── */
{
  const base = keySets.ar
  for (const name of ['en', 'tl']) {
    for (const k of base) {
      if (!keySets[name].has(k)) issues.push(`MISSING in ${name}: ${k}`)
    }
    for (const k of keySets[name]) {
      if (!base.has(k)) issues.push(`EXTRA in ${name}: ${k}`)
    }
  }
}

/* ── 2) statically-referenced t('...') keys ── */
const refRe = /\bt\(\s*(['"`])([a-zA-Z0-9_.]+)\1/g
const used = new Set()

function walk(dir) {
  for (const f of readdirSync(dir)) {
    const full = join(dir, f)
    if (statSync(full).isDirectory()) {
      if (!f.includes('node_modules')) walk(full)
      continue
    }
    if (!/\.(tsx?|ts)$/.test(f)) continue
    const src = readFileSync(full, 'utf8')
    for (const m of src.matchAll(refRe)) {
      const key = m[2]
      // template keys like account.st_${...} / admin.st_... are dynamic — skip
      if (!key.includes('${')) used.add(`${key}  (${relative.replace(/\\/g, '/')})`)
    }
  }
}
let relative = ''

walk(join(root, 'src'))
// also scan the .tsx pages folder explicitly is covered by walk(src)

for (const entry of used) {
  const key = entry.slice(0, entry.indexOf('  ('))
  for (const name of ['ar', 'en', 'tl']) {
    if (!hasPath(dicts[name], key)) {
      issues.push(`MISSING key in ${name}: ${key} — used${entry.slice(entry.indexOf('  ('))}`)
    }
  }
}

if (issues.length) {
  console.log(`i18n check FAILED (${issues.length} issue(s)):`)
  for (const i of issues) console.log('  ✗ ' + i)
  process.exit(1)
}
console.log(`✓ i18n OK — ${allKeys.size} keys, ${used.size} static references, ar/en/tl in sync`)
