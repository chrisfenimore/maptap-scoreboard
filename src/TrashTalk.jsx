import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'

function Avatar({ profile }) {
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt="" className="avatar-img" />
  }
  return <span className="avatar-emoji">{profile?.avatar_emoji || '🌍'}</span>
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function TrashTalk({ userId }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    loadMessages()

    // realtime subscription — new messages appear instantly for everyone
    const channel = supabase
      .channel('trash_talk')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trash_talk' },
        () => loadMessages()
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages() {
    const { data } = await supabase
      .from('trash_talk')
      .select('id, message, created_at, player_id, profiles(display_name, avatar_emoji, avatar_url)')
      .order('created_at', { ascending: true })
      .limit(200)
    setMessages(data || [])
  }

  async function handlePost(e) {
    e.preventDefault()
    if (!text.trim()) return
    setError('')
    setPosting(true)
    const { error } = await supabase
      .from('trash_talk')
      .insert({ player_id: userId, message: text.trim() })
    setPosting(false)
    if (error) {
      setError(error.message)
      return
    }
    setText('')
  }

  async function handleDelete(id) {
    await supabase.from('trash_talk').delete().eq('id', id)
  }

  return (
    <div className="trash-shell">
      <div className="trash-feed">
        {messages.length === 0 && (
          <p className="muted" style={{ textAlign: 'center', padding: '2rem 0' }}>
            No trash yet. Be first.
          </p>
        )}
        {messages.map((m) => {
          const isOwn = m.player_id === userId
          return (
            <div key={m.id} className={`trash-msg ${isOwn ? 'trash-own' : ''}`}>
              <div className="trash-avatar">
                <Avatar profile={m.profiles} />
              </div>
              <div className="trash-body">
                <div className="trash-meta">
                  <span className="trash-name">{m.profiles?.display_name || 'Unknown'}</span>
                  <span className="trash-time">{timeAgo(m.created_at)}</span>
                  {isOwn && (
                    <button
                      className="trash-delete"
                      onClick={() => handleDelete(m.id)}
                      title="Delete"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <p className="trash-text">{m.message}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form className="trash-input-row" onSubmit={handlePost}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Say something..."
          maxLength={280}
          required
        />
        <button type="submit" className="btn-primary" disabled={posting || !text.trim()}>
          {posting ? '…' : 'Send'}
        </button>
      </form>
      {error && <p className="error-text" style={{ padding: '0 1.25rem' }}>{error}</p>}
    </div>
  )
}
