// All stats are derived client-side from the raw scores table.
// Each row: { player_id, score, score_date } joined with profile info.
// Higher score = better (matches MapTap's points system).

function startOfWeek(d) {
  const date = new Date(d)
  const day = date.getDay() // 0 = Sun
  const diff = (day === 0 ? -6 : 1) - day // back up to Monday
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function sameWeek(a, b) {
  return startOfWeek(a).getTime() === startOfWeek(b).getTime()
}

function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

function toDate(dateStr) {
  // score_date comes back as 'YYYY-MM-DD'; parse as local date, not UTC
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Returns all rows that share the extreme score (handles ties).
// Returns null if empty, or { score, tied: [row, ...] }
function extremesFor(rows, pickMax) {
  if (rows.length === 0) return null
  const extreme = rows.reduce((best, r) =>
    pickMax ? (r.score > best.score ? r : best) : (r.score < best.score ? r : best)
  )
  const tied = rows.filter((r) => r.score === extreme.score)
  return { score: extreme.score, tied }
}

export function computeStats(rows, todayStr) {
  const today = toDate(todayStr)

  const withDate = rows.map((r) => ({ ...r, _date: toDate(r.score_date) }))

  const todays = withDate.filter((r) => r.score_date === todayStr)
  const weekly = withDate.filter((r) => sameWeek(r._date, today))
  const monthly = withDate.filter((r) => sameMonth(r._date, today))

  const daily = { high: extremesFor(todays, true), low: extremesFor(todays, false) }
  const week = { high: extremesFor(weekly, true), low: extremesFor(weekly, false) }
  const month = { high: extremesFor(monthly, true), low: extremesFor(monthly, false) }
  const allTime = { high: extremesFor(withDate, true), low: extremesFor(withDate, false) }

  // All-time rank: average score per player
  const byPlayer = {}
  for (const r of withDate) {
    if (!byPlayer[r.player_id]) {
      byPlayer[r.player_id] = {
        player_id: r.player_id,
        name: r.profiles?.display_name || 'Unknown',
        avatar_emoji: r.profiles?.avatar_emoji,
        avatar_url: r.profiles?.avatar_url,
        scores: [],
      }
    }
    byPlayer[r.player_id].scores.push(r)
  }

  const ranking = Object.values(byPlayer)
    .map((p) => {
      const total = p.scores.reduce((s, r) => s + r.score, 0)
      const avg = total / p.scores.length
      const personalHigh = extremesFor(p.scores, true)
      const personalLow = extremesFor(p.scores, false)
      return {
        ...p,
        entries: p.scores.length,
        average: avg,
        personalHigh,
        personalLow,
      }
    })
    .sort((a, b) => b.average - a.average)

  // Leader streaks: walk every date that has scores, find the sole top scorer
  // each day (strict max, ties break the streak), track consecutive days.
  const byDate = {}
  for (const r of withDate) {
    if (!byDate[r.score_date]) byDate[r.score_date] = []
    byDate[r.score_date].push(r)
  }
  const sortedDates = Object.keys(byDate).sort()

  let longest = { player_id: null, name: null, length: 0, endDate: null }
  let current = { player_id: null, name: null, length: 0 }
  let runPlayer = null
  let runLength = 0
  let prevDate = null

  for (const dateStr of sortedDates) {
    const dayRows = byDate[dateStr]
    const max = Math.max(...dayRows.map((r) => r.score))
    const winners = dayRows.filter((r) => r.score === max)
    const soleWinner = winners.length === 1 ? winners[0] : null

    const date = toDate(dateStr)
    const isConsecutive =
      prevDate && (date - prevDate) / (1000 * 60 * 60 * 24) === 1

    if (soleWinner && isConsecutive && soleWinner.player_id === runPlayer) {
      runLength += 1
    } else if (soleWinner) {
      runPlayer = soleWinner.player_id
      runLength = 1
    } else {
      runPlayer = null
      runLength = 0
    }

    if (runLength > longest.length && runPlayer) {
      longest = {
        player_id: runPlayer,
        name: byPlayer[runPlayer]?.name,
        length: runLength,
        endDate: dateStr,
      }
    }
    prevDate = date
  }

  // Current streak = the run ending on the most recently logged date
  if (sortedDates.length > 0) {
    const lastDate = sortedDates[sortedDates.length - 1]
    const lastDayRows = byDate[lastDate]
    const max = Math.max(...lastDayRows.map((r) => r.score))
    const winners = lastDayRows.filter((r) => r.score === max)
    if (winners.length === 1 && runPlayer === winners[0].player_id) {
      current = { player_id: runPlayer, name: byPlayer[runPlayer]?.name, length: runLength }
    }
  }

  return { daily, week, month, allTime, ranking, longestStreak: longest, currentStreak: current }
}
