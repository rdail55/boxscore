import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export type Play = {
  id: string
  date: string // yyyy-mm-dd
  bggId: number
  players: string[]
  winners: string[]
  notes: string
}
export type NewPlay = Omit<Play, 'id'>

type PlayRow = {
  id: string
  bgg_id: number
  played_on: string
  notes: string
  play_players: { won: boolean; players: { name: string } }[]
}

const toPlay = (r: PlayRow): Play => ({
  id: r.id,
  date: r.played_on,
  bggId: r.bgg_id,
  notes: r.notes,
  players: r.play_players.map((pp) => pp.players.name),
  winners: r.play_players.filter((pp) => pp.won).map((pp) => pp.players.name),
})

/** Every play logged by one account. */
export function usePlays(ownerId: string | undefined) {
  const [plays, setPlays] = useState<Play[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!ownerId) return
    const { data } = await supabase
      .from('plays')
      .select('id, bgg_id, played_on, notes, play_players(won, players(name))')
      .eq('owner_id', ownerId)
      .order('played_on', { ascending: false })
    setPlays(((data ?? []) as unknown as PlayRow[]).map(toPlay))
    setLoading(false)
  }, [ownerId])

  useEffect(() => {
    load()
  }, [load])

  const addPlay = useCallback(
    async (play: NewPlay) => {
      if (!ownerId) throw new Error('Sign in to log plays')
      // Reuse this owner's existing player rows by name, creating new ones as needed.
      const { data: existing } = await supabase.from('players').select('id, name').eq('owner_id', ownerId)
      const ids = new Map((existing ?? []).map((p) => [p.name.toLowerCase(), p.id as string]))
      const missing = play.players.filter((n) => !ids.has(n.toLowerCase()))
      if (missing.length) {
        const { data, error } = await supabase
          .from('players')
          .insert(missing.map((name) => ({ owner_id: ownerId, name })))
          .select('id, name')
        if (error) throw new Error(error.message)
        data.forEach((p) => ids.set(p.name.toLowerCase(), p.id))
      }

      const { data: row, error } = await supabase
        .from('plays')
        .insert({ owner_id: ownerId, bgg_id: play.bggId, played_on: play.date, notes: play.notes })
        .select('id')
        .single()
      if (error) throw new Error(error.message)
      const { error: e2 } = await supabase.from('play_players').insert(
        play.players.map((n) => ({ play_id: row.id, player_id: ids.get(n.toLowerCase()), won: play.winners.includes(n) })),
      )
      if (e2) {
        await supabase.from('plays').delete().eq('id', row.id)
        throw new Error(e2.message)
      }
      await load()
    },
    [ownerId, load],
  )

  const deletePlay = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('plays').delete().eq('id', id)
      if (error) throw new Error(error.message)
      setPlays((ps) => ps.filter((p) => p.id !== id))
    },
    [],
  )

  return { plays, loading, addPlay, deletePlay }
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
