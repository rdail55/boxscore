import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { supabase } from '../supabase'
import { TopBar } from './Shelf'

export default function Settings() {
  const { ready, profile, reloadProfile } = useAuth()
  const [form, setForm] = useState({ display_name: '', username: '', bgg_username: '' })
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) setForm({ display_name: profile.display_name, username: profile.username, bgg_username: profile.bgg_username ?? '' })
  }, [profile])

  if (ready && !profile) return <Navigate to="/" replace />
  if (!profile) return null

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setStatus(null)
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: form.display_name.trim() || profile!.display_name,
        username: form.username.trim().toLowerCase(),
        bgg_username: form.bgg_username.trim() || null,
      })
      .eq('id', profile!.id)
    setSaving(false)
    if (error) {
      const taken = error.code === '23505'
      const badName = error.code === '23514'
      setStatus({
        ok: false,
        text: taken ? 'That username is taken.' : badName ? 'Usernames are 3–30 lowercase letters, numbers, - or _.' : error.message,
      })
      return
    }
    await reloadProfile()
    setStatus({ ok: true, text: 'Saved.' })
  }

  const field = 'mt-1 block w-full rounded-lg bg-white/5 px-3 py-2 outline-none focus:bg-white/10'
  const label = 'block text-xs tracking-wider text-white/40 uppercase'

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <TopBar />
      <h1 className="mt-8 text-3xl font-bold">Settings</h1>

      <form onSubmit={save} className="mt-6 space-y-5 rounded-xl bg-white/5 p-6">
        <label className={label}>
          Display name
          <input value={form.display_name} onChange={set('display_name')} className={`${field} text-base text-white normal-case`} />
        </label>
        <label className={label}>
          Shelf username
          <div className="mt-1 flex items-center rounded-lg bg-white/5 focus-within:bg-white/10">
            <span className="pl-3 text-sm text-white/35 normal-case">boxscore.2guysandabusiness.com/u/</span>
            <input value={form.username} onChange={set('username')} className="min-w-0 flex-1 bg-transparent py-2 pr-3 text-base text-white normal-case outline-none" />
          </div>
        </label>
        <label className={label}>
          BoardGameGeek username
          <input value={form.bgg_username} onChange={set('bgg_username')} placeholder="e.g. travisjohnray" className={`${field} text-base text-white normal-case placeholder:text-white/25`} />
          <span className="mt-1 block text-xs text-white/40 normal-case">
            Used to import your BGG collection. Importing switches on once BoxScore's BGG access is approved; until then, add games from the Library.
          </span>
        </label>
        <div className="flex items-center gap-4">
          <button disabled={saving} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold hover:bg-purple-500 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
          {status && <p className={`text-sm ${status.ok ? 'text-emerald-300' : 'text-red-300'}`}>{status.text}</p>}
        </div>
      </form>
    </main>
  )
}
