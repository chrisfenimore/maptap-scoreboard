# MapTap Scoreboard

A private scoreboard for tracking your group's daily MapTap (maptap.gg) scores.
Masters-tournament-inspired look (deep green, gold, serif leaderboard), built to
work great from an iPhone home screen via Safari — no app store needed.

## What it tracks

- One score per person per day (re-entering the same day overwrites it; skipped
  days just don't count toward anything — no penalty, no zero).
- Daily, weekly, and monthly high/low scores across the group.
- All-time high and low scores (with who and when).
- Each player's personal all-time high and low.
- All-time rank (by average score across days played).
- Longest leader streak ever, and the current streak in progress (consecutive
  days a single person held the top daily score outright — ties break the streak).

## What you're getting

- React app (Vite) — the scoreboard UI
- Supabase — real accounts (name, password, avatar) and the database
- Deploy to Vercel — gives you a real URL to bookmark on your phone

~15-20 minutes of one-time setup.

---

## Step 1 — Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free tier is fine).
2. Click **New project**, name it whatever, set a database password (save it
   somewhere safe — you won't need it day to day).
3. Once it's ready, go to **SQL Editor → New query**, paste in the entire
   contents of `supabase_schema.sql`, and click **Run**. This creates the
   profiles and scores tables, the security rules, and the avatar photo storage
   bucket with its upload policies.
4. Go to **Project Settings → API** and note down:
   - **Project URL**
   - **anon public** key

### Optional: skip email confirmation

By default Supabase makes new users click a confirmation link before signing
in. For a small friend group, turning this off is usually less friction: go to
**Authentication → Providers → Email** and toggle off "Confirm email."

---

## Step 2 — Configure the app with your keys

```
cp .env.example .env
```
Open `.env` and paste in your Project URL and anon key from Step 1.

---

## Step 3 — Run it locally to check everything

```
npm install
npm run dev
```

Open the printed URL, sign up with a test account (pick a name, pick an
emoji or upload a photo), log a score, confirm it shows up on the board.

---

## Step 4 — Deploy to Vercel

1. Push this project to a GitHub repo:
   ```
   git init && git add . && git commit -m "maptap scoreboard"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com), **Add New → Project**, import that repo.
3. Before deploying, add environment variables (Vercel's import screen, or later
   under **Settings → Environment Variables**):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy**. You'll get a URL like `maptap-scoreboard.vercel.app`.

### Add it to your iPhone home screen

Open the URL in Safari → tap the Share icon → **Add to Home Screen**. It'll
behave like a regular app icon, no App Store install needed.

Send the link to your friends — anyone can create their own account on the
site itself.

## Project structure

```
src/
  App.jsx           tab navigation + session handling
  Auth.jsx          sign up (name + avatar picker) / sign in
  Leaderboard.jsx   rankings, daily/weekly/monthly/all-time records, streaks
  LogScore.jsx      enter today's (or a past) score
  stats.js          all the ranking/streak/record math — edit here to change rules
  supabaseClient.js Supabase connection
supabase_schema.sql  run this once in Supabase's SQL editor
```

## Notes on the rules baked in

- **All-time rank** is by average score (not total), so someone who's missed a
  few days isn't penalized versus someone who's played every day. If you'd
  rather rank by total points or something else, that's one line to change in
  `stats.js`.
- **Leader streak** requires being the *sole* top scorer that day — a tie for
  first breaks the streak. Let me know if you'd rather ties share credit.
