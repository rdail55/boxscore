import { useState } from 'react'
import type { Game } from '../games'
import { knownPlayers, readPasscode, savePasscode, usePlays } from '../plays'

const today = () => new Date().toLocaleDateString('en-CA') // yyyy-mm-dd, local time

export default function LogPlay({ game, onClose }: { game: Game; onClose: () => void }) {
  const { plays, addPlay } = usePlays()
  const [date, setDate] = useState(today)
  const [players, setPlayers] = useState<string[]>([])
  const [winners, setWinners] = useState<string[]>([])
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [passcode, setPasscode] = useState(readPasscode)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const suggestions = knownPlayers(plays).filter((p) => !players.includes(p))

  const addPlayer = (raw: string) => {
    const n = raw.trim().replace(/,/g, '')
    if (n && !players.some((p) => p.toLowerCase() === n.toLowerCase())) setPlayers([...players, n])
    setName('')
  }
  const removePlayer = (n: string) => {
    setPlayers(players.filter((p) => p !== n))
    setWinners(winners.filter((w) => w !== n))
  }
  const toggleWinner = (n: string) => setWinners(winners.includes(n) ? winners.filter((w) => w !== n) : [...winners, n])

  const canSave = players.length > 0 && winners.length > 0 && passcode && !saving

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      await addPlay({ date, bggId: game.bggId, game: game.title, players, winners, notes: notes.trim() }, passcode)
      savePasscode(passcode)
      onClose()
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-[#1a1224] p-6 shadow-2xl"
      >
        <h2 className="text-xl font-semibold">Log a play</h2>
        <p className="text-sm text-white/50">{game.title}</p>

        <label className="mt-5 block text-xs tracking-wider text-white/40 uppercase">
          Date
          <input
            type="date"
            value={date}
            max={today()}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block w-full rounded-lg bg-white/5 px-3 py-2 text-base text-white normal-case [color-scheme:dark]"
          />
        </label>

        <div className="mt-5">
          <p className="text-xs tracking-wider text-white/40 uppercase">Who played?</p>
          <div className="mt-1 flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addPlayer(name)
                }
              }}
              placeholder="Add a player"
              className="min-w-0 flex-1 rounded-lg bg-white/5 px-3 py-2 outline-none placeholder:text-white/30 focus:bg-white/10"
            />
            <button type="button" onClick={() => addPlayer(name)} className="rounded-lg bg-white/10 px-3 text-sm hover:bg-white/15">
              Add
            </button>
          </div>
          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.slice(0, 12).map((s) => (
                <button key={s} type="button" onClick={() => addPlayer(s)} className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-white/70 hover:bg-white/10">
                  + {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {players.length > 0 && (
          <div className="mt-5">
            <p className="text-xs tracking-wider text-white/40 uppercase">Who won? <span className="normal-case">(tap; ties allowed)</span></p>
            <ul className="mt-2 space-y-1.5">
              {players.map((p) => {
                const won = winners.includes(p)
                return (
                  <li key={p} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleWinner(p)}
                      aria-pressed={won}
                      className={`flex flex-1 items-center justify-between rounded-lg px-3 py-2 text-left ${won ? 'bg-amber-400/20 text-amber-100' : 'bg-white/5'}`}
                    >
                      {p}
                      <span>{won ? '🏆 Winner' : ''}</span>
                    </button>
                    <button type="button" onClick={() => removePlayer(p)} aria-label={`Remove ${p}`} className="px-2 text-white/40 hover:text-white">
                      ✕
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <label className="mt-5 block text-xs tracking-wider text-white/40 uppercase">
          Notes <span className="normal-case">(optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 block w-full rounded-lg bg-white/5 px-3 py-2 text-base text-white normal-case outline-none focus:bg-white/10"
          />
        </label>

        <label className="mt-5 block text-xs tracking-wider text-white/40 uppercase">
          Passcode
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="mt-1 block w-full rounded-lg bg-white/5 px-3 py-2 text-base text-white outline-none focus:bg-white/10"
          />
        </label>

        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-white/60 hover:text-white">
            Cancel
          </button>
          <button disabled={!canSave} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold hover:bg-purple-500 disabled:opacity-40">
            {saving ? 'Saving…' : 'Save play'}
          </button>
        </div>
      </form>
    </div>
  )
}
