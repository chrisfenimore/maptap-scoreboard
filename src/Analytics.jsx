import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Distinct colors for up to 8 players — Masters-palette-friendly but distinct
const PLAYER_COLORS = [
  '#0d4a2c', // augusta green
  '#c9a84c', // gold
  '#c1453b', // red
  '#3c6e5a', // teal green
  '#7b5ea7', // purple
  '#e07b39', // orange
  '#2176ae', // blue
  '#b5446e', // pink
]

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(30) // days to show

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data: rows } = await supabase
      .from('scores')
      .select('player_id, score, score_date, profiles(display_name, avatar_emoji)')
      .order('score_date', { ascending: true })
    setData(rows || [])
    setLoading(false)
  }

  if (loading) return <p className="muted">Crunching the numbers…</p>

  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <p>No scores logged yet.</p>
        <p className="muted">Once people start logging daily scores, trends will appear here.</p>
      </div>
    )
  }

  // Filter to selected range
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - range)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  const filtered = range === 0 ? data : data.filter((r) => r.score_date >= cutoffStr)

  // Build per-player series
  const players = {}
  for (const r of filtered) {
    if (!players[r.player_id]) {
      players[r.player_id] = {
        id: r.player_id,
        name: r.profiles?.display_name || 'Unknown',
        emoji: r.profiles?.avatar_emoji || '🌍',
        points: [],
      }
    }
    players[r.player_id].points.push({ date: r.score_date, score: Number(r.score) })
  }

  const playerList = Object.values(players)

  if (playerList.length === 0) {
    return (
      <div className="empty-state">
        <p className="muted">No scores in this time range.</p>
      </div>
    )
  }

  // All unique dates across all players, sorted
  const allDates = [...new Set(filtered.map((r) => r.score_date))].sort()

  // Chart dimensions
  const W = 560
  const H = 280
  const PAD = { top: 16, right: 16, bottom: 40, left: 48 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const allScores = filtered.map((r) => Number(r.score))
  const minScore = Math.max(0, Math.min(...allScores) - 200)
  const maxScore = Math.max(...allScores) + 200

  function xPos(dateStr) {
    const i = allDates.indexOf(dateStr)
    if (allDates.length === 1) return PAD.left + chartW / 2
    return PAD.left + (i / (allDates.length - 1)) * chartW
  }

  function yPos(score) {
    return PAD.top + chartH - ((score - minScore) / (maxScore - minScore)) * chartH
  }

  // Y axis gridlines
  const yTicks = 5
  const yStep = (maxScore - minScore) / yTicks
  const yLines = Array.from({ length: yTicks + 1 }, (_, i) => minScore + i * yStep)

  // X axis labels — show at most 6 evenly spaced
  const xLabelCount = Math.min(6, allDates.length)
  const xLabelIndices = Array.from({ length: xLabelCount }, (_, i) =>
    Math.round((i / (xLabelCount - 1 || 1)) * (allDates.length - 1))
  )

  return (
    <div className="analytics-shell">
      <div className="analytics-header">
        <p className="section-label" style={{ margin: 0 }}>Score trends</p>
        <div className="range-pills">
          {[7, 30, 90, 0].map((r) => (
            <button
              key={r}
              className={`range-pill ${range === r ? 'range-pill-active' : ''}`}
              onClick={() => setRange(r)}
            >
              {r === 0 ? 'All' : `${r}d`}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg">
          {/* Grid lines */}
          {yLines.map((y, i) => (
            <g key={i}>
              <line
                x1={PAD.left} y1={yPos(y)}
                x2={PAD.left + chartW} y2={yPos(y)}
                stroke="#e1ddd0" strokeWidth="1"
              />
              <text
                x={PAD.left - 6} y={yPos(y) + 4}
                textAnchor="end"
                fontSize="10"
                fill="#5b5b50"
                fontFamily="IBM Plex Mono, monospace"
              >
                {Math.round(y)}
              </text>
            </g>
          ))}

          {/* X axis labels */}
          {xLabelIndices.map((idx) => (
            <text
              key={idx}
              x={xPos(allDates[idx])}
              y={H - PAD.bottom + 14}
              textAnchor="middle"
              fontSize="9"
              fill="#5b5b50"
              fontFamily="IBM Plex Mono, monospace"
            >
              {formatDate(allDates[idx])}
            </text>
          ))}

          {/* Player lines and dots */}
          {playerList.map((p, pi) => {
            const color = PLAYER_COLORS[pi % PLAYER_COLORS.length]
            const sorted = [...p.points].sort((a, b) => a.date.localeCompare(b.date))
            if (sorted.length === 0) return null

            const pathD = sorted
              .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xPos(pt.date)} ${yPos(pt.score)}`)
              .join(' ')

            return (
              <g key={p.id}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={color}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {sorted.map((pt, i) => (
                  <circle
                    key={i}
                    cx={xPos(pt.date)}
                    cy={yPos(pt.score)}
                    r="4"
                    fill={color}
                    stroke="#fff"
                    strokeWidth="1.5"
                  />
                ))}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="chart-legend">
        {playerList.map((p, pi) => (
          <div key={p.id} className="legend-item">
            <span
              className="legend-dot"
              style={{ background: PLAYER_COLORS[pi % PLAYER_COLORS.length] }}
            />
            <span className="legend-emoji">{p.emoji}</span>
            <span className="legend-name">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
