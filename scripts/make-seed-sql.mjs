// Writes supabase/migrations/0003_seed_games.sql: the shared catalog rows for
// every game in the bundled collection (info + generated spines).
// Usage: node scripts/make-seed-sql.mjs
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const games = JSON.parse(await fs.readFile(path.join(ROOT, 'src/data/travis-collection.json'), 'utf8'))
const info = JSON.parse(await fs.readFile(path.join(ROOT, 'src/data/game-info.json'), 'utf8'))

const text = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const rows = games.map((g) =>
  `(${g.bggId}, ${text(g.title)}, ${g.year ?? 'null'}, ${text(g.coverUrl)}, ${text(g.thumbUrl)}, ${text(`/spines/${g.bggId}.webp`)}, ${g.spineWidth}, $json$${JSON.stringify(info[g.bggId] ?? {})}$json$::jsonb)`,
)

const sql = `-- Shared catalog: Travis's original 113 games with their hand-tuned spines.
insert into public.games (bgg_id, title, year, cover_url, thumb_url, spine_url, spine_width, info) values
${rows.join(',\n')}
on conflict (bgg_id) do update set
  title = excluded.title, year = excluded.year, cover_url = excluded.cover_url, thumb_url = excluded.thumb_url,
  spine_url = excluded.spine_url, spine_width = excluded.spine_width, info = excluded.info, updated_at = now();
`
await fs.writeFile(path.join(ROOT, 'supabase/migrations/0003_seed_games.sql'), sql)
console.log(`seed: ${rows.length} games, ${(sql.length / 1024).toFixed(0)} KB`)
