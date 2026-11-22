import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth'
import { useShelf } from '../games'
import Shelf, { ShelfTabs, TopBar, type ShelfProps } from './Shelf'

type PullProps = Omit<ShelfProps, 'base'>

export function NoShelf({ loading }: { loading: boolean }) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <TopBar />
      <p className="mt-16 text-center text-white/50">{loading ? 'Loading shelf…' : "There's no shelf with that name."}</p>
    </main>
  )
}

export default function ShelfPage({ pulledId, onPull }: PullProps) {
  const { username } = useParams()
  const { profile } = useAuth()
  const { loading, owner, games } = useShelf(username)
  const [query, setQuery] = useState('')
  if (!owner) return <NoShelf loading={loading} />

  const mine = profile?.id === owner.id
  const base = `/u/${owner.username}`
  const shown = games.filter((g) => g.title.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <TopBar />
      <ShelfTabs base={base} name={mine ? 'Your shelf' : `${owner.display_name}'s shelf`} />
      <header className="mt-4 mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{mine ? 'My Shelf' : `${owner.display_name}'s Shelf`}</h1>
          <p className="text-sm text-white/50">
            {games.length} {games.length === 1 ? 'game' : 'games'}
            {games.length > 0 && ' · pick one off the shelf'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {mine && (
            <Link to="/library" className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold hover:bg-purple-500">
              + Add games
            </Link>
          )}
          {games.length > 8 && (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a game…"
              className="w-48 rounded-lg bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:bg-white/10"
            />
          )}
        </div>
      </header>
      <Shelf
        games={shown}
        base={base}
        pulledId={pulledId}
        onPull={onPull}
        empty={
          query ? (
            `No games match “${query}”.`
          ) : mine ? (
            <span>
              Your shelf is empty. <Link to="/library" className="text-purple-300 underline">Add your first games</Link>.
            </span>
          ) : (
            'This shelf is empty.'
          )
        }
      />
    </main>
  )
}
