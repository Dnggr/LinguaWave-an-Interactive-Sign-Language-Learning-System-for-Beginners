# LinguaWave XP, Levels, Badges, Streaks & Leaderboards

_Spark-plan design, updated 2026-10-03. `js/xp-engine.mjs` contains the browser economy; `js/xp.js` writes the learner's XP documents through Firestore transactions. The `functions/xp*.js` implementation is retained as legacy code and is not the deployed XP path._

## Learner experience and economy

Account levels run from 1 to 30 and are separate from the curriculum difficulty in `users.level` (`basic|medium|intermediate`). The 73 badges include Scholar and Wall Breaker badges for every level, streak badges, mission-count badges, and four game badges. Catch-up awards the lowest eligible unearned level badge.

The app has four leaderboard views: all-time XP, weekly XP, streaks, and badge count, plus a personal “My badges” view. Learners can hide their public row. Weekly boards use UTC week keys.

| Source | XP | Repeat rule |
|---|---:|---|
| Lesson item | 6 / 3 / 5 for LESSON / BOOSTER / PRACTICE; eligible practice adds 5 | Once per mission item |
| Mastery Quiz mission bonus | 25 + 3 per lesson sign, capped at 80 | Once per mission |
| Wall Breaker brick | 1 static / 2 motion for learned signs | Shared 90 XP daily game cap; per-wall decay |
| Cleared wall / flawless bonus | +3 / +3 | Same game cap and decay |
| Time Attack target | 1 static / 2 motion, adjusted by accuracy | Shared 90 XP daily game cap; no Wall Breaker decay |
| Time Attack completion / flawless bonus | +3 / +3 | Same game cap |

The game cap is 90 XP per day across Wall Breaker and Time Attack. Wall Breaker requires at least six learned bricks; its reward decays after the third, fifth, and seventh eligible wall. Time Attack requires all selected targets to be learned and never awards Wall Breaker badges. The level curve reaches Level 30 at 13,050 XP.

## Spark write path

* `js/xp-engine.mjs` is a pure module with no Firebase or DOM access. It owns the browser XP economy and can be imported by Node.
* `js/xp.js` exposes the existing `window.LWXP` API. Lesson, mission, game, backfill, visibility, and profile-sync writes are serialized through a page queue. Offline lesson/mission claims stay in `lw_xp_pending_v2:<uid>` for retry.
* Every committed state change writes `xpState/{uid}` and `publicProfiles/{uid}` in one transaction. `lastWriteAt` and `updatedAt` use Firestore server timestamps. Hidden or deletion-requested accounts have no public row.
* `xpSessions` and `xpEvents` are legacy collections; the browser no longer reads or writes them. Game sessions exist in memory in the page, and the browser checks elapsed time and sign type before awarding XP.
* `getLearnedSigns()` returns the union of `xpState.learnedSigns` and signs with completed LESSON items in `window.LWMissions`. Wall Breaker and Time Attack use this same method for eligibility and target pools.
* `js/xp-config.js` is a display-only legacy mirror. Do not generate economy values from `functions/xp-config.js`. Changes to the economy, level curve, tiers, or badge catalogue belong in `js/xp-engine.mjs` and must preserve the values above.
* The Cloud Functions XP implementation and its manifest/build scripts remain in `functions/` for reference only. They are not required for XP on Spark and must not be deployed as part of this path. Signup's optional email-deliverability pre-check still calls a function and fails open when unavailable.

## Rules and anti-cheat limits

Publish the checked-in `firestore.rules` by pasting it into Firebase Console → Firestore Database → Rules → Publish. The XP rules require a verified owner, whitelist the stored fields, enforce XP/level consistency, prevent XP decreases, cap ordinary XP increases at 100 per write, allow one legacy backfill of up to 1,500 XP on first creation or a one-time `backfilled` transition, cap daily game XP at 90, limit badges to 73, pace state writes, compare the public row with `xpState` using `getAfter()`, deny browser deletion of the private state, and pair public-row deletion with hide/account-deletion state.

These checks limit damage; they do not make browser XP server-authoritative. A learner can edit browser code and forge lesson completion, game results, learned signs, streak days, or timezone data within the rule caps. Client clock changes can cheat day boundaries. Game timing is measured by the browser and can be faked. The rules also cannot remove a stale admin row from another user's collection query; admin XP writes are blocked, and any prior admin row must be removed.

The learner account `linguawave.project@gmail.com` is excluded in the client and blocked from XP writes in the rules. Public profiles are visible to verified users and include a learner-selected display name; use an opt-out or consider an opt-in policy if learners are minors.

## Legacy backfill

Backfill reads local completed-item progress once, pays half rate, and caps the grant at 1,500 XP. Eligibility uses Firebase Auth's `currentUser.metadata.creationTime`; client-supplied dates are not accepted. With `LAUNCH_AT_ISO` set to `2026-10-01T00:00:00Z`, the 14-day window closes **2026-10-15**. The owner should decide whether to move that date before launch.

Legacy progress itself is client-writable and cannot be verified. Backfill therefore remains honor-system despite its cap and one-time marker.

## Data model

```text
xpState/{uid}         private, owner read/create/update (no client delete): xp, level, weeklyXp, weekKey, tz,
                      tzChangedAt, streak, badges, lessonItems, missionsDone,
                      learnedSigns, daily, totals, lastClaimAt, lastSkipAt,
                      backfilled, hidden, createdAt, lastWriteAt
publicProfiles/{uid}  verified-user read: name, xp, level, weeklyXp, weekKey,
                      streak, longestStreak, streakExpiresAt, badgeCount,
                      recentBadges, avatar (optional), updatedAt
xpSessions/{uid}      denied; legacy
xpEvents/{id}         denied; legacy
```

`lastWriteAt` is server-timestamped and rules require about two seconds between writes. Existing documents without it get one migration write. The profile row must be updated/deleted in the same transaction as the state document.

## Verification

```sh
node js/_test_xp-engine.node.mjs
node js/_test_xp-client.node.mjs
```

The engine test covers the economy, levels, badges, cooldowns, game payouts, streaks, timezone handling, and backfill. The client harness uses fake Firestore to check transaction pairing, queue serialization, offline retry, error-message throttling, visibility, and a game claim. These are not emulator tests. No Firebase emulator/rules-unit-testing package is currently installed in this repository.

After publishing rules and deploying the static site, verify a verified learner can earn XP and see a matching `xpState` / `publicProfiles` pair. Confirm unverified users, cross-user writes, XP decreases, over-cap grants, and game XP above 90 are rejected. Do not deploy Cloud Functions for XP on Spark.
## Game Leaderboards are not XP boards
The leaderboard page's game rankings (Construct, Time Attack, Wall Breaker) rank fastest completed runs from `gameScores`, not XP.
`wallXp` / `timeAttackXp` / `sentenceXp` and `LWXP.loadBoard('wall' | 'timeAttack' | 'sentence')` still exist but the page no longer
shows them. See `SYSTEM_ARCHITECTURE.md` ("Game Leaderboards").
