import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth'
import { addToShelf, fetchGame, removeFromShelf, useShelf, type Game, type Range } from '../games'
import { formatDate, standings, usePlays } from '../plays'
import FixSpine from './FixSpine'
import LogPlay from './LogPlay'
import { TopBar } from './Shelf'

const span = (r: Range | undefined, unit = '') => {
  if (!r?.min) return null
  return r.max && r.max !== r.min ? `${r.min}–${r.max}${unit}` : `${r.min}${unit}`
}
const WEIGHTS = ['Light', 'Medium light', 'Medium', 'Medium heavy', 'Heavy']
const weightLabel = (w: number) => WEIGHTS[Math.min(4, Math.max(0, Math.round(w) - 1))]

function Fact({ label, value, sub }: { label: string; value: string | null; sub?: string | null }) {
  if (!value) return null
  return (
    <div className="rounded-xl bg-white/5 px-4 py-3">
      <p className="text-[11px] tracking-wider text-white/40 uppercase">{label}</p>
      <p className="mt-0.5 text-xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-white/45">{sub}</p>}
    </div>
  )
}

function Credits({ label, items = [] }: { label: string; items?: string[] }) {
  if (!items.length) return null
  return (
    <div>
      <dt className="text-[11px] tracking-wider text-white/40 uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm">{items.join(', ')}</dd>
    </div>
  )
}

function Chips({ label, items = [] }: { label: string; items?: string[] }) {
  if (!items.length) return null
  return (
    <div>
      <p className="mb-2 text-[11px] tracking-wider text-white/40 uppercase">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((i) => (
          <span key={i} className="rounded-full bg-purple-500/15 px-2.5 py-1 text-xs text-purple-100/90">
            {i}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Game nights for this game on one person's shelf. */
function GameNights({ game, ownerId, mine }: { game: Game; ownerId: string; mine: boolean }) {
  const { plays: allPlays, addPlay, deletePlay } = usePlays(ownerId)
  const [logging, setLogging] = useState(false)
  const plays = allPlays.filter((p) => p.bggId === game.bggId)
  const table = standings(plays)
  const champ = table[0]?.wins ? table.filter((s) => s.wins === table[0].wins).map((s) => s.name).join(' & ') : '—'

  async function remove(id: string) {
    if (!confirm('Delete this play?')) return
    try {
      await deletePlay(id)
    } catch (e) {
      alert((e as Error).message)
    }
  }

  return (
    <>
      <div className="mt-12 mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Game nights</h2>
        {mine && (
          <button onClick={() => setLogging(true)} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold hover:bg-purple-500">
            Log a play
          </button>
        )}
      </div>
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ['Plays', String(plays.length)],
          ['Last played', plays[0] ? formatDate(plays[0].date) : '—'],
          ['Top winner', champ],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white/5 p-5">
            <p className="text-xs tracking-wider text-white/40 uppercase">{label}</p>
            <p className="mt-1 truncate text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      {plays.length === 0 ? (
        <section className="mt-4 rounded-xl bg-white/5 p-6 text-center text-white/50">
          No plays logged yet.{mine && ' Log the first game night to start the leaderboard.'}
        </section>
      ) : (
        <div className="mt-4 grid gap-6 md:grid-cols-[1fr_280px]">
          <ul className="space-y-2">
            {plays.map((p) => (
              <li key={p.id} className="group flex items-start gap-3 rounded-lg bg-white/5 px-4 py-3 text-sm">
                <div className="flex-1">
                  <p className="text-white/40">{formatDate(p.date)}</p>
                  <p>
                    {p.players.map((n, i) => (
                      <span key={n} className={p.winners.includes(n) ? 'font-semibold text-amber-200' : 'text-white/70'}>
                        {i > 0 && ', '}
                        {p.winners.includes(n) && '🏆 '}
                        {n}
                      </span>
                    ))}
                  </p>
                  {p.notes && <p className="mt-1 text-white/50 italic">{p.notes}</p>}
                </div>
                {mine && (
                  <button onClick={() => remove(p.id)} className="text-xs text-white/30 opacity-0 group-hover:opacity-100 hover:text-red-300 focus:opacity-100">
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
          <aside className="rounded-xl bg-white/5 p-4 text-sm">
            <p className="mb-2 text-[11px] tracking-wider text-white/40 uppercase">This game's standings</p>
            {table.map((s) => (
              <div key={s.name} className="flex justify-between py-1">
                <span>{s.name}</span>
                <span className="text-white/60">
                  <b className="text-white">{s.wins}</b> / {s.played}
                </span>
              </div>
            ))}
          </aside>
        </div>
      )}
      {logging && <LogPlay game={game} plays={allPlays} onSave={addPlay} onClose={() => setLogging(false)} />}
    </>
  )
}

export default function GamePage() {
  const { username, id } = useParams()
  const bggId = Number(id)
  const { profile, signIn } = useAuth()
  const shelf = useShelf(username)
  const myShelf = useShelf(profile?.username)
  const [game, setGame] = useState<Game | null | undefined>(undefined)
  const [fullText, setFullText] = useState(false)
  const [fixing, setFixing] = useState(false)

  useEffect(() => {
    scrollTo(0, 0)
    setFullText(false)
    fetchGame(bggId).then(setGame)
  }, [bggId])

  if (game === undefined) return null
  if (!game) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-white/60">That game isn't in the library.</p>
        <Link to="/library" className="mt-4 inline-block text-purple-300 underline">Browse the library</Link>
      </main>
    )
  }

  const info = game.info
  const about = info.description ?? []
  const shownAbout = fullText ? about : about.slice(0, 2)
  const owner = username ? shelf.owner : null
  const mine = !!owner && owner.id === profile?.id
  const onMyShelf = myShelf.games.some((g) => g.bggId === game.bggId)

  async function toggleShelf() {
    if (!profile) return signIn()
    if (onMyShelf) await removeFromShelf(profile.id, game!.bggId)
    else await addToShelf(profile.id, game!.bggId)
    await myShelf.reload()
  }

  return (
    <main className="relative min-h-screen animate-[page-in_.6s_ease-out] overflow-hidden">
      {/* blurred cover as page atmosphere */}
      {game.coverUrl && <img src={game.coverUrl} alt="" className="absolute inset-0 -z-10 h-full w-full scale-110 object-cover opacity-25 blur-3xl" />}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-[#0d0a14]/80 to-[#0d0a14]" />

      <div className="mx-auto max-w-5xl px-4 py-6">
        <TopBar />
        <Link to={owner ? `/u/${owner.username}` : '/library'} className="mt-6 inline-block text-sm text-purple-300/80 hover:text-purple-200">
          ← {owner ? (mine ? 'Back to my shelf' : `Back to ${owner.display_name}'s shelf`) : 'Back to the library'}
        </Link>

        <section className="mt-6 flex flex-col gap-8 sm:flex-row sm:items-end">
          {game.coverUrl && <img src={game.coverUrl} alt={`${game.title} box cover`} className="w-56 shrink-0 rounded-md shadow-2xl shadow-black/60 sm:w-72" />}
          <div>
            <p className="text-sm text-white/50">
              {game.year}
              {info.expands?.length ? ` · Expansion for ${info.expands.join(', ')}` : ''}
            </p>
            <h1 className="text-4xl font-bold sm:text-5xl">{game.title}</h1>
            {info.tagline && <p className="mt-2 max-w-xl text-white/70">{info.tagline}</p>}
            <div className="mt-5 flex flex-wrap gap-3">
              {!mine && (
                <button onClick={toggleShelf} className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15">
                  {onMyShelf ? '✓ On my shelf' : '+ Add to my shelf'}
                </button>
              )}
              <a
                href={`https://boardgamegeek.com/boardgame/${game.bggId}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
              >
                BoardGameGeek ↗
              </a>
              {profile && game.coverUrl && (
                <button onClick={() => setFixing(true)} className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15">
                  Fix spine
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Fact label="Players" value={span(info.players)} sub={span(info.bestPlayers) && `Best with ${span(info.bestPlayers)}`} />
          <Fact label="Play time" value={span(info.playTime, ' min')} />
          <Fact label="Age" value={info.minAge ? `${info.minAge}+` : null} sub={info.communityAge && `Players say ${info.communityAge}`} />
          <Fact label="Complexity" value={info.weight ? `${Number(info.weight).toFixed(1)} / 5` : null} sub={info.weight ? weightLabel(info.weight) : null} />
          <Fact label="BGG rating" value={info.rating ? Number(info.rating).toFixed(1) : null} sub={info.ratings ? `${info.ratings.toLocaleString()} ratings` : null} />
          <Fact label="BGG rank" value={info.rank ? `#${info.rank.toLocaleString()}` : null} sub="Overall" />
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <h2 className="mb-3 text-lg font-semibold">About</h2>
            <div className="space-y-3 leading-relaxed text-white/75">
              {shownAbout.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {about.length > 2 && (
              <button onClick={() => setFullText((v) => !v)} className="mt-3 text-sm text-purple-300 hover:text-purple-200">
                {fullText ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>

          <aside className="space-y-5 rounded-xl bg-white/5 p-5">
            <dl className="space-y-3">
              <Credits label="Designer" items={info.designers} />
              <Credits label="Artist" items={info.artists} />
              <Credits label="Publisher" items={info.publishers} />
              {info.languageDependence && <Credits label="Language" items={[info.languageDependence]} />}
            </dl>
            <Chips label="Type" items={info.types} />
            <Chips label="Categories" items={info.categories} />
            <Chips label="Mechanics" items={info.mechanics} />
          </aside>
        </section>

        {owner && <GameNights game={game} ownerId={owner.id} mine={mine} />}
      </div>
      {fixing && <FixSpine game={game} onClose={() => setFixing(false)} />}
    </main>
  )
}
