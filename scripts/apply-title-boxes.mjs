// Turns the title bounding boxes found with Canva Magic Layers
// (scripts/title-boxes.json: { bggId: {l,t,w,h,W,H} | null }) into per-game
// `spine` crops in the collection data. Games with no detected text title
// (null) keep whatever crop they already had.
// Usage: node scripts/apply-title-boxes.mjs && node scripts/make-spines.mjs
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const DATA = path.join(ROOT, 'src/data/travis-collection.json')
const BOXES = path.join(ROOT, 'scripts/title-boxes.json')

const PAD = 0.03 // breathing room around the title, as a cover fraction
const clamp = (v) => Math.min(1, Math.max(0, v))
const round = (v) => Math.round(v * 1000) / 1000

const games = JSON.parse(await fs.readFile(DATA, 'utf8'))
const boxes = JSON.parse(await fs.readFile(BOXES, 'utf8'))
let applied = 0

for (const game of games) {
  const box = boxes[game.bggId]
  if (!box) continue
  const top = clamp(box.t / box.H - PAD)
  const bottom = clamp((box.t + box.h) / box.H + PAD)
  // Titles stacked taller than they are wide already read down a spine.
  const vertical = box.h > box.w * 1.4
  game.spine = {
    at: round((top + bottom) / 2),
    span: round(bottom - top),
    x0: round(clamp(box.l / box.W - PAD)),
    x1: round(clamp((box.l + box.w) / box.W + PAD)),
    ...(vertical && { vertical: true }),
    source: 'canva-magic-layers',
  }
  applied++
}

await fs.writeFile(DATA, JSON.stringify(games, null, 2) + '\n')
console.log(`applied ${applied} title boxes`)
