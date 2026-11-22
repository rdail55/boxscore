import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth'
import { addFromBgg, addToShelf, parseBggId, removeFromShelf, searchLibrary, useShelf, type Game } from '../games'
import { TopBar } from './Shelf'

export default function Library() {
  const { profile, signIn } = useAuth()
  const mine = useShelf(profile?.username)
  const owned = new Set(mine.games.map((g) => g.bggId))
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Game[]>([])
  const [busy, setBusy] = useState<number | 'link' | null>(null)
  const [link, setLink] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    const t = setTimeout(() => searchLibrary(query).then(setResults), 200)
    return () => clearTimeout(t)
  }, [query])

  async function toggle(g: Game) {
    if (!profile) return signIn()
    setBusy(g.bggId)
    try {
      if (owned.has(g.bggId)) await removeFromShelf(profile.id, g.bggId)
      else await addToShelf(profile.id, g.bggId)
      await mine.reload()
    } finally {
      setBusy(null)
    }
  }

  async function addLink(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return signIn()
    const id = parseBggId(link)
    if (!id) return setMessage({ ok: false, text: 'Paste a BoardGameGeek game link, like boardgamegeek.com/boardgame/266192/wingspan' })
    setBusy('link')
    setMessage(null)
    try {
      const game = await addFromBgg(id)
      await addToShelf(profile.id, game.bggId)
      await mine.reload()
      setLink('')
      setMessage({ ok: true, text: `Added ${game.title} to your shelf.` })
      searchLibrary(query).then(setResults)
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message })
    } finally {
      setBusy(null)
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <TopBar />
      <header className="mt-6">
        <h1 className="text-3xl font-bold">Library</h1>
        <p className="text-sm text-white/50">Every game anyone has put on a BoxScore shelf. Add any of them to yours.</p>
      </header>

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_380px]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the library…"
          className="rounded-xl bg-white/5 px-4 py-3 outline-none placeholder:text-white/30 focus:bg-white/10"
        />
        <form onSubmit={addLink} className="flex gap-2">
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Not here? Paste a BGG link"
            className="min-w-0 flex-1 rounded-xl bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:bg-white/10"
          />
          <button disabled={busy === 'link'} className="rounded-xl bg-purple-600 px-4 text-sm font-semibold hover:bg-purple-500 disabled:opacity-50">
            {busy === 'link' ? 'Adding…' : 'Add'}
          </button>
        </form>
      </div>
      {message && <p className={`mt-3 text-sm ${message.ok ? 'text-emerald-300' : 'text-red-300'}`}>{message.text}</p>}

      <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
        {results.map((g) => {
          const has = owned.has(g.bggId)
          return (
            <div key={g.bggId} className="group">
              <Link to={`/game/${g.bggId}`} className="flex aspect-square items-center justify-center rounded-lg bg-white/5 p-2 hover:bg-white/10">
                {g.coverUrl && <img src={g.thumbUrl ?? g.coverUrl} alt={g.title} loading="lazy" className="max-h-full max-w-full object-contain drop-shadow-lg" />}
              </Link>
              <p className="mt-2 text-sm leading-tight">
                {g.title} {g.year && <span className="text-white/40">({g.year})</span>}
              </p>
              <button
                onClick={() => toggle(g)}
                disabled={busy === g.bggId}
                className={`mt-2 w-full rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                  has ? 'bg-emerald-500/15 text-emerald-200 hover:bg-red-500/15 hover:text-red-200' : 'bg-white/10 hover:bg-purple-600'
                }`}
              >
                {has ? '✓ On your shelf' : '+ Add to shelf'}
              </button>
            </div>
          )
        })}
      </div>
      {!results.length && <p className="mt-10 text-center text-white/40">Nothing in the library matches. Paste its BGG link above to add it.</p>}
    </main>
  )
}
