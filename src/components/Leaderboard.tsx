import { Link, useParams } from 'react-router-dom'
import { useShelf } from '../games'
import { formatDate, standings, usePlays } from '../plays'
import { ShelfTabs, TopBar } from './Shelf'
import { NoShelf } from './ShelfPage'

export default function Leaderboard() {
  const { username } = useParams()
  const { loading, owner, games } = useShelf(username)
  const { plays } = usePlays(owner?.id)
  if (!owner) return <NoShelf loading={loading} />
  const base = `/u/${owner.username}`
  const gameById = (id: number) => games.find((g) => g.bggId === id)
  const table = standings(plays)
  const recent = [...plays].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)
  const byGame = new Map<number, number>()
  plays.forEach((p) => byGame.set(p.bggId, (byGame.get(p.bggId) ?? 0) + 1))
  const topGames = [...byGame].sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <TopBar />
      <ShelfTabs base={base} name={`${owner.display_name}'s shelf`} />
      <h1 className="mt-4 text-3xl font-bold">Leaderboard</h1>
      <p className="text-sm text-white/50">{plays.length} {plays.length === 1 ? "play" : "plays"} logged</p>

      <section className="mt-6 overflow-hidden rounded-xl bg-white/5">
        <table className="w-full text-left">
          <thead className="text-[11px] tracking-wider text-white/40 uppercase">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3 text-right">Wins</th>
              <th className="px-4 py-3 text-right">Played</th>
              <th className="hidden px-4 py-3 text-right sm:table-cell">Win rate</th>
            </tr>
          </thead>
          <tbody>
            {table.map((s, i) => (
              <tr key={s.name} className="border-t border-white/5">
                <td className="px-4 py-3 text-white/50">{i === 0 ? '🏆' : i + 1}</td>
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-right text-lg font-semibold">{s.wins}</td>
                <td className="px-4 py-3 text-right">{s.played}</td>
                <td className="hidden px-4 py-3 text-right text-white/60 sm:table-cell">{Math.round((s.wins / s.played) * 100)}%</td>
              </tr>
            ))}
            {!table.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-white/40">No plays yet. Pick a game off the shelf and log one.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {plays.length > 0 && (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section>
            <h2 className="mb-3 text-lg font-semibold">Most played</h2>
            <ul className="space-y-2">
              {topGames.map(([id, n]) => {
                const g = gameById(id)
                return (
                  <li key={id}>
                    <Link to={`${base}/game/${id}`} className="flex items-center gap-3 rounded-lg bg-white/5 p-2 hover:bg-white/10">
                      {g?.coverUrl && <img src={g.coverUrl} alt="" className="size-10 rounded object-cover" />}
                      <span className="flex-1">{g?.title ?? id}</span>
                      <span className="pr-2 text-white/60">{n}×</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
          <section>
            <h2 className="mb-3 text-lg font-semibold">Recent plays</h2>
            <ul className="space-y-2">
              {recent.map((p) => (
                <li key={p.id} className="rounded-lg bg-white/5 px-3 py-2 text-sm">
                  <Link to={`${base}/game/${p.bggId}`} className="font-medium hover:text-purple-200">{gameById(p.bggId)?.title ?? 'Game'}</Link>
                  <span className="text-white/40"> · {formatDate(p.date)}</span>
                  <p className="text-white/60">🏆 {p.winners.join(' & ')} <span className="text-white/35">over {p.players.filter((x) => !p.winners.includes(x)).join(', ') || '—'}</span></p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </main>
  )
}
