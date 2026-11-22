import { useCallback, useEffect, useState } from 'react'
import type { Profile } from './auth'
import { supabase } from './supabase'

export type Range = { min: number | null; max: number | null } | null
export type GameInfo = {
  tagline?: string | null
  players?: Range
  bestPlayers?: Range
  recommendedPlayers?: Range
  playTime?: Range
  minAge?: number | null
  communityAge?: string | null
  weight?: number | null
  rating?: number | null
  ratings?: number | null
  rank?: number | null
  languageDependence?: string | null
  designers?: string[]
  artists?: string[]
  publishers?: string[]
  categories?: string[]
  mechanics?: string[]
  types?: string[]
  expands?: string[]
  description?: string[]
}

export type Game = {
  bggId: number
  title: string
  year: number | null
  coverUrl: string | null
  thumbUrl: string | null
  spineUrl: string | null
  spineWidth: number
  info: GameInfo
}

export const SHELF_H = 280
const GENERATED_SPINE_W = 46

type GameRow = {
  bgg_id: number
  title: string
  year: number | null
  cover_url: string | null
  thumb_url: string | null
  spine_url: string | null
  spine_width: number | null
  info: GameInfo
}

export const toGame = (r: GameRow): Game => ({
  bggId: r.bgg_id,
  title: r.title,
  year: r.year,
  coverUrl: r.cover_url,
  thumbUrl: r.thumb_url,
  spineUrl: r.spine_url,
  spineWidth: Number(r.spine_width) || GENERATED_SPINE_W,
  info: r.info ?? {},
})

const byTitle = (a: Game, b: Game) => a.title.replace(/^(the|a) /i, '').localeCompare(b.title.replace(/^(the|a) /i, ''))

// Spines made by the spine job for games added on the site, or remade after
// someone used "Fix spine" (scripts/sync-spines.mjs). Entries are
// { w: cssWidth, v: version }; older entries are a bare width.
type ManifestEntry = number | { w: number; v: string }
let manifest: Promise<Record<string, ManifestEntry>> | null = null
const loadManifest = () =>
  (manifest ??= fetch('/spines/manifest.json')
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({})))

/** Applies the spine job's spines over whatever the catalog row has. */
export function useSpines(games: Game[]) {
  const [spines, setSpines] = useState<Record<string, ManifestEntry>>({})
  useEffect(() => {
    loadManifest().then(setSpines)
  }, [])
  return games.map((g) => {
    const entry = spines[g.bggId]
    if (entry == null) return g
    const { w, v } = typeof entry === 'number' ? { w: entry, v: 'auto' } : entry
    return { ...g, spineUrl: `/spines/${g.bggId}.webp?v=${encodeURIComponent(v)}`, spineWidth: w }
  })
}

/** Marks where the title sits on a game's cover; the spine job remakes the spine around it. */
export async function fixSpine(bggId: number, box: { left: number; top: number; right: number; bottom: number }) {
  const { error } = await supabase.rpc('set_spine_crop', {
    p_bgg_id: bggId,
    p_left: box.left,
    p_top: box.top,
    p_right: box.right,
    p_bottom: box.bottom,
  })
  if (error) throw new Error(error.message)
}

/** A user's public shelf, looked up by username. */
export function useShelf(username: string | undefined) {
  const [state, setState] = useState<{ loading: boolean; owner: Profile | null; games: Game[] }>({ loading: true, owner: null, games: [] })

  const load = useCallback(async () => {
    if (!username) return
    const { data: owner } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle()
    if (!owner) return setState({ loading: false, owner: null, games: [] })
    const { data } = await supabase.from('shelf_games').select('games(*)').eq('user_id', owner.id)
    const games = (data ?? []).map((r) => toGame(r.games as unknown as GameRow)).sort(byTitle)
    setState({ loading: false, owner, games })
  }, [username])

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }))
    load()
  }, [load])

  return { ...state, reload: load }
}

export async function fetchGame(bggId: number) {
  const { data } = await supabase.from('games').select('*').eq('bgg_id', bggId).maybeSingle()
  return data ? toGame(data) : null
}

export async function searchLibrary(query: string) {
  let q = supabase.from('games').select('*').order('title').limit(60)
  if (query.trim()) q = q.ilike('title', `%${query.trim()}%`)
  const { data } = await q
  return (data ?? []).map(toGame)
}

/** Pulls a game from BGG into the shared catalog (or returns it if it's already there). */
export async function addFromBgg(bggId: number) {
  const { data, error } = await supabase.rpc('add_bgg_game', { p_bgg_id: bggId })
  if (error) throw new Error(error.message)
  return toGame(data as GameRow)
}

export async function addToShelf(userId: string, bggId: number) {
  const { error } = await supabase.from('shelf_games').upsert({ user_id: userId, bgg_id: bggId })
  if (error) throw new Error(error.message)
}

export async function removeFromShelf(userId: string, bggId: number) {
  const { error } = await supabase.from('shelf_games').delete().eq('user_id', userId).eq('bgg_id', bggId)
  if (error) throw new Error(error.message)
}

/** Accepts a BGG link (boardgamegeek.com/boardgame/12345/...) or a bare id. */
export function parseBggId(input: string) {
  const m = input.trim().match(/(?:boardgame(?:expansion)?\/)?(\d{1,7})(?:\/|$|\?)/)
  return m ? Number(m[1]) : null
}
