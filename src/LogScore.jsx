import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function todayStr() {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

export default function LogScore({ userId, onSubmitted }) {
  const [date, setDate] = useState(todayStr())
  const [score, setScore] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [existing, setExisting] = useState(null)

  useEffect(() => {
    checkExisting(date)
  }, [date])

  async function checkExisting(d) {
    setSuccess(false)
    const { data } = await supabase
      .from('scores')
      .select('score')
      .eq('player_id', userId)
      .eq('score_date', d)
      .maybeSingle()
    setExisting(data)
    setScore(data ? String(data.score) : '')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const { error } = await supabase
      .from('scores')
      .upsert(
        { player_id: userId, score_date: date, score: Number(score) },
        { onConflict: 'player_id,score_date' }
      )
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setSuccess(true)
    onSubmitted?.()
  }

  return (
    <form className="score-form" onSubmit={handleSubmit}>
      <p className="muted">
        One entry per day — submitting again for the same date overwrites it.
      </p>

      <label className="field">
        <span>Date</span>
        <input
          type="date"
          value={date}
          max={todayStr()}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>

      <label className="field">
        <span>Score</span>
        <input
          type="number"
          step="1"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          placeholder="Enter your MapTap score"
          required
        />
      </label>

      {existing && (
        <p className="muted">You already logged {existing.score} for this date — saving will replace it.</p>
      )}

      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">Saved.</p>}

      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? 'Saving…' : 'Save score'}
      </button>
    </form>
  )
}
