import { useEffect, useState } from 'react'
import { SHELF_H, type Game } from '../games'

export type RevealStart = { game: Game; rect: DOMRect }

// Sequence: the box slides out of the shelf spine-first, turns to show its
// cover, then the lid swings open onto the game's page underneath.
type Phase = 'shelf' | 'pull' | 'turn' | 'open'
const TIMING: Record<Phase, number> = { shelf: 0, pull: 320, turn: 850, open: 750 }
const EASE = 'cubic-bezier(.2,.8,.2,1)'

function coverAspect(url: string) {
  const img = new Image()
  img.src = url
  const loaded = img.decode().then(() => img.naturalWidth / img.naturalHeight)
  const timeout = new Promise<number>((r) => setTimeout(() => r(0.75), 700))
  return Promise.race([loaded, timeout]).catch(() => 0.75)
}

export default function BoxReveal({ start, onOpen, onDone }: { start: RevealStart; onOpen: () => void; onDone: () => void }) {
  const { game, rect } = start
  const [phase, setPhase] = useState<Phase>('shelf')
  const [aspect, setAspect] = useState<number | null>(null)
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    coverAspect(game.coverUrl).then(setAspect)
  }, [game.coverUrl])

  useEffect(() => {
    if (aspect === null) return
    if (reduced) {
      onOpen()
      onDone()
      return
    }
    const steps: [Phase, number][] = [
      ['pull', 30],
      ['turn', 30 + TIMING.pull],
      ['open', 30 + TIMING.pull + TIMING.turn + 250],
    ]
    const timers = steps.map(([p, t]) => setTimeout(() => setPhase(p), t))
    const openAt = steps[2][1]
    timers.push(setTimeout(onOpen, openAt))
    timers.push(setTimeout(onDone, openAt + TIMING.open))
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspect])

  if (aspect === null || reduced) return null

  // Box size when held up in the middle of the screen.
  const H = Math.min(innerHeight * 0.66, 560)
  const W = Math.min(H * aspect, innerWidth * 0.8)
  const D = game.spineWidth * (H / SHELF_H)
  const k0 = SHELF_H / H // scale that matches the spine on the shelf

  const atShelf = phase === 'shelf' || phase === 'pull'
  const cx = atShelf ? rect.left + rect.width / 2 : innerWidth / 2
  const cy = atShelf ? rect.top + rect.height / 2 - (phase === 'pull' ? 28 : 0) : innerHeight / 2
  const k = atShelf ? k0 * (phase === 'pull' ? 1.08 : 1) : 1
  // Spine facing us = rotateY(90); push it back so that face sits on the page plane.
  const ry = atShelf ? 90 : 0
  const back = atShelf ? W / 2 : D / 2
  const tilt = phase === 'turn' ? -4 : 0

  const box: React.CSSProperties = {
    width: W,
    height: H,
    transformStyle: 'preserve-3d',
    transform: `translate3d(${cx - W / 2}px, ${cy - H / 2}px, 0) scale(${k}) translateZ(${-back}px) rotateX(${tilt}deg) rotateY(${ry}deg)`,
    transition: `transform ${TIMING[phase]}ms ${EASE}`,
  }
  const face = 'absolute backface-hidden overflow-hidden'
  const cardboard = 'bg-[#2a2030]'

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 [perspective:1600px]"
      style={{
        background: phase === 'turn' ? 'rgba(8,5,14,.82)' : 'rgba(8,5,14,0)',
        transition: `background ${phase === 'open' ? TIMING.open : 500}ms ease`,
      }}
    >
      <div
        className="absolute top-0 left-0"
        style={{ ...box, opacity: phase === 'open' ? 0 : 1, transition: `${box.transition}, opacity ${TIMING.open}ms ease-in` }}
      >
        {/* front: the cover, hinged on its left edge like a lid */}
        <div
          className={`${face} inset-0 origin-left`}
          style={{
            transform: `translateZ(${D / 2}px) rotateY(${phase === 'open' ? -110 : 0}deg)`,
            transition: `transform ${TIMING.open}ms ${EASE}`,
            boxShadow: '0 30px 60px -10px rgba(0,0,0,.7)',
          }}
        >
          <img src={game.coverUrl} alt="" className="h-full w-full object-cover" />
          <span className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,.18),transparent_35%)]" />
        </div>
        {/* left: the spine the box was pulled by */}
        <div className={`${face} top-0`} style={{ width: D, height: H, left: (W - D) / 2, transform: `rotateY(-90deg) translateZ(${W / 2}px)` }}>
          <img src={`/spines/${game.bggId}.webp`} alt="" className="h-full w-full" />
          <span className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.35),transparent_30%,transparent_70%,rgba(0,0,0,.35))]" />
        </div>
        <div className={`${face} ${cardboard} top-0`} style={{ width: D, height: H, left: (W - D) / 2, transform: `rotateY(90deg) translateZ(${W / 2}px)` }} />
        <div className={`${face} ${cardboard} inset-0`} style={{ transform: `rotateY(180deg) translateZ(${D / 2}px)` }} />
        <div className={`${face} ${cardboard} left-0`} style={{ width: W, height: D, top: (H - D) / 2, transform: `rotateX(90deg) translateZ(${H / 2}px)` }} />
        <div className={`${face} ${cardboard} left-0`} style={{ width: W, height: D, top: (H - D) / 2, transform: `rotateX(-90deg) translateZ(${H / 2}px)` }} />
      </div>
    </div>
  )
}
