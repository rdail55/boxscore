import { useState } from 'react'
import { games } from '../games'
import Shelf, { Nav, type ShelfProps } from './Shelf'

export default function ShelfPage({ pulledId, onPull }: ShelfProps) {
  const [query, setQuery] = useState('')
  const shown = games.filter((g) => g.title.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <Nav />
      <header className="mt-6 mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Travis's Shelf</h1>
          <p className="text-sm text-white/50">{games.length} games · pick one off the shelf</p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a game…"
          className="w-56 rounded-lg bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:bg-white/10"
        />
      </header>
      <Shelf games={shown} pulledId={pulledId} onPull={onPull} empty={`No games match “${query}”.`} />
    </main>
  )
}
