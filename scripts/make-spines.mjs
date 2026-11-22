// Builds a box-side ("spine") image for every game from its own cover art.
// Most box fronts carry the title logo in a band along the top edge; rotating
// that band 90° gives a strip that reads down the spine like a real box side.
// Usage: node scripts/make-spines.mjs [bggId ...]
// Also imported by sync-spines.mjs, which spines games added on the site.
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const DATA = path.join(ROOT, 'src/data/travis-collection.json')
const CACHE = path.join(ROOT, '.cache/covers')
const OUT = path.join(ROOT, 'public/spines')
const CUSTOM = path.join(ROOT, 'spines-custom')

const SPINE_H = 560 // 2x the 280px shelf height
const MIN_W = 72
const MAX_W = 160 // 80px on screen; bigger titles get a solid colour field instead
const BAND = 0.24 // fraction of the cover height used for the spine

async function loadCover(game) {
  const file = path.join(CACHE, `${game.bggId}.img`)
  try {
    return await fs.readFile(file)
  } catch {
    const res = await fetch(game.coverUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) throw new Error(`cover ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    await fs.writeFile(file, buf)
    return buf
  }
}

// A hand-made spine (e.g. AI-generated) dropped into spines-custom/ as
// {bggId}.png|jpg|webp wins over the generated one.
async function customSpine(game) {
  for (const ext of ['png', 'jpg', 'jpeg', 'webp']) {
    const file = path.join(CUSTOM, `${game.bggId}.${ext}`)
    try {
      await fs.access(file)
    } catch {
      continue
    }
    const { width, height } = await sharp(file).metadata()
    const spineW = Math.min(MAX_W, Math.max(MIN_W, Math.round((width / height) * SPINE_H)))
    await sharp(file).resize(spineW, SPINE_H, { fit: 'fill' }).webp({ quality: 90 }).toFile(path.join(OUT, `${game.bggId}.webp`))
    return { spineW }
  }
  return null
}

// Title too big for even the widest spine: keep the whole title, use the full
// cover length along the spine, and fill the remaining ends with the solid
// colour of the art at each end - like a printed spine's colour field.
async function overflowSpine({ src, game, along, across, vertical, spineW }) {
  const acrossLen = Math.round(across.len)
  const c0 = Math.round(Math.min(across.max - acrossLen, Math.max(0, across.c - acrossLen / 2)))
  const region = vertical
    ? { left: c0, top: 0, width: acrossLen, height: along.max }
    : { left: 0, top: c0, width: along.max, height: acrossLen }
  const strip = await sharp(await src.clone().extract(region).png().toBuffer())
    .rotate(vertical ? 0 : 90)
    .resize({ width: spineW })
    .png()
    .toBuffer({ resolveWithObject: true })
  const h = Math.min(SPINE_H, strip.info.height)
  // Fill colour for each end: the average of the strip's non-white pixels near
  // that end, so product-photo backgrounds don't become white bars.
  const rgb = await sharp(strip.data).removeAlpha().raw().toBuffer()
  const edge = async (top) => {
    const rows = Math.min(Math.round(h * 0.25), h)
    const from = top === 0 ? 0 : h - rows
    let r = 0, g = 0, b = 0, n = 0
    for (let y = from; y < from + rows; y++) {
      for (let x = 0; x < spineW; x++) {
        const i = (y * spineW + x) * 3
        if (rgb[i] > 225 && rgb[i + 1] > 225 && rgb[i + 2] > 225) continue
        r += rgb[i]; g += rgb[i + 1]; b += rgb[i + 2]; n++
      }
    }
    return n < rows * spineW * 0.05 ? { r: 245, g: 242, b: 235 } : { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) }
  }
  const gap = SPINE_H - h
  const topColor = await edge(0)
  const bottomColor = await edge(h - Math.min(6, h))
  const topH = Math.floor(gap / 2)
  await sharp({ create: { width: spineW, height: SPINE_H, channels: 3, background: topColor } })
    .composite([
      {
        input: await sharp({ create: { width: spineW, height: SPINE_H - topH, channels: 3, background: bottomColor } }).png().toBuffer(),
        left: 0,
        top: topH,
      },
      { input: await sharp(strip.data).extract({ left: 0, top: 0, width: spineW, height: h }).png().toBuffer(), left: 0, top: topH },
    ])
    .webp({ quality: 86 })
    .toFile(path.join(OUT, `${game.bggId}.webp`))
  return { spineW }
}

export async function makeSpine(game) {
  const custom = await customSpine(game)
  if (custom) return custom

  // Flatten EXIF orientation first so extract coordinates match real pixels.
  const flat = await sharp(await loadCover(game)).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const fullW = flat.info.width
  const fullH = flat.info.height
  // Many covers are product photos padded with white/flat margins; trim them so
  // they don't show up as bars down the spine edges.
  const raw = { width: fullW, height: fullH, channels: flat.info.channels }
  const { data, info } = await sharp(flat.data, { raw }).trim({ threshold: 45 }).raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  const offX = -(info.trimOffsetLeft ?? 0)
  const offY = -(info.trimOffsetTop ?? 0)
  const src = sharp(data, { raw: { width, height, channels: info.channels } })

  // Automatic logo detection proved unreliable, so the top band is the default
  // and a hand-picked `spine` crop fixes covers whose title sits elsewhere:
  //   at/span  - vertical centre and height of the band, as cover fractions
  //   x0/x1    - horizontal limits, to trim product-photo whitespace
  //   vertical - the title already runs vertically: use the strip unrotated
  const { at, span = BAND, x0 = 0, x1 = 1 } = game.spine ?? {}
  let vertical = game.spine?.vertical ?? false
  // Title box in cover pixels.
  const centre = at ?? span / 2
  // Title fractions refer to the untrimmed cover; map them into trimmed pixels.
  const bx0 = Math.max(0, fullW * x0 - offX)
  const bx1 = Math.min(width, fullW * x1 - offX)
  const by0 = Math.max(0, fullH * (centre - span / 2) - offY)
  const by1 = Math.min(height, fullH * (centre + span / 2) - offY)
  const box = { x: (bx0 + bx1) / 2, y: (by0 + by1) / 2, w: bx1 - bx0, h: by1 - by0 }

  // Work in "spine axes": `along` runs down the spine, `across` spans its width.
  // Rotated (default): along = cover x. Upright: along = cover y. Each spine
  // uses whichever orientation lets the whole title fit the narrowest spine.
  const plan = (upright) => {
    const along = upright ? { c: box.y, len: box.h, max: height } : { c: box.x, len: box.w, max: width }
    const across = upright ? { c: box.x, len: box.w, max: width } : { c: box.y, len: box.h, max: height }
    const natural = Math.min(MAX_W, Math.max(MIN_W, Math.round((across.len / along.len) * SPINE_H)))
    // Width needed so the title fits using at most the full cover length.
    const needed = Math.max(natural, Math.ceil((across.len / along.max) * SPINE_H))
    return { upright, along, across, needed }
  }
  const options = vertical ? [plan(true)] : [plan(false), plan(true)]
  const best = options.reduce((a, b) => (b.needed < a.needed * 0.8 ? b : a))
  const { along, across } = best
  vertical = best.upright
  const overflow = best.needed > MAX_W
  const spineW = Math.min(MAX_W, best.needed)
  const ratio = spineW / SPINE_H // across / along

  if (overflow) return overflowSpine({ src, game, along, across, vertical, spineW })

  // Grow the crop around the title with real cover art until it matches the
  // spine's proportions - the whole spine is one piece of cover artwork.
  let alongLen = Math.min(along.max, Math.max(along.len, across.len / ratio))
  let acrossLen = alongLen * ratio
  if (acrossLen > across.max) {
    acrossLen = across.max
    alongLen = acrossLen / ratio
  }
  const place = (c, len, max) => Math.round(Math.min(max - len, Math.max(0, c - len / 2)))
  const a0 = place(along.c, alongLen, along.max)
  const c0 = place(across.c, acrossLen, across.max)

  const region = vertical
    ? { left: c0, top: a0, width: Math.round(acrossLen), height: Math.round(alongLen) }
    : { left: a0, top: c0, width: Math.round(alongLen), height: Math.round(acrossLen) }
  const crop = await src.clone().extract(region).png().toBuffer()

  await sharp(crop)
    .rotate(vertical ? 0 : 90)
    .resize(spineW, SPINE_H, { fit: 'cover' })
    .webp({ quality: 86 })
    .toFile(path.join(OUT, `${game.bggId}.webp`))

  return { spineW }
}

export async function prepare() {
  await fs.mkdir(CACHE, { recursive: true })
  await fs.mkdir(OUT, { recursive: true })
}

// Regenerates spines for the bundled collection (all, or the ids given).
async function main() {
  const only = new Set(process.argv.slice(2).map(Number))
  await prepare()
  const games = JSON.parse(await fs.readFile(DATA, 'utf8'))
  const failed = []
  const queue = games.filter((g) => !only.size || only.has(g.bggId))

  for (let i = 0; i < queue.length; i += 6) {
    await Promise.all(
      queue.slice(i, i + 6).map(async (g) => {
        try {
          const { spineW } = await makeSpine(g)
          g.spineWidth = spineW / 2 // CSS px at 1x
        } catch (e) {
          failed.push(`${g.title}: ${e.message}`)
        }
      }),
    )
  }

  await fs.writeFile(DATA, JSON.stringify(games, null, 2) + '\n')
  console.log(`spines: ${queue.length - failed.length}/${queue.length}`)
  if (failed.length) console.log('failed:', failed)
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
