import { useRef, useState } from 'react'
import { fixSpine, type Game } from '../games'

type Box = { left: number; top: number; right: number; bottom: number }

/** Drag a box over the title on the cover; the spine job remakes the spine around it. */
export default function FixSpine({ game, onClose }: { game: Game; onClose: () => void }) {
  const img = useRef<HTMLImageElement>(null)
  const [start, setStart] = useState<{ x: number; y: number } | null>(null)
  const [box, setBox] = useState<Box | null>(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pointer position as 0-1 fractions of the cover image.
  const at = (e: React.PointerEvent) => {
    const r = img.current!.getBoundingClientRect()
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    }
  }
  const down = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = at(e)
    setStart(p)
    setBox({ left: p.x, top: p.y, right: p.x, bottom: p.y })
  }
  const move = (e: React.PointerEvent) => {
    if (!start) return
    const p = at(e)
    setBox({ left: Math.min(start.x, p.x), top: Math.min(start.y, p.y), right: Math.max(start.x, p.x), bottom: Math.max(start.y, p.y) })
  }
  const up = () => setStart(null)

  const usable = box && box.right - box.left > 0.03 && box.bottom - box.top > 0.02

  async function save() {
    if (!usable) return
    setSaving(true)
    setError(null)
    try {
      const round = (v: number) => Math.round(v * 1000) / 1000
      await fixSpine(game.bggId, { left: round(box.left), top: round(box.top), right: round(box.right), bottom: round(box.bottom) })
      setDone(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
      <div onClick={(e) => e.stopPropagation()} className="max-h-[95vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[#1a1224] p-6 shadow-2xl">
        <h2 className="text-xl font-semibold">Fix spine</h2>
        {done ? (
          <>
            <p className="mt-3 text-white/70">
              Thanks! The new spine for <b>{game.title}</b> will be on everyone's shelves within about 30 minutes.
            </p>
            <div className="mt-6 flex justify-end">
              <button onClick={onClose} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold hover:bg-purple-500">
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-white/55">Drag a box around the game's title on the cover. The spine is cut from that part of the box art.</p>
            <div
              className="relative mt-4 cursor-crosshair touch-none select-none"
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
            >
              <img ref={img} src={game.coverUrl ?? ''} alt={`${game.title} cover`} draggable={false} className="w-full rounded-md" />
              {box && (
                <span
                  className="pointer-events-none absolute border-2 border-amber-300 bg-amber-300/15 shadow-[0_0_0_9999px_rgba(0,0,0,.45)]"
                  style={{
                    left: `${box.left * 100}%`,
                    top: `${box.top * 100}%`,
                    width: `${(box.right - box.left) * 100}%`,
                    height: `${(box.bottom - box.top) * 100}%`,
                  }}
                />
              )}
            </div>
            {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-white/60 hover:text-white">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={!usable || saving}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold hover:bg-purple-500 disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save title box'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
