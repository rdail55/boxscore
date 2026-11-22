// Builds the starting inventory: the ~1,000 best-known board games, picked
// from Wikidata (free, open) by how many Wikipedia languages cover them (published
// games only), with
// their BoardGameGeek ids. Writes scripts/inventory.json; import it with the
// add_bgg_game function (see the inventory import notes in README).
// Usage: node scripts/inventory-list.mjs [count]
import fs from 'node:fs/promises'
import path from 'node:path'

const COUNT = Number(process.argv[2] ?? 1000)
const QUERY = `
SELECT ?bgg ?label ?links WHERE {
  ?game wdt:P2339 ?bgg ; wikibase:sitelinks ?links .
  # Published games only: a designer, a publisher or a 20th-century-or-later
  # date. Skips chess, poker and other traditional games.
  FILTER (EXISTS { ?game wdt:P287 [] } || EXISTS { ?game wdt:P123 [] } ||
          EXISTS { ?game wdt:P577|wdt:P571 ?d FILTER(YEAR(?d) >= 1900) })
  OPTIONAL { ?game rdfs:label ?label FILTER(LANG(?label) = "en") }
}
ORDER BY DESC(?links)
LIMIT ${COUNT * 2}`

const res = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(QUERY)}`, {
  headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'BoxScore/1.0 (boxscore.2guysandabusiness.com)' },
})
if (!res.ok) throw new Error(`wikidata ${res.status}`)
const rows = (await res.json()).results.bindings

const seen = new Set()
const games = []
for (const r of rows) {
  const id = Number(r.bgg.value)
  if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue
  seen.add(id)
  games.push({ bggId: id, title: r.label?.value ?? null, wikipediaLanguages: Number(r.links.value) })
  if (games.length === COUNT) break
}

await fs.writeFile(path.join(import.meta.dirname, 'inventory.json'), JSON.stringify(games, null, 1) + '\n')
console.log(`inventory: ${games.length} games`)
console.log(games.slice(0, 15).map((g) => g.title).join(', '))
