import { useState } from 'react'
import { supabase } from './supabaseClient'

const EMOJI_CHOICES = [
  '🌍', '🗺️', '📍', '🧭', '🏔️', '🏝️', '🦘', '🐊', '🦁', '🐼',
  '🚀', '🎯', '🛰️', '⛰️', '🌋', '🏜️', '🌊', '🦩', '🐙', '🦊',
]

// Supabase still needs an "email" internally, but we never show one or send
// one. We derive a fake, unique-looking address from the player's name.
function nameToFakeEmail(name) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug || 'player'}@maptap.local`
}

export default function Auth() {
  const [mode, setMode] = useState('signin')
  const [displayName, setDisplayName] = useState('')
  const [pin, setPin] = useState('')
  const [avatarEmoji, setAvatarEmoji] = useState(EMOJI_CHOICES[0])
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (pin.length < 6) {
      setError('PIN needs to be at least 6 digits.')
      return
    }

    setLoading(true)
    try {
      const fakeEmail = nameToFakeEmail(displayName)

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: fakeEmail,
          password: pin,
          options: {
            data: {
              display_name: displayName.trim(),
              avatar_emoji: avatarFile ? null : avatarEmoji,
            },
          },
        })
        if (error) {
          if (error.message.toLowerCase().includes('already registered')) {
            throw new Error('That name is already taken — try a different one.')
          }
          throw error
        }

        if (avatarFile && data.user) {
          const ext = avatarFile.name.split('.').pop()
          const path = `${data.user.id}/avatar.${ext}`
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(path, avatarFile, { upsert: true })
          if (!uploadError) {
            const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
            await supabase
              .from('profiles')
              .update({ avatar_url: pub.publicUrl })
              .eq('id', data.user.id)
          }
        }
        // No email confirmation needed — signUp already returns a session,
        // App.jsx will switch over to the main view automatically.
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: fakeEmail,
          password: pin,
        })
        if (error) {
          throw new Error('Name or PIN not recognized.')
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">MapTap</p>
        <h1 className="brand">Scoreboard</h1>
        <p className="auth-tag">Daily scores. Tracked properly.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field">
            <span>Name</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="What shows on the leaderboard"
              required
            />
          </label>

          {mode === 'signup' && (
            <div className="field">
              <span>Pick an avatar</span>
              <div className="emoji-grid">
                {EMOJI_CHOICES.map((em) => (
                  <button
                    type="button"
                    key={em}
                    className={`emoji-pick ${!avatarFile && avatarEmoji === em ? 'emoji-pick-active' : ''}`}
                    onClick={() => { setAvatarEmoji(em); setAvatarFile(null); setAvatarPreview(null) }}
                  >
                    {em}
                  </button>
                ))}
              </div>
              <label className="upload-row">
                <span>or upload a photo</span>
                <input type="file" accept="image/png, image/jpeg" onChange={handleFile} />
              </label>
              {avatarPreview && (
                <img src={avatarPreview} alt="Avatar preview" className="avatar-preview" />
              )}
            </div>
          )}

          <label className="field">
            <span>PIN (6+ digits)</span>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              minLength={6}
              placeholder="Pick something you'll remember"
              required
            />
          </label>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Working…' : mode === 'signup' ? 'Join the board' : 'Sign in'}
          </button>
        </form>

        <button
          className="btn-link"
          onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError('') }}
        >
          {mode === 'signup' ? 'Already have an account? Sign in' : "New here? Create an account"}
        </button>
      </div>
    </div>
  )
}
