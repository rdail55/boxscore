import { NavLink } from 'react-router-dom'
import { SHELF_H, type Game } from '../games'
import type { RevealStart } from './BoxReveal'

export type ShelfProps = { pulledId?: number; onPull: (r: RevealStart) => void }

function Spine({ game, pulled, lit, onPull }: { game: Game; pulled: boolean; lit: boolean; onPull: ShelfProps['onPull'] }) {
  return (
    <button
      data-spine={game.bggId}
      onClick={(e) => onPull({ game, rect: e.currentTarget.getBoundingClientRect() })}
      title={game.title}
      aria-label={`Open ${game.title}`}
      className={`relative shrink-0 overflow-hidden rounded-[2px] transition-transform duration-200 hover:-translate-y-3 focus-visible:-translate-y-3 focus-visible:outline-2 focus-visible:outline-purple-400 ${
        lit ? '-translate-y-4 ring-2 ring-amber-300 shadow-[0_0_24px_rgba(252,211,77,.6)]' : ''
      }`}
      style={{ width: game.spineWidth, height: SHELF_H, visibility: pulled ? 'hidden' : undefined }}
    >
      <img src={`/spines/${game.bggId}.webp`} alt="" className="h-full w-full" />
      {/* Box-edge shading so each spine reads as a rounded cardboard side */}
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.45),rgba(255,255,255,.08)_18%,transparent_40%,transparent_75%,rgba(0,0,0,.4))]" />
      <span className="pointer-events-none absolute inset-0 shadow-[inset_0_2px_0_rgba(255,255,255,.18),inset_0_-3px_0_rgba(0,0,0,.35)]" />
    </button>
  )
}

export default function Shelf({ games, pulledId, litId, onPull, empty }: ShelfProps & { games: Game[]; litId?: number; empty: string }) {
  return (
    <div className="flex flex-wrap items-end gap-y-10 rounded-xl bg-[#1a1224] px-4 pt-6">
      {games.map((g) => (
        <div key={g.bggId} className="border-b-[14px] border-[#3b2a1d] pr-[3px] shadow-[0_14px_18px_-10px_rgba(0,0,0,.8)]">
          <Spine game={g} pulled={g.bggId === pulledId} lit={g.bggId === litId} onPull={onPull} />
        </div>
      ))}
      {!games.length && <p className="pb-6 text-white/40">{empty}</p>}
    </div>
  )
}

export function Nav() {
  const tab = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-1.5 text-sm ${isActive ? 'bg-purple-600 text-white' : 'text-white/60 hover:text-white'}`
  return (
    <nav className="flex items-center justify-between gap-4">
      <p className="text-xs font-semibold tracking-[.3em] text-purple-300/70 uppercase">BoxScore</p>
      <div className="flex rounded-lg bg-white/5 p-1">
        <NavLink to="/" end className={tab}>Shelf</NavLink>
        <NavLink to="/game-night" className={tab}>Game Night</NavLink>
        <NavLink to="/leaderboard" className={tab}>Leaderboard</NavLink>
      </div>
    </nav>
  )
}
