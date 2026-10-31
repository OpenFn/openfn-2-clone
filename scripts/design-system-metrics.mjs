#!/usr/bin/env node
// Measures how much styling lives outside the primitives. Run before and
// after design-system work: `node scripts/design-system-metrics.mjs`.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const root = new URL('../src/', import.meta.url).pathname
// Comments quote class names (a debt: disable says which classes it excuses),
// so they're dropped before counting. A `//` after a colon or quote is a URL.
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })

const files = walk(root)
  .filter((f) => /\.(tsx|ts)$/.test(f) && !f.endsWith('.stories.tsx'))
  .filter((f) => !f.includes(`${sep}mock-data${sep}`) && !f.includes(`${sep}stories${sep}`))
  .map((f) => {
    const raw = readFileSync(f, 'utf8')
    return { path: relative(root, f), raw, src: stripComments(raw) }
  })

const isPrimitive = (p) => p.startsWith('components/primitives/')
const isFeature = (p) => p.startsWith('components/') && !isPrimitive(p)
const isPage = (p) => p.startsWith('pages/')

const loc = (fs) => fs.reduce((n, f) => n + f.raw.split('\n').filter((l) => l.trim()).length, 0)
const count = (fs, re) => fs.reduce((n, f) => n + (f.src.match(re) ?? []).length, 0)

// Every string literal that looks like a Tailwind class list.
const classStrings = (src) =>
  [...src.matchAll(/(?:className=|cn\(|['"`])\s*["'`]([a-z0-9:\-\[\]\/\.\s!#%_()]+)["'`]/g)]
    .map((m) => m[1].trim())
    .filter((s) => s.split(/\s+/).length >= 3 && /\b(px|py|p|m|mx|my|text|bg|border|rounded|flex|grid|gap|w|h)-/.test(s))

const consumers = files.filter((f) => isFeature(f.path) || isPage(f.path))
const prims = files.filter((f) => isPrimitive(f.path))
const tokens = new Set()
for (const f of consumers) for (const s of classStrings(f.src)) for (const t of s.split(/\s+/)) tokens.add(t)

const seen = new Map()
for (const f of consumers)
  for (const s of classStrings(f.src)) {
    const k = s.split(/\s+/).sort().join(' ')
    seen.set(k, (seen.get(k) ?? 0) + 1)
  }
const dupes = [...seen.values()].filter((n) => n > 1).reduce((a, n) => a + n, 0)

const primNames = prims.map((f) => f.path.replace(/^components\/primitives\/|\.tsx?$/g, ''))
const primImports = count(consumers, /from ['"](?:\.\.\/)+(?:components\/)?primitives\/[A-Za-z]+['"]/g)

// Palette shades, not the named colours (src/theme/tokens.css) or the brand
// and status scales. White and black with an alpha are allowed.
const rawPalette =
  /\b(?:bg|text|border(?:-[trblxyse])?|ring|outline|divide|fill|stroke|from|to|via|placeholder|shadow|decoration)-(?:(?:gray|red|green|yellow|blue|amber|orange|purple|pink|sky)-\d|(?:white|black)(?![\w/-]))/g

const rows = [
  ['Source lines (non-blank, excl. stories/mock-data)', loc(files)],
  ['  in primitives', loc(prims)],
  ['  in feature components', loc(files.filter((f) => isFeature(f.path)))],
  ['  in pages', loc(files.filter((f) => isPage(f.path)))],
  ['Primitive files', prims.length],
  ['Feature component files', files.filter((f) => isFeature(f.path)).length],
  ['className= in features + pages', count(consumers, /className=/g)],
  ['Class-list literals in features + pages', consumers.reduce((n, f) => n + classStrings(f.src).length, 0)],
  ['  duplicated (same list used 2+ times)', dupes],
  ['Distinct Tailwind tokens in features + pages', tokens.size],
  ['Arbitrary values (`-[…]`) in features + pages', count(consumers, /-\[[^\]]+\]/g)],
  ['Raw <button> in features + pages', count(consumers, /<button\b/g)],
  ['Raw <input>/<select>/<textarea> in features + pages', count(consumers, /<(input|select|textarea)\b/g)],
  ['Raw <table> in features + pages', count(consumers, /<table\b/g)],
  ['Raw palette classes in features + pages', count(consumers, rawPalette)],
  ['Primitive imports in features + pages', primImports],
]
const w = Math.max(...rows.map((r) => r[0].length))
if (process.argv.includes('--json')) console.log(JSON.stringify(Object.fromEntries(rows)))
else for (const [k, v] of rows) console.log(`${k.padEnd(w)}  ${v}`)
if (process.argv.includes('--names')) console.log('\nPrimitives:', primNames.join(', '))
