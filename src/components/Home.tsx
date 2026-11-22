import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth, type Profile } from '../auth'
import { supabase } from '../supabase'
import { TopBar } from './Shelf'

export default function Home() {
  const { ready, profile, session, signIn } = useAuth()
  // Supabase sends failed sign-ins back here with ?error_description=…
  const [authError] = useState(() => new URLSearchParams(location.search).get('error_description'))
  const [shelves, setShelves] = useState<(Profile & { count: number })[]>([])

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*, shelf_games(count)')
      .order('created_at')
      .limit(24)
      .then(({ data }) =>
        setShelves(
          (data ?? [])
            .map((p) => ({ ...p, count: (p.shelf_games as unknown as { count: number }[])[0]?.count ?? 0 }))
            .filter((p) => p.count > 0),
        ),
      )
  }, [])

  // Signed-in visitors land on their own shelf.
  if (ready && profile) return <Navigate to={`/u/${profile.username}`} replace />
  if (ready && session && !profile) return null

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <TopBar />
      <section className="py-16 text-center sm:py-24">
        <h1 className="text-4xl font-bold sm:text-6xl">Your games, on a shelf.</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/60">
          Put your board game collection on a shelf, log who played and who won, and settle the leaderboard.
        </p>
        {authError && (
          <p className="mx-auto mt-6 max-w-md rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-200">
            Sign-in didn't work: {authError}. Please try again.
          </p>
        )}
        <div className="mt-8 flex justify-center gap-3">
          <button onClick={signIn} className="rounded-xl bg-white px-5 py-3 font-semibold text-black hover:bg-white/90">
            Sign in with Google
          </button>
          <Link to="/library" className="rounded-xl bg-white/10 px-5 py-3 font-semibold hover:bg-white/15">
            Browse the library
          </Link>
        </div>
      </section>

      {shelves.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Shelves</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {shelves.map((p) => (
              <Link key={p.id} to={`/u/${p.username}`} className="flex items-center gap-3 rounded-xl bg-white/5 p-4 hover:bg-white/10">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" referrerPolicy="no-referrer" className="size-10 rounded-full" />
                ) : (
                  <span className="flex size-10 items-center justify-center rounded-full bg-purple-600/40">{p.display_name[0]}</span>
                )}
                <span>
                  <span className="block font-medium">{p.display_name}</span>
                  <span className="text-sm text-white/45">{p.count} games</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
