// Makes spines for games people have added on the site, and remakes spines
// people have fixed with "Fix spine". Reads the public game catalog from
// Supabase and records each generated spine in public/spines/manifest.json as
// { bggId: { w: cssWidth, v: version } } — v is the crop's timestamp, or
// "auto" for the default top-of-cover crop.
// Runs on a schedule in GitHub Actions (.github/workflows/deploy.yml).
// Usage: VITE_SUPABASE_URL=… VITE_SUPABASE_KEY=… node scripts/sync-spines.mjs
import fs from 'node:fs/promises'
import path from 'node:path'
import { makeSpine, prepare } from './make-spines.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const MANIFEST = path.join(ROOT, 'public/spines/manifest.json')
const PAD = 0.02 // breathing room around a hand-marked title, as a cover fraction
const { VITE_SUPABASE_URL: url, VITE_SUPABASE_KEY: key } = process.env
if (!url || !key) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_KEY')

const query = 'select=bgg_id,title,cover_url,spine_crop,spine_crop_at&cover_url=not.is.null&or=(spine_url.is.null,spine_crop.not.is.null)'
// The API returns at most 1,000 rows per request, so page through the catalog.
const rows = []
for (let from = 0; ; from += 1000) {
  const res = await fetch(`${url}/rest/v1/games?${query}&order=bgg_id`, { headers: { apikey: key, Range: `${from}-${from + 999}` } })
  if (!res.ok) throw new Error(`catalog ${res.status}`)
  const page = await res.json()
  rows.push(...page)
  if (page.length < 1000) break
}

const manifest = JSON.parse(await fs.readFile(MANIFEST, 'utf8').catch(() => '{}'))
const version = (r) => r.spine_crop_at ?? 'auto'
const current = (id) => (typeof manifest[id] === 'number' ? 'auto' : manifest[id]?.v)

// Turns a marked title box into make-spines crop fields; it picks the
// orientation that fits the title best.
const cropFields = ({ left, top, right, bottom }) => {
  const t = Math.max(0, top - PAD)
  const b = Math.min(1, bottom + PAD)
  return { at: (t + b) / 2, span: b - t, x0: Math.max(0, left - PAD), x1: Math.min(1, right + PAD) }
}

// Fixed spines first, then a batch of new games; batches keep each scheduled
// job short after a big inventory import.
const BATCH = Number(process.env.SPINE_BATCH ?? 150)
const todo = rows
  .filter((r) => current(r.bgg_id) !== version(r))
  .sort((a, b) => Number(!a.spine_crop) - Number(!b.spine_crop))
  .slice(0, BATCH)
await prepare()

for (const r of todo) {
  try {
    const spine = r.spine_crop ? cropFields(r.spine_crop) : undefined
    const { spineW } = await makeSpine({ bggId: r.bgg_id, title: r.title, coverUrl: r.cover_url, spine })
    manifest[r.bgg_id] = { w: spineW / 2, v: version(r) }
    console.log(`spined ${r.title}${spine ? ' (fixed crop)' : ''}`)
  } catch (e) {
    console.log(`failed ${r.title}: ${e.message}`)
  }
}

await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 1) + '\n')
console.log(`sync-spines: ${todo.length} made, ${Object.keys(manifest).length} in manifest`)
