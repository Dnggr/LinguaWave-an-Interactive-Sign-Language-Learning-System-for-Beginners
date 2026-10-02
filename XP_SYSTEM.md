# LinguaWave XP, Levels, Badges, Streaks & Leaderboards

_Added 2026-09-30. Everything below is implemented in `functions/xp*.js`, `js/xp.js`, `js/leaderboard.js`,
`js/xp-ui.js`, `css/xp.css`, `pages/leaderboard.html`, `firestore.rules`._

## 1. What a learner sees

* **Account level** Lv 1-30, grouped into 6 tiers (Ripple, Current, Tide, Swell, Crest, Tsunami).
  Not to be confused with the curriculum difficulty `users.level` (`basic|medium|intermediate`), which is untouched.
* **Badges.** Every level has two: a **Scholar** badge (finish a lesson while at that level) and a
  **Wall Breaker** badge (clear a counted Wall Breaker round at that level). Plus streak badges (3/7/14/30/60/100 days),
  lesson-count badges (1/10/25) and four game badges (First Wall, Flawless, Speed Breaker, Wall Veteran).
  73 total. *Catch-up rule:* each finish awards the **lowest unearned** level badge you qualify for, so nothing is
  permanently missable if you level up between lessons.
* **Leaderboards** (`pages/leaderboard.html`): All-time XP, This week (resets Monday 00:00 UTC), Streaks, Badges, plus
  "My badges". Each row shows level, XP, streak, badge count and recent badges. Learners can hide themselves.
* Dashboard shows a level/XP card; the game result screen shows the XP the server granted.

## 2. The economy (all numbers in `functions/xp-config.js`)

| Source | XP | Repeatable? |
|---|---|---|
| Lesson item (sign lesson / booster / practice) | 6 / 3 / 5 (+5 on `bonusXP` practice items) | **No** - once per item |
| Mastery Quiz pass (mission bonus) | 25 + 3 per sign, max 80 | **No** - once per mission |
| Wall Breaker brick | 1 static / 2 motion, only bricks of signs you have learned | yes, but capped |
| Wall cleared / flawless | +3 / +3 | yes, but capped |
| Time Attack target | 1 static / 2 motion for learned signs, adjusted by accuracy | yes, but capped |
| Time Attack completed sequence | +3 / +3 flawless bonus | yes, but capped |

Measured from the real `missions.js`: 69 missions, 1,718 items, **11,670 XP** of lessons in total; a median lesson is
**163 XP**, a typical 15-brick wall **21 XP** (~8x less). Lv 30 needs 13,050 XP, so lessons alone reach **Lv 28** and the
last two levels need the game (~1.4k XP, at least ~16 days at the cap). Level cost: 100 XP for Lv 1->2, then +25 each level.

**Game XP uses a shared hard cap of 90 XP/day** across both modes. Wall Breaker also applies per-wall accuracy
multipliers (1x / 0.8x / 0.5x) and diminishing returns per counted wall per local day (walls 1-3 full, 4-5 half,
6-7 quarter, 8+ zero). Time Attack pays for learned targets and accuracy, uses no Wall Breaker decay slots, and
does not award Wall Breaker badges. A Wall Breaker wall needs **>= 6 learned bricks**; Time Attack needs at least
one learned target, so short learner-eligible sequences can earn XP. Both modes use server-timed, one-use sessions.

## 3. Anti-cheat model (read this before changing anything)

The site is static: the browser talks to Firestore directly, so **anything a client may write, a user can forge**.
Therefore:

1. **No client write access** to `xpState`, `publicProfiles`, `xpSessions`, `xpEvents` (see `firestore.rules`). Only Cloud
   Functions (Admin SDK) write them. Editing JS in DevTools can at best send a request that is validated and refused.
2. **Server-held ledger.** Lesson XP is recorded per `missionId + itemIndex`; replays pay 0. Unknown items are rejected
   against `functions/curriculum-manifest.json`.
3. **Rate limits.** >= 2 s between lesson claims, >= 90 s between skip-path mission claims, lesson XP halves after 800/day.
4. **Server-timed game sessions.** The server stamps the start and mode; the client reports each target time; the
   server rejects impossible timing (static < 0.4 s, motion < 3 s between targets, total shorter than the server saw,
   duplicate/foreign targets, reused or expired session). Each session pays at most once. Time Attack awards no
   Wall Breaker-specific badges.
5. **Server-derived "learned".** Which signs count is computed from the server ledger, never from client data.
6. **Day/week boundaries** use a timezone stored server-side; it can change at most once per 14 days, so flipping the
   timezone cannot mint extra "days".
7. The admin account never earns XP. Rejected game runs are logged to `xpEvents` (admin-readable) for review.

### Known limits (honest list)
* **Recognition and quiz grading still run in the browser** (TensorFlow.js / `mastery-quiz.js`), so the server cannot
  watch a lesson happen. A determined user can script lesson claims - but only the *finite* 11,670 XP, at >= 2 s per item
  with a soft cap, and never the repeatable game XP. Closing this fully means grading quizzes server-side.
* **Legacy backfill is unverifiable** (old progress lives in client-writable docs). It is capped at **1,500 XP (~Lv 8)**,
  pays half rate, runs once per account, only for accounts created before `LAUNCH_AT_ISO`, and only for 14 days after launch.
* The app's existing dashboard streak (`missions.js`, local/synced) and the XP streak (server) are separate counters and can differ
  by a day. The leaderboard uses the server one.
* Names are public to other signed-in learners (opt-out toggle on the leaderboard page). Consider a display-name or
  opt-in policy before launch if your users are minors.

## 4. Data model

```
xpState/{uid}         PRIVATE (owner read)   xp, level, weeklyXp, weekKey, tz, streak{current,longest,lastDay}, badges{id:ms},
                                             lessonItems{mission:[idx]}, missionsDone{}, learnedSigns[], daily{}, totals{}, hidden, backfilled
publicProfiles/{uid}  signed-in+verified read name, xp, level, weeklyXp, weekKey, streak, streakExpiresAt, longestStreak, badgeCount, recentBadges[]
xpSessions/{uid}      no client access        current game: id, mode, startedAt, signs[], done
xpEvents/{id}         admin read              audit/rejections
```
`expireStaleStreaks` (hourly) zeroes `publicProfiles.streak` when `streakExpiresAt` passes, because nothing "runs" when a streak dies.
`syncPublicProfileFromUser` removes self-"deleted" learners from the boards and syncs renamed users.

## 5. Deploy checklist (in order)

1. **Set `LAUNCH_AT_ISO`** in `functions/xp-config.js` to the moment you deploy (controls who may backfill).
2. `cd functions && npm i && npm test` (106 checks, no Firebase needed).
3. `firebase deploy --only functions` (needs Blaze; first deploy enables Cloud Scheduler). If your Firestore database is not in
   `us-central1`, add `region` to `syncPublicProfileFromUser` in `functions/xp.js`.
4. Publish **`firestore.rules`** (Console -> Firestore -> Rules, or `firebase deploy --only firestore:rules`).
5. Create the composite index from **`firestore.indexes.json`** (publicProfiles: `weekKey` asc + `weeklyXp` desc). The console
   also prints a one-click link the first time "This week" is opened.
6. Deploy the static site.
Deploy functions **before** the site so claims never hit a missing function (if they do, the client queues and retries).

## 6. Maintaining it

* Changed `js/missions.js` (new sign/category/mission) or `js/engine/dictionary.js` (static/motion routing)? Run
  `npm run build:manifest` in `functions/`, then redeploy functions.
  Until then new items simply earn no XP (they are not in the manifest).
* Changed a level name, badge, or XP number? Edit `functions/xp-config.js`, then `npm run build:client` (regenerates
  `js/xp-config.js` - never hand-edit it).
* Adding a new XP source = a new **callable** that validates server-side. Never add a client write path.
