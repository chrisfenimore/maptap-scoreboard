import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import Leaderboard from './Leaderboard'
import LogScore from './LogScore'
import Profile from './Profile'
import './app.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [tab, setTab] = useState('board')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoadingSession(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (loadingSession) return null
  if (!session) return <Auth />

  return (
    <div className="app-shell">
      <header className="masthead">
        <p className="eyebrow">MapTap</p>
        <h1 className="brand">Scoreboard</h1>
        <button className="btn-link signout" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </header>

      <nav className="tabs">
        <button className={tab === 'board' ? 'tab active' : 'tab'} onClick={() => setTab('board')}>
          Leaderboard
        </button>
        <button className={tab === 'log' ? 'tab active' : 'tab'} onClick={() => setTab('log')}>
          Log score
        </button>
        <button className={tab === 'profile' ? 'tab active' : 'tab'} onClick={() => setTab('profile')}>
          Profile
        </button>
      </nav>

      <main className="content">
        {tab === 'board' && <Leaderboard key={refreshKey} />}
        {tab === 'log' && (
          <LogScore userId={session.user.id} onSubmitted={() => setRefreshKey((k) => k + 1)} />
        )}
        {tab === 'profile' && (
          <Profile userId={session.user.id} onSaved={() => setRefreshKey((k) => k + 1)} />
        )}
      </main>
    </div>
  )
}
