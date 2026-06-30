import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const EMOJI_CHOICES = [
  '🌍', '🗺️', '📍', '🧭', '🏔️', '🏝️', '🦘', '🐊', '🦁', '🐼',
  '🚀', '🎯', '🛰️', '⛰️', '🌋', '🏜️', '🌊', '🦩', '🐙', '🦊',
]

export default function Profile({ userId, onSaved }) {
  const [displayName, setDisplayName] = useState('')
  const [avatarEmoji, setAvatarEmoji] = useState(EMOJI_CHOICES[0])
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('display_name, avatar_emoji, avatar_url')
      .eq('id', userId)
      .single()
    if (data) {
      setDisplayName(data.display_name || '')
      setAvatarEmoji(data.avatar_emoji || EMOJI_CHOICES[0])
      setAvatarUrl(data.avatar_url || null)
    }
    setLoading(false)
  }

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setSaving(true)
    try {
      const updates = { display_name: displayName.trim() }

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const path = `${userId}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true })
        if (uploadError) throw uploadError
        const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
        // cache-bust so the new photo shows immediately instead of a stale cached one
        updates.avatar_url = `${pub.publicUrl}?t=${Date.now()}`
        updates.avatar_emoji = null
      } else {
        updates.avatar_emoji = avatarEmoji
        updates.avatar_url = null
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
      if (updateError) {
        if (updateError.message.toLowerCase().includes('duplicate')) {
          throw new Error('That name is already taken — try a different one.')
        }
        throw updateError
      }

      setAvatarUrl(updates.avatar_url)
      setAvatarFile(null)
      setAvatarPreview(null)
      setSuccess(true)
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="muted">Loading your profile…</p>

  const currentAvatar = avatarPreview || avatarUrl

  return (
    <form className="score-form" onSubmit={handleSubmit}>
      <p className="muted">Update what shows on the leaderboard.</p>

      <label className="field">
        <span>Name</span>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
      </label>

      <div className="field">
        <span>Avatar</span>
        {currentAvatar ? (
          <img src={currentAvatar} alt="Current avatar" className="avatar-preview" />
        ) : (
          <span className="avatar-emoji" style={{ fontSize: '2rem' }}>{avatarEmoji}</span>
        )}
        <div className="emoji-grid" style={{ marginTop: '0.6rem' }}>
          {EMOJI_CHOICES.map((em) => (
            <button
              type="button"
              key={em}
              className={`emoji-pick ${!avatarFile && !avatarUrl && avatarEmoji === em ? 'emoji-pick-active' : ''} ${!avatarFile && avatarUrl && avatarEmoji === em ? 'emoji-pick-active' : ''}`}
              onClick={() => {
                setAvatarEmoji(em)
                setAvatarFile(null)
                setAvatarPreview(null)
                setAvatarUrl(null)
              }}
            >
              {em}
            </button>
          ))}
        </div>
        <label className="upload-row">
          <span>or upload a photo</span>
          <input type="file" accept="image/png, image/jpeg" onChange={handleFile} />
        </label>
      </div>

      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">Saved.</p>}

      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
