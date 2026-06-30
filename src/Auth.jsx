import { useState } from 'react'
import { supabase } from './supabaseClient'

const EMOJI_CHOICES = [
  '🌍', '🗺️', '📍', '🧭', '🏔️', '🏝️', '🦘', '🐊', '🦁', '🐼',
  '🚀', '🎯', '🛰️', '⛰️', '🌋', '🏜️', '🌊', '🦩', '🐙', '🦊',
]

export default function Auth() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [avatarEmoji, setAvatarEmoji] = useState(EMOJI_CHOICES[0])
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
              avatar_emoji: avatarFile ? null : avatarEmoji,
            },
          },
        })
        if (error) throw error

        // If they picked a photo, upload it and attach to their profile.
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
        setCheckEmail(true)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (checkEmail) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <p className="eyebrow">MapTap</p>
          <h1 className="brand">Scoreboard</h1>
          <p className="auth-msg">
            Confirmation sent to <strong>{email}</strong>. Verify it, then sign in.
          </p>
          <button className="btn-ghost" onClick={() => { setCheckEmail(false); setMode('signin') }}>
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">MapTap</p>
        <h1 className="brand">Scoreboard</h1>
        <p className="auth-tag">Daily scores. Tracked properly.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <>
              <label className="field">
                <span>Name</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="What shows on the leaderboard"
                  required
                />
              </label>

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
            </>
          )}
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
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
          onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
        >
          {mode === 'signup' ? 'Already have an account? Sign in' : "New here? Create an account"}
        </button>
      </div>
    </div>
  )
}
