// Pulls player counts, age, play time, weight, rating, credits and the
// description for every game from BoardGameGeek's site API into
// src/data/game-info.json (keyed by bggId).
// Usage: node scripts/fetch-game-info.mjs
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const games = JSON.parse(await fs.readFile(path.join(ROOT, 'src/data/travis-collection.json'), 'utf8'))
const OUT = path.join(ROOT, 'src/data/game-info.json')

const api = async (endpoint, id) => {
  const res = await fetch(`https://api.geekdo.com/api/${endpoint}?objectid=${id}&objecttype=thing`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  if (!res.ok) throw new Error(`${endpoint} ${res.status}`)
  return (await res.json()).item
}

const num = (v) => (v == null || v === '' || Number(v) === 0 ? null : Number(v))
const names = (links = []) => links.map((l) => l.name)
const ENTITIES = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', mdash: '—', ndash: '–', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' }

// BGG descriptions are HTML; keep the paragraphs, drop the markup.
function plainParagraphs(html = '') {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&(\w+);/g, (m, e) => ENTITIES[e] ?? m)
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

async function info(id) {
  const [item, dyn] = await Promise.all([api('geekitems', id), api('dynamicinfo', id)])
  const { links } = item
  const polls = dyn.polls ?? {}
  const range = (r) => (r ? { min: r.min, max: r.max } : null)
  const overall = dyn.rankinfo?.find((r) => r.rankobjectid === 1)
  return {
    tagline: item.short_description || null,
    players: { min: num(item.minplayers), max: num(item.maxplayers) },
    bestPlayers: range(polls.userplayers?.best?.[0]),
    recommendedPlayers: range(polls.userplayers?.recommended?.[0]),
    playTime: { min: num(item.minplaytime), max: num(item.maxplaytime) },
    minAge: num(item.minage),
    communityAge: polls.playerage || null,
    weight: num(dyn.stats?.avgweight),
    rating: num(dyn.stats?.average),
    ratings: num(dyn.stats?.usersrated),
    rank: num(overall?.rank),
    languageDependence: polls.languagedependence || null,
    designers: names(links.boardgamedesigner),
    artists: names(links.boardgameartist).slice(0, 4),
    publishers: names(links.boardgamepublisher).slice(0, 3),
    categories: names(links.boardgamecategory),
    mechanics: names(links.boardgamemechanic),
    types: names(links.boardgamesubdomain),
    expands: names(links.expandsboardgame),
    description: plainParagraphs(item.description),
  }
}

const out = {}
const failed = []
for (let i = 0; i < games.length; i += 6) {
  await Promise.all(
    games.slice(i, i + 6).map(async (g) => {
      try {
        out[g.bggId] = await info(g.bggId)
      } catch (e) {
        failed.push(`${g.title}: ${e.message}`)
      }
    }),
  )
}

await fs.writeFile(OUT, JSON.stringify(out, null, 1) + '\n')
console.log(`info: ${Object.keys(out).length}/${games.length}`)
if (failed.length) console.log('failed:', failed)
