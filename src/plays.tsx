import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

// Plays live in a Google Sheet behind an Apps Script web app (google-sheet/).
export type Play = {
  id: string
  date: string // yyyy-mm-dd
  bggId: number
  game: string
  players: string[]
  winners: string[]
  notes: string
}
export type NewPlay = Omit<Play, 'id'>

const URL = import.meta.env.VITE_PLAYS_URL as string | undefined
const PASSCODE_KEY = 'boxscore.passcode'

export const readPasscode = () => {
  try {
    return localStorage.getItem(PASSCODE_KEY) ?? ''
  } catch {
    return ''
  }
}
export const savePasscode = (code: string) => {
  try {
    localStorage.setItem(PASSCODE_KEY, code)
  } catch {
    /* private mode: ask again next time */
  }
}

// Rows typed straight into the sheet may come back as Sheets dates
// (e.g. "11/21/2026" or a full Date string); normalise to yyyy-mm-dd.
function isoDate(d: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  const parsed = new Date(d)
  return isNaN(+parsed) ? d : parsed.toLocaleDateString('en-CA')
}

async function post(body: object) {
  if (!URL) throw new Error('Play log is not connected yet')
  // text/plain avoids a CORS preflight, which Apps Script can't answer.
  const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error ?? 'Saving failed')
  return data
}

type Store = {
  connected: boolean
  loading: boolean
  error: string | null
  plays: Play[]
  addPlay: (play: NewPlay, passcode: string) => Promise<void>
  deletePlay: (id: string, passcode: string) => Promise<void>
  refresh: () => Promise<void>
}

const PlaysContext = createContext<Store | null>(null)

export function PlaysProvider({ children }: { children: ReactNode }) {
  const [plays, setPlays] = useState<Play[]>([])
  const [loading, setLoading] = useState(Boolean(URL))
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!URL) return
    setLoading(true)
    try {
      const data = await (await fetch(URL)).json()
      setPlays(data.plays.map((p: Play) => ({ ...p, date: isoDate(p.date) })))
      setError(null)
    } catch {
      setError("Couldn't load plays from the sheet")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addPlay = useCallback(async (play: NewPlay, passcode: string) => {
    const { id } = await post({ play, passcode })
    setPlays((ps) => [...ps, { ...play, id }])
  }, [])

  const deletePlay = useCallback(async (id: string, passcode: string) => {
    await post({ action: 'delete', id, passcode })
    setPlays((ps) => ps.filter((p) => p.id !== id))
  }, [])

  const value = useMemo(
    () => ({ connected: Boolean(URL), loading, error, plays, addPlay, deletePlay, refresh }),
    [loading, error, plays, addPlay, deletePlay, refresh],
  )
  return <PlaysContext.Provider value={value}>{children}</PlaysContext.Provider>
}

export function usePlays() {
  const store = useContext(PlaysContext)
  if (!store) throw new Error('usePlays needs PlaysProvider')
  return store
}

export type Standing = { name: string; wins: number; played: number }

export function standings(plays: Play[]): Standing[] {
  const table = new Map<string, Standing>()
  for (const p of plays) {
    for (const name of p.players) {
      const row = table.get(name) ?? { name, wins: 0, played: 0 }
      row.played++
      if (p.winners.includes(name)) row.wins++
      table.set(name, row)
    }
  }
  return [...table.values()].sort((a, b) => b.wins - a.wins || a.played - b.played || a.name.localeCompare(b.name))
}

export const knownPlayers = (plays: Play[]) => standings(plays).sort((a, b) => b.played - a.played).map((s) => s.name)

export const formatDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
