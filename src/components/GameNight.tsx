import { useEffect, useRef, useState } from 'react'
import gameInfo from '../data/game-info.json'
import { games, type Game } from '../games'
import Shelf, { Nav, type ShelfProps } from './Shelf'

type Info = {
  players: { min: number | null; max: number | null }
  playTime: { min: number | null; max: number | null }
  weight: number | null
  mechanics: string[]
  categories: string[]
  types: string[]
}
const info = gameInfo as unknown as Record<string, Info>

type Option = { id: string; label: string; hint: string; icon: string; test: (i: Info) => boolean }

const overlaps = (r: { min: number | null; max: number | null }, lo: number, hi: number) => {
  const min = r.min ?? r.max
  const max = r.max ?? r.min
  return min != null && max != null && min <= hi && max >= lo
}
const isCoop = (i: Info) => i.mechanics.includes('Cooperative Game')
const isParty = (i: Info) => i.types.includes('Party Games') || i.categories.includes('Party Game')
// A game's typical length: the top of its box range.
const length = (i: Info) => i.playTime.max ?? i.playTime.min ?? 0

const SECTIONS: { id: string; title: string; options: Option[] }[] = [
  {
    id: 'vibe',
    title: 'What kind of night?',
    options: [
      { id: 'relaxed', label: 'Relaxed', hint: 'Easy to learn, low brain burn', icon: '🛋️', test: (i) => (i.weight ?? 5) < 2 },
      { id: 'coop', label: 'Co-op', hint: 'Everyone on the same team', icon: '🤝', test: isCoop },
      { id: 'competitive', label: 'Competitive', hint: 'One winner takes it', icon: '⚔️', test: (i) => !isCoop(i) },
      { id: 'party', label: 'Party', hint: 'Loud, social, big groups', icon: '🎉', test: isParty },
    ],
  },
  {
    id: 'time',
    title: 'How much time?',
    options: [
      { id: 'quick', label: 'Quick', hint: 'Under 30 min', icon: '⚡', test: (i) => length(i) > 0 && length(i) < 30 },
      { id: 'short', label: 'Short', hint: '30–60 min', icon: '⏱️', test: (i) => length(i) >= 30 && length(i) <= 60 },
      { id: 'evening', label: 'Evening', hint: '1–1½ hours', icon: '🌙', test: (i) => length(i) > 60 && length(i) <= 90 },
      { id: 'epic', label: 'Epic', hint: '90+ min', icon: '🏔️', test: (i) => length(i) > 90 },
    ],
  },
  {
    id: 'players',
    title: 'How many players?',
    options: [
      { id: '2', label: '2', hint: 'Head to head', icon: '👥', test: (i) => overlaps(i.players, 2, 2) },
      { id: '3-4', label: '3–4', hint: 'Small table', icon: '🎲', test: (i) => overlaps(i.players, 3, 4) },
      { id: '5-6', label: '5–6', hint: 'Full table', icon: '🍕', test: (i) => overlaps(i.players, 5, 6) },
      { id: '7+', label: '7+', hint: 'The whole crew', icon: '🎊', test: (i) => overlaps(i.players, 7, 99) },
    ],
  },
]

type Picks = Record<string, string | undefined>

const matches = (g: Game, picks: Picks) =>
  SECTIONS.every((s) => {
    const opt = s.options.find((o) => o.id === picks[s.id])
    return !opt || (info[g.bggId] && opt.test(info[g.bggId]))
  })

export default function GameNight({ pulledId, onPull }: ShelfProps) {
  const [picks, setPicks] = useState<Picks>({})
  const [litId, setLitId] = useState<number>()
  const [choosing, setChoosing] = useState(false)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const shown = games.filter((g) => matches(g, picks))
  const anyPicked = Object.values(picks).some(Boolean)

  const toggle = (section: string, option: string) => setPicks((p) => ({ ...p, [section]: p[section] === option ? undefined : option }))

  // Spotlight hops along the shelf, slowing down, then the winner comes off the shelf.
  function chooseForMe() {
    if (!shown.length || choosing) return
    setChoosing(true)
    const winner = shown[Math.floor(Math.random() * shown.length)]
    const hops = Math.min(16, shown.length * 2)
    let t = 0
    for (let i = 0; i < hops; i++) {
      t += 60 + i * i * 2.2
      const g = i === hops - 1 ? winner : shown[Math.floor(Math.random() * shown.length)]
      timers.current.push(window.setTimeout(() => setLitId(g.bggId), t))
    }
    timers.current.push(
      window.setTimeout(() => {
        document.querySelector(`[data-spine="${winner.bggId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, t + 100),
      window.setTimeout(() => {
        const el = document.querySelector(`[data-spine="${winner.bggId}"]`)
        setLitId(undefined)
        setChoosing(false)
        if (el) onPull({ game: winner, rect: el.getBoundingClientRect() })
      }, t + 900),
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <Nav />
      <header className="mt-6">
        <h1 className="text-3xl font-bold">Game Night</h1>
        <p className="text-sm text-white/50">Pick a vibe, a time and a headcount. Skip any you don't care about.</p>
      </header>

      <div className="mt-6 space-y-6">
        {SECTIONS.map((s) => (
          <section key={s.id}>
            <h2 className="mb-2 text-sm font-semibold text-white/70">{s.title}</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {s.options.map((o) => {
                const on = picks[s.id] === o.id
                return (
                  <button
                    key={o.id}
                    onClick={() => toggle(s.id, o.id)}
                    aria-pressed={on}
                    className={`rounded-xl border p-4 text-left transition ${
                      on ? 'border-purple-400 bg-purple-600/30 shadow-[0_0_0_1px_rgba(192,132,252,.6)]' : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-2xl">{o.icon}</span>
                    <p className="mt-1 text-lg font-semibold">{o.label}</p>
                    <p className="text-xs text-white/50">{o.hint}</p>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="sticky top-0 z-10 -mx-4 mt-8 mb-4 flex flex-wrap items-center justify-between gap-3 bg-[#0d0a14]/90 px-4 py-3 backdrop-blur">
        <p className="text-sm text-white/60">
          <b className="text-lg text-white">{shown.length}</b> {shown.length === 1 ? 'game fits' : 'games fit'}
          {anyPicked && (
            <button onClick={() => setPicks({})} className="ml-3 text-purple-300 hover:text-purple-200">
              Clear
            </button>
          )}
        </p>
        <button
          onClick={chooseForMe}
          disabled={!shown.length || choosing}
          className="rounded-xl bg-amber-400 px-5 py-2.5 font-semibold text-black shadow-lg shadow-amber-400/20 hover:bg-amber-300 disabled:opacity-40"
        >
          🎲 {choosing ? 'Choosing…' : 'Choose for me'}
        </button>
      </div>

      <Shelf games={shown} pulledId={pulledId} litId={litId} onPull={onPull} empty="Nothing on the shelf fits all of that. Try loosening one choice." />
    </main>
  )
}
