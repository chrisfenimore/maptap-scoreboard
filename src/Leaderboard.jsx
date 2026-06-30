import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { computeStats } from './stats'

function todayStr() {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

function Avatar({ player }) {
  if (player.avatar_url) {
    return <img src={player.avatar_url} alt="" className="avatar-img" />
  }
  return <span className="avatar-emoji">{player.avatar_emoji || '🌍'}</span>
}

function RecordCard({ title, high, low }) {
  return (
    <div className="record-card">
      <p className="record-title">{title}</p>
      <div className="record-line">
        <span className="record-label">King</span>
        {high ? (
          <span className="record-value">
            {high.score} <em>{high.profiles?.display_name}</em>
          </span>
        ) : (
          <span className="record-value muted">—</span>
        )}
      </div>
      <div className="record-line">
        <span className="record-label">Dumbass</span>
        {low ? (
          <span className="record-value">
            {low.score} <em>{low.profiles?.display_name}</em>
          </span>
        ) : (
          <span className="record-value muted">—</span>
        )}
      </div>
    </div>
  )
}

export default function Leaderboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data: rows } = await supabase
      .from('scores')
      .select('player_id, score, score_date, profiles(display_name, avatar_emoji, avatar_url)')
    setStats(computeStats(rows || [], todayStr()))
    setLoading(false)
  }

  if (loading) return <p className="muted">Reading the board…</p>

  if (!stats || stats.ranking.length === 0) {
    return (
      <div className="empty-state">
        <p>No scores logged yet.</p>
        <p className="muted">Once everyone starts entering daily scores, the board fills in here.</p>
      </div>
    )
  }

  return (
    <div className="board">
      <div className="board-header">
        <span>Pos</span>
        <span>Player</span>
        <span>Avg</span>
        <span>Entries</span>
      </div>
      {stats.ranking.map((p, i) => (
        <div className="board-row" key={p.player_id}>
          <span className="board-pos">{i + 1}</span>
          <span className="board-player">
            <Avatar player={p} />
            {p.name}
          </span>
          <span className="board-avg">{p.average.toFixed(0)}</span>
          <span className="board-entries">{p.entries}</span>
        </div>
      ))}

      <div className="record-grid">
        <RecordCard title="Today" high={stats.daily.high} low={stats.daily.low} />
        <RecordCard title="This week" high={stats.week.high} low={stats.week.low} />
        <RecordCard title="This month" high={stats.month.high} low={stats.month.low} />
        <RecordCard title="All time" high={stats.allTime.high} low={stats.allTime.low} />
      </div>

      <div className="streak-card">
        <p className="record-title">Leader streak</p>
        <div className="record-line">
          <span className="record-label">Longest ever</span>
          <span className="record-value">
            {stats.longestStreak.length > 0
              ? `${stats.longestStreak.length} days — ${stats.longestStreak.name}`
              : '—'}
          </span>
        </div>
        <div className="record-line">
          <span className="record-label">Current</span>
          <span className="record-value">
            {stats.currentStreak.length > 0
              ? `${stats.currentStreak.length} days — ${stats.currentStreak.name}`
              : '— (no sole leader right now)'}
          </span>
        </div>
      </div>

      <p className="section-label">Personal bests</p>
      <div className="personal-grid">
        {stats.ranking.map((p) => (
          <div className="personal-card" key={p.player_id}>
            <div className="board-player">
              <Avatar player={p} />
              {p.name}
            </div>
            <div className="record-line">
              <span className="record-label">King</span>
              <span className="record-value">{p.personalHigh?.score ?? '—'}</span>
            </div>
            <div className="record-line">
              <span className="record-label">Dumbass</span>
              <span className="record-value">{p.personalLow?.score ?? '—'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
