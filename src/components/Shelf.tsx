import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../auth'
import { SHELF_H, useSpines, type Game } from '../games'
import type { RevealStart } from './BoxReveal'

export type ShelfProps = { base: string; pulledId?: number; onPull: (r: RevealStart) => void }

/** The side of a box: a hand-made spine image, or one built from the cover. */
export function SpineFace({ game, height = SHELF_H }: { game: Game; height?: number }) {
  if (game.spineUrl) return <img src={game.spineUrl} alt="" className="h-full w-full" />
  // Placeholder until the spine job makes a real one: the title on a plain box side.
  const w = game.spineWidth * (height / SHELF_H)
  return (
    <div className="flex h-full w-full flex-col items-center bg-gradient-to-b from-[#3a2d48] to-[#221a2c] py-2">
      <span
        className="flex-1 overflow-hidden text-center leading-tight font-bold text-white/90 [writing-mode:vertical-rl]"
        style={{ fontSize: Math.max(11, Math.min(17, w * 0.34)) }}
      >
        {game.title}
      </span>
      {game.thumbUrl && <img src={game.thumbUrl} alt="" className="mt-2 rounded-sm object-cover" style={{ width: w * 0.7, height: w * 0.7 }} />}
    </div>
  )
}

function Spine({ game, base, pulled, lit, onPull }: { game: Game; base: string; pulled: boolean; lit: boolean; onPull: ShelfProps['onPull'] }) {
  return (
    <button
      data-spine={game.bggId}
      onClick={(e) => onPull({ game, rect: e.currentTarget.getBoundingClientRect(), to: `${base}/game/${game.bggId}` })}
      title={game.title}
      aria-label={`Open ${game.title}`}
      className={`relative shrink-0 overflow-hidden rounded-[2px] transition-transform duration-200 hover:-translate-y-3 focus-visible:-translate-y-3 focus-visible:outline-2 focus-visible:outline-purple-400 ${
        lit ? '-translate-y-4 shadow-[0_0_24px_rgba(252,211,77,.6)] ring-2 ring-amber-300' : ''
      }`}
      style={{ width: game.spineWidth, height: SHELF_H, visibility: pulled ? 'hidden' : undefined }}
    >
      <SpineFace game={game} />
      {/* Box-edge shading so each spine reads as a rounded cardboard side */}
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.45),rgba(255,255,255,.08)_18%,transparent_40%,transparent_75%,rgba(0,0,0,.4))]" />
      <span className="pointer-events-none absolute inset-0 shadow-[inset_0_2px_0_rgba(255,255,255,.18),inset_0_-3px_0_rgba(0,0,0,.35)]" />
    </button>
  )
}

export default function Shelf({ games: raw, base, pulledId, litId, onPull, empty }: ShelfProps & { games: Game[]; litId?: number; empty: React.ReactNode }) {
  const games = useSpines(raw)
  return (
    <div className="flex flex-wrap items-end gap-y-10 rounded-xl bg-[#1a1224] px-4 pt-6">
      {games.map((g) => (
        <div key={g.bggId} className="border-b-[14px] border-[#3b2a1d] pr-[3px] shadow-[0_14px_18px_-10px_rgba(0,0,0,.8)]">
          <Spine game={g} base={base} pulled={g.bggId === pulledId} lit={g.bggId === litId} onPull={onPull} />
        </div>
      ))}
      {!games.length && <div className="pb-6 text-white/40">{empty}</div>}
    </div>
  )
}

/** Site-wide top bar. */
export function TopBar() {
  const { ready, profile, signIn, signOut } = useAuth()
  const link = ({ isActive }: { isActive: boolean }) => `text-sm ${isActive ? 'text-white' : 'text-white/55 hover:text-white'}`
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link to="/" className="text-xs font-semibold tracking-[.3em] text-purple-300/80 uppercase">
        BoxScore
      </Link>
      <div className="flex items-center gap-4">
        {profile && (
          <NavLink to={`/u/${profile.username}`} className={link}>
            My shelf
          </NavLink>
        )}
        <NavLink to="/library" className={link}>
          Library
        </NavLink>
        {profile && (
          <NavLink to="/settings" className={link}>
            Settings
          </NavLink>
        )}
        {ready &&
          (profile ? (
            <button onClick={signOut} title="Sign out" className="flex items-center gap-2 text-sm text-white/55 hover:text-white">
              {profile.avatar_url && <img src={profile.avatar_url} alt="" referrerPolicy="no-referrer" className="size-7 rounded-full" />}
              Sign out
            </button>
          ) : (
            <button onClick={signIn} className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-black hover:bg-white/90">
              Sign in with Google
            </button>
          ))}
      </div>
    </div>
  )
}

/** Tabs for one user's shelf. */
export function ShelfTabs({ base, name }: { base: string; name: string }) {
  const tab = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-1.5 text-sm ${isActive ? 'bg-purple-600 text-white' : 'text-white/60 hover:text-white'}`
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-white/50">{name}</p>
      <nav className="flex rounded-lg bg-white/5 p-1">
        <NavLink to={base} end className={tab}>
          Shelf
        </NavLink>
        <NavLink to={`${base}/game-night`} className={tab}>
          Game Night
        </NavLink>
        <NavLink to={`${base}/leaderboard`} className={tab}>
          Leaderboard
        </NavLink>
      </nav>
    </div>
  )
}
