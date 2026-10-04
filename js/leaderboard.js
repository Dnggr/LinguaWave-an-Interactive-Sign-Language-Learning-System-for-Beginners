/**
 * js/leaderboard.js — pages/leaderboard.html
 * Two sections:
 *   OVERALL  (Level · Streaks · Badges): public boards from `publicProfiles`, each sortable highest-first / lowest-first and
 *            limited to the top 10 / 25 / 50 (default 10; only that many rows are read). "My badges" (the learner's own
 *            level-badge grid from their private xpState) is separate: it is the button under the level card (#lb-mine-btn).
 *   GAMES    ("Game Leaderboards" tab): pick a game (Construct · Time Attack · Wall Breaker), then a difficulty, and see the
 *            fastest completed runs. Data + ranking rules: js/game-scores.js and js/game-scores-core.mjs. These are NOT XP
 *            boards; the old per-game XP tabs were replaced by this section (old #sentence / #wall / #timeAttack links still
 *            land on the matching game).
 * Layout: boards in the main column, the learner's own level card in the right-hand side panel (#lb-me).
 * "How XP works" lives in a modal (#lb-how-dialog) opened from #lb-how-btn.
 * Read-only. All names are user-entered and PUBLIC to other signed-in learners, so every string is
 * escaped before it touches innerHTML.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let X, me = null, myState = null, view = 'level', lastBoard = 'level', dir = 'desc', token = 0, mineFilter = 'all', max = 10;   // mineFilter: 'all' | 'owned' (My badges view)
  let GS = null, gameKey = 'construct';                                   // GS = window.LWGameScores once loaded
  const GAME_DEFAULT_DIFF = { construct: 'medium', timeAttack: 'standard', wall: '15' };   // each game's own default setting
  const gameDiff = { ...GAME_DEFAULT_DIFF };                                              // last difficulty picked per game
  const gameCache = {};                                                   // 'game:difficulty' -> { at, data }; short-lived so a replay shows up soon
  const GAME_CACHE_MS = 60000;
  const LEGACY_GAME_HASH = { sentence: 'construct', wall: 'wall', timeAttack: 'timeAttack' };   // pre-Game-Leaderboards links
  const cache = {};                              // kind -> { rows (always best-first), n (how many were requested) }; flipping the order never refetches
  // Lucide icons come from the shared registry in js/icons.js (inline SVG, currentColor). If it ever failed to load the
  // text next to each icon still reads on its own, so a missing icon degrades to "no icon", never to a broken glyph.
  const ico = (id, o) => (window.LWIcons ? window.LWIcons.markup(id, o) : '');

  const SCORE = {
    level:      (r) => ({ big: `Lv ${r.level || 1}`, small: `${(r.xp || 0).toLocaleString()} XP` }),
    streak:     (r) => ({ big: String(r.streak || 0), small: 'day streak' }),
    badges:     (r) => ({ big: String(r.badgeCount || 0), small: 'badges' }),
  };
  // Heading above each board: icon, title, and one line saying how it is ranked.
  const BOARD_INFO = {
    level:      { icon: 'trophy',     title: 'Top levels',            sub: 'Ranked by level. Total XP breaks ties.', empty: 'No learners on the board yet. Finish a lesson to appear here.' },
    streak:     { icon: 'flame',      title: 'Longest streaks',       sub: 'Ranked by current day streak.', empty: 'No active streaks right now. Earn XP today to start one!' },
    badges:     { icon: 'medal',      title: 'Most badges',           sub: 'Ranked by badges earned.', empty: 'No badges earned yet. Finish a lesson to get the first one.' },
  };
  const BOARDS = Object.keys(BOARD_INFO);

  function levelRowLabel(level) { const t = X.tierOf(level); return `<div class="lb-lv" style="--tier:${esc(t.color)}" title="${esc(t.name)}">${level}</div>`; }

  // Profile picture (learner's chosen ID from js/avatars.js). No pick yet -> a circle with their initial.
  function avatarCell(r) {
    if (window.LWAvatars) return window.LWAvatars.markup(r.avatar, { name: r.name });
    return `<span class="lw-avatar lw-avatar--initial" aria-hidden="true">${esc(String(r.name || '?').trim().charAt(0).toUpperCase() || '?')}</span>`;
  }

  function rowHtml(r, rank, kind) {
    const s = SCORE[kind](r), mine = me && r.uid === me.uid;
    // Hover labels (title) + aria-label so each badge icon is named for mouse and screen-reader users alike.
    const icons = (r.recentBadges || []).map((id) => { const b = X.badgeInfo(id); return `<span class="lb-badge" role="img" title="${esc(b.name)}" aria-label="${esc(b.name)}" style="--bd:${esc(b.color || '#38bdf8')}">${ico(X.badgeIconId(id), { size: 'sm' })}</span>`; }).join('');
    // Badges board: show how many badges are NOT in the (max 5) recent icons, e.g. "+12".
    const extra = kind === 'badges' ? Math.max(0, (r.badgeCount || 0) - (r.recentBadges || []).length) : 0;
    const more = extra ? `<span class="lb-more" title="${extra} more badge${extra === 1 ? '' : 's'}" aria-label="${extra} more badges">+${extra}</span>` : '';
    return `<li class="lb-row${mine ? ' is-me' : ''}${rank <= 3 ? ' is-top' : ''}${kind === 'badges' ? ' lb-row--badges' : ''}" data-rank="${rank <= 3 ? rank : ''}">
      <div class="lb-rank">${rank}</div>
      ${levelRowLabel(r.level || 1)}
      ${avatarCell(r)}
      <div><div class="lb-name">${esc(r.name || 'Learner')}${mine ? ' (you)' : ''}</div>
        <div class="lb-meta"><span class="lb-stat lb-stat--streak" title="Day streak" aria-label="${r.streak || 0} day streak">${ico('flame', { size: 'sm' })}${r.streak || 0}</span><span class="lb-stat" title="Badges earned" aria-label="${r.badgeCount || 0} badges earned">${ico('medal', { size: 'sm' })}${r.badgeCount || 0}</span><span class="lb-badges">${icons}${more}</span></div></div>
      <div class="lb-score">${esc(s.big)}<small>${esc(s.small)}</small></div></li>`;
  }

  // Rows are cached best-first. Only the first `max` are shown. Ascending just reverses that slice; each row keeps its REAL
  // rank number, so the lowest row of a top-10 still reads "10", not "1".
  function renderBoard(kind) {
    const panel = $('lb-panel'), info = BOARD_INFO[kind], rows = ((cache[kind] && cache[kind].rows) || []).slice(0, max);
    const head = `<div class="lb-board-head"><span class="lb-board-head__icon" aria-hidden="true">${ico(info.icon, { size: 'nav' })}</span>
      <div><h2 class="lb-board-head__title">${esc(info.title)}</h2><p class="lb-board-head__sub">${esc(info.sub)}</p></div>
      <span class="lb-board-head__count">Top ${max}</span></div>`;
    if (!rows.length) { panel.innerHTML = head + `<p class="lb-empty">${esc(info.empty)}</p>`; return; }
    const ranked = rows.map((r, i) => ({ r, rank: i + 1 }));
    if (dir === 'asc') ranked.reverse();
    let html = head + `<ol class="lb-list">${ranked.map((x) => rowHtml(x.r, x.rank, kind)).join('')}</ol>`;
    if (dir === 'asc') html += `<p class="lb-note">Lowest first, within the top ${rows.length} on this board. Rank numbers are unchanged.</p>`;
    if (me && !rows.some((r) => r.uid === me.uid)) html += `<p class="lb-note lb-me-pin">You are not in the top ${rows.length} on this board yet. Keep going to climb!</p>`;
    panel.innerHTML = html;
  }

  async function showBoard(kind, force) {
    const my = ++token, panel = $('lb-panel');
    try {
      const have = cache[kind];
      // A bigger limit than what was fetched needs a refetch, unless the last fetch already returned everyone there is.
      const enough = have && (have.n >= max || have.rows.length < have.n);
      if (force || !enough) {
        // Skeleton rows (same look as the Game Leaderboards) instead of a bare "Loading…" line.
        panel.innerHTML = '<div class="sk-group" role="status"><span class="sr-only">Loading the leaderboard…</span>' +
          [45, 35, 52, 40, 48, 38].map((w) => `<div class="sk-row"><span class="sk sk--line" style="--w:1.4rem"></span><span class="sk sk--circle" style="--s:36px"></span><span class="sk sk--line" style="--w:${w}%"></span><span class="sk sk--line" style="--w:4rem;margin-left:auto"></span></div>`).join('') +
          '</div>';
        const n = max, rows = await X.loadBoard(kind, n);
        if (my !== token) return;
        cache[kind] = { rows, n };
      }
      renderBoard(kind);
    } catch (e) {
      if (my !== token) return;
      console.warn('[leaderboard] load failed', e && e.code, e);
      const code = (e && e.code) || '';
      const why = code === 'permission-denied' ? 'Access denied. Verify your email, and make sure the XP rules are published.'
        : code === 'failed-precondition' ? 'The leaderboard needs a database index. Open the browser console for the one-click link.'
        : 'Check your connection and try again.';
      panel.innerHTML = `<p class="lb-empty">Could not load the leaderboard. ${esc(why)}</p>`;
    }
  }

  // One badge tile. `st` is one of:
  //   earned - you have it
  //   next   - the badge your next finished lesson/wall will award (the lowest unearned one at or below your level)
  //   ready  - unearned, and your level already allows it; it is awarded in order, after the "Up next" one
  //   locked - needs a higher level
  //   todo   - a milestone/streak badge you have not reached yet (these are not level-gated, so never "Locked")
  // The server (and js/xp.js) award level badges lowest-first as catch-up, which is why a Level 3 learner can have Lv 1 as
  // "Up next" with Lv 2 and Lv 3 "Available" behind it. They used to render as "Locked", which read like a bug.
  const BD_STATE = { earned: 'Earned', next: 'Up next', ready: 'Available', locked: 'Locked', todo: 'Not yet' };
  function badgeCell(b, st) {
    // Level badges are named "Ripple Scholar · Lv 4". Split the level off so it sits in its own chip instead of wrapping
    // onto a second line in a 150px tile (that wrap is what made the tiles uneven).
    const m = /^(.*?)\s·\sLv\s(\d+)$/.exec(b.name || '');
    const title = m ? m[1] : b.name, lv = m ? m[2] : '';
    const mark = st === 'earned' ? ico('check', { size: 'status' }) : st === 'locked' ? ico('locked', { size: 'status' }) : '';
    return `<div class="bd is-${st}" id="badge-${esc(b.id)}" tabindex="-1" style="--bd:${esc(b.color || '#38bdf8')}">
      <div class="bd__icon" aria-hidden="true">${ico(X.badgeIconId(b.id), { size: 'nav' })}</div>
      <div class="bd__name">${esc(title)}</div>${lv ? `<div class="bd__lv">Lv ${esc(lv)}</div>` : ''}
      <div class="bd__desc">${esc(b.desc)}</div><div class="bd__state">${mark}${BD_STATE[st]}</div></div>`;
  }
  function showMine() {
    ++token;
    const all = X.config.BADGES, owned = (myState && myState.badges) || {}, level = X.levelFromXp((myState && myState.xp) || 0);
    const byGroup = (g) => Object.keys(all).filter((id) => all[id].group === g && !all[id].level);
    const perLevel = (g) => Object.keys(all).filter((id) => all[id].group === g && all[id].level).sort((a, b) => all[a].level - all[b].level);
    const lowest = (g) => perLevel(g).find((id) => !owned[id] && all[id].level <= level);
    // Each group is a <details>, open by default (the reader can collapse any of them). The summary holds the <h2> (h1 > h2,
    // no skipped level) and an earned count. data-earned feeds the "Owned" filter, which hides empty groups.
    // revealTarget() re-opens a group a deep link points into.
    const group = (title, ids, key) => `<details class="bd-group" open data-earned="${ids.filter((id) => owned[id]).length}"${key ? ` id="bd-group-${key}" tabindex="-1"` : ''}><summary><h2 class="heading-md">${esc(title)} <span class="bd-count">${ids.filter((id) => owned[id]).length}/${ids.length} earned</span></h2></summary><div class="bd-grid">${ids.map((id) => badgeCell(all[id], owned[id] ? 'earned' : 'todo')).join('')}</div></details>`;
    const lvGrid = (title, g) => {
      const nx = lowest(g), ids = perLevel(g), got = ids.filter((id) => owned[id]).length;
      const stateOf = (id) => owned[id] ? 'earned' : id === nx ? 'next' : all[id].level <= level ? 'ready' : 'locked';
      return `<details class="bd-group" open data-earned="${got}"><summary><h2 class="heading-md">${esc(title)} <span class="bd-count">${got}/${ids.length} earned</span></h2></summary><div class="bd-grid">${ids.map((id) => badgeCell(all[id], stateOf(id))).join('')}</div></details>`;
    };
    const ownedN = Object.keys(all).filter((id) => owned[id]).length;
    $('lb-panel').innerHTML =
      `<p class="lb-note">You are Level ${level}. Finish a lesson, clear a wall or finish a sentence run to earn your next badge. Badges for levels you have already reached are handed out lowest first, so you can catch up on any you missed; higher levels unlock as you level up.</p>` +
      `<div class="lb-toolbar"><span class="lb-toolbar__label" id="bd-filter-label">Show</span><div class="lb-sort" role="group" aria-labelledby="bd-filter-label" id="bd-filter"><button type="button" class="lb-sort__btn" data-filter="all" aria-pressed="true">All badges</button><button type="button" class="lb-sort__btn" data-filter="owned" aria-pressed="false">Owned (${ownedN})</button></div></div>` +
      lvGrid('Lesson badges by level', 'lesson') + lvGrid('Wall Breaker badges by level', 'game') + lvGrid('Construct a Sentence badges by level', 'sentence') +
      group('Streaks', byGroup('streak'), 'streak') + group('Milestones', [...byGroup('lesson'), ...byGroup('game'), ...byGroup('sentence')], 'milestones') +
      '<p class="lb-empty bd-none" hidden>You have not earned any badges yet. Finish a lesson, clear a wall or finish a sentence run to get your first.</p>';
    applyMineFilter();
  }
  // "Owned" filter: pure show/hide (no re-render), so groups the reader collapsed stay collapsed. Empty groups are hidden by CSS
  // (data-earned="0"); if nothing at all is owned, a short message shows instead.
  function applyMineFilter() {
    const panel = $('lb-panel'), owned = mineFilter === 'owned';
    panel.classList.toggle('is-owned-only', owned);
    panel.querySelectorAll('#bd-filter .lb-sort__btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === mineFilter)));
    const none = panel.querySelector('.bd-none');
    if (none) none.hidden = !(owned && !panel.querySelector('.bd.is-earned'));
  }

  // Deep link into "My badges": leaderboard.html#mine/<element id>, e.g. #mine/badge-streak_7 (one tile) or
  // #mine/bd-group-streak (a whole group). Links come from the Profile page (js/profile-page.js, js/xp-ui.js).
  // Only elements inside #lb-panel are honoured, so a hash can never focus something elsewhere on the page.
  let linkTimer = 0;
  function revealTarget(id) {
    clearTimeout(linkTimer);
    document.querySelectorAll('#lb-panel .is-linked').forEach((n) => n.classList.remove('is-linked'));
    const el = id ? $(id) : null;
    if (!el || !$('lb-panel').contains(el)) return;
    const grp = el.closest('details'); if (grp) grp.open = true;   // badge groups are collapsed by default; a deep link must open its group before scrolling
    const calm = document.documentElement.classList.contains('lw-force-reduced-motion') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    el.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' });
    try { el.focus({ preventScroll: true }); } catch { /* old browsers: the ring below still shows */ }
    el.classList.add('is-linked');
    linkTimer = setTimeout(() => el.classList.remove('is-linked'), 3500);
  }


  /* ======================= Game Leaderboards =======================
   * Picker state lives in gameKey / gameDiff. Entering the tab draws the shell once (game cards, difficulty pills, note, body);
   * switching game or difficulty only redraws the pills and the body, so focus and scroll stay where they were.
   * Ranking is NOT done here: js/game-scores.js hands back rows already validated, sorted and numbered. */
  const gamesHash = () => `#games/${gameKey}/${gameDiff[gameKey]}`;

  // The module is a deferred ES module, so it can arrive after this script. If it never does, show the error state, not a forever-skeleton.
  function getGS() {
    if (window.LWGameScores) return Promise.resolve(window.LWGameScores);
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(Object.assign(new Error('game scores module unavailable'), { code: 'unavailable' })), 8000);
      document.addEventListener('lwgamescores-ready', () => { clearTimeout(t); resolve(window.LWGameScores); }, { once: true });
    });
  }

  const missText = (n) => `${n} miss${n === 1 ? '' : 'es'}`;
  // Skeleton that mirrors the real layout: 3 podium cards, a header row, then rows with avatar + name + time (+ misses).
  function gameSkeleton(showMisses) {
    const row = `<div class="gl-row gl-row--sk${showMisses ? '' : ' gl-row--nomiss'}"><span class="sk sk--line" style="--w:1.4rem"></span><div class="gl-player"><span class="sk sk--circle" style="--s:36px"></span><span class="sk sk--line" style="--w:55%"></span></div><span class="sk sk--line" style="--w:4.2rem"></span>${showMisses ? '<span class="sk sk--line" style="--w:1.6rem"></span>' : ''}</div>`;
    const pod = '<div class="gl-pod gl-pod--sk"><span class="sk sk--circle" style="--s:20px"></span><span class="sk sk--circle" style="--s:48px"></span><span class="sk sk--line" style="--w:60%"></span><span class="sk sk--line" style="--w:40%;--h:.7rem"></span></div>';
    return `<div class="sk-group" role="status"><span class="sr-only">Loading the leaderboard…</span><div class="gl-podium gl-podium--sk">${pod}${pod}${pod}</div>${row.repeat(7)}</div>`;
  }

  function stateHtml(kind, game) {
    if (kind === 'error') {
      return `<div class="gl-state gl-state--error" role="alert"><span class="gl-state__icon" aria-hidden="true">${ico('x', { size: 'nav' })}</span>
        <h3 class="gl-state__title">Something went wrong</h3><p class="gl-state__text">We couldn't load the leaderboard.<br>Please try again.</p>
        <button type="button" class="btn btn--primary" data-gl-retry>Retry</button></div>`;
    }
    return `<div class="gl-state"><span class="gl-state__icon" aria-hidden="true">${ico('trophy', { size: 'nav' })}</span>
      <h3 class="gl-state__title">No leaderboard data yet</h3><p class="gl-state__text">Be the first to complete a game<br>and start climbing the rankings!</p>
      <a class="btn btn--primary" href="${esc(game.page)}">Play Game</a></div>`;
  }

  function podiumHtml(rows, game) {
    const pod = (r) => `<div class="gl-pod gl-pod--${r.rank}${isMe(r) ? ' is-me' : ''}" aria-label="Rank ${r.rank}: ${esc(r.name || 'Learner')}">
      <span class="gl-pod__rank"><span class="gl-pod__medal" aria-hidden="true">${ico('medal', { size: 'sm' })}</span>#${r.rank}</span>
      ${avatarCell(r)}
      <span class="gl-pod__name">${esc(r.name || 'Learner')}${isMe(r) ? ' (you)' : ''}</span>
      <span class="gl-pod__stats"><span class="gl-pod__time">${esc(GS.formatTime(r.timeMs))}</span>${game.showMisses ? `<span class="gl-pod__miss">${esc(missText(r.misses))}</span>` : ''}</span></div>`;
    // DOM order is 1,2,3 (reading order); CSS arranges the desktop podium as 2-1-3.
    return `<div class="gl-podium" aria-label="Top three players">${rows.slice(0, 3).map(pod).join('')}</div>`;
  }

  function isMe(r) { return !!(me && r.uid === me.uid); }

  function gameRowHtml(r, game) {
    const mine = isMe(r), top = r.rank <= 3;
    return `<li class="lb-row gl-row${game.showMisses ? '' : ' gl-row--nomiss'}${mine ? ' is-me' : ''}${top ? ' is-top' : ''}" data-rank="${top ? r.rank : ''}"${mine ? ' aria-current="true"' : ''}
      aria-label="Rank ${r.rank}, ${esc(r.name || 'Learner')}${mine ? ' (you)' : ''}, ${esc(GS.formatTime(r.timeMs))}${game.showMisses ? ', ' + esc(missText(r.misses)) : ''}">
      <div class="lb-rank">${r.rank}</div>
      <div class="gl-player">${avatarCell(r)}<div class="lb-name">${esc(r.name || 'Learner')}${mine ? ' (you)' : ''}</div></div>
      <div class="gl-time">${esc(GS.formatTime(r.timeMs))}</div>${game.showMisses ? `<div class="gl-miss">${r.misses}</div>` : ''}</li>`;
  }

  // Line under the pickers about the learner's own standing. Never invents a rank: a number only when they are on the board.
  function youHtml(data, game) {
    const m = data.mine, res = m ? `${GS.formatTime(m.timeMs)}${game.showMisses ? ' · ' + missText(m.misses) : ''}` : '';
    if (m && m.rank) return `<p class="gl-you" role="status"><span class="gl-you__rank">Your rank <b>#${m.rank}</b></span><span>${esc(res)}</span></p>`;
    if (m && m.outside) return `<p class="gl-you" role="status"><span>Your best is ${esc(res)}. It is outside the rows shown here, so no rank is displayed.</span></p>`;
    if (m && m.hidden) return `<p class="gl-you" role="status"><span>You have a result (${esc(res)}), but you are hidden from the public leaderboards. Use the switch below to show yourself.</span></p>`;
    if (!me) return '';
    return `<p class="gl-you gl-you--none" role="status"><span>You don't have a completed result for this game yet.<br>Play a game to appear on the leaderboard.</span></p>`;
  }

  function renderGameBody(data) {
    const body = $('gl-body'); if (!body) return;
    const game = GS.GAMES[gameKey];
    body.removeAttribute('aria-busy');
    if (!data.rows.length) {
      // "No data" and "you have no result" are the same thing here, so the empty card carries the message.
      body.innerHTML = stateHtml('empty', game); return;
    }
    const head = `<div class="gl-head${game.showMisses ? '' : ' gl-row--nomiss'}" aria-hidden="true"><span><span class="gl-rank-full">Rank</span><span class="gl-rank-short">#</span></span><span>Player</span><span class="gl-time">Time</span>${game.showMisses ? '<span class="gl-miss">Misses</span>' : ''}</div>`;
    body.innerHTML = youHtml(data, game)
      + (data.rows.length >= 3 ? podiumHtml(data.rows, game) : '')
      + `<div class="gl-table">${head}<ol class="lb-list">${data.rows.map((r) => gameRowHtml(r, game)).join('')}</ol></div>`
      + (data.capped && data.rows.length >= 50 ? `<p class="lb-note">Showing the top ${data.rows.length}.</p>` : '');
  }

  function renderGameError(e) {
    console.warn('[leaderboard] game board failed', e && e.code, e);
    const body = $('gl-body') || $('lb-panel');
    body.removeAttribute && body.removeAttribute('aria-busy');
    const code = (e && e.code) || '';
    const hint = code === 'permission-denied' ? '<p class="lb-note gl-hint">Access denied. Verify your email, and make sure the latest Firestore rules (gameScores) are published.</p>' : '';
    body.innerHTML = stateHtml('error', null) + hint;
  }

  // (Re)load the selected board. `force` skips the short cache (Retry, visibility change).
  async function loadGames(force) {
    const my = ++token, body = $('gl-body'); if (!body) return;
    const game = GS.GAMES[gameKey], diff = gameDiff[gameKey], key = `${gameKey}:${diff}`, hit = gameCache[key];
    if (!force && hit && Date.now() - hit.at < GAME_CACHE_MS) { renderGameBody(hit.data); return; }
    body.setAttribute('aria-busy', 'true');
    body.innerHTML = gameSkeleton(game.showMisses);
    try {
      const data = await GS.loadBoard(gameKey, diff);
      if (my !== token) return;                      // the learner already picked something else
      gameCache[key] = { at: Date.now(), data };
      renderGameBody(data);
    } catch (e) { if (my === token) renderGameError(e); }
  }

  function drawGameControls() {
    const game = GS.GAMES[gameKey], diff = gameDiff[gameKey];
    document.querySelectorAll('#gl-games .gl-card').forEach((b) => {
      const on = b.dataset.game === gameKey;
      b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1;
    });
    const wrap = $('gl-diff');
    if (game.boards.length > 1) {
      wrap.hidden = false;
      wrap.innerHTML = `<span class="lb-toolbar__label" id="gl-diff-label">${esc(game.difficultyLabel || 'Difficulty')}</span>
        <div class="lb-sort" role="group" aria-labelledby="gl-diff-label">${game.boards.map((b) => `<button type="button" class="lb-sort__btn" data-diff="${esc(b.id)}" aria-pressed="${b.id === diff}"${b.sub ? ` aria-label="${esc(b.label + ', ' + b.sub)}"` : ''}>${esc(b.label)}${b.sub ? `<span class="gl-sub"> · ${esc(b.sub)}</span>` : ''}</button>`).join('')}</div>`;
    } else { wrap.hidden = true; wrap.innerHTML = ''; }    // Time Attack has one ranking: no difficulty picker
    $('gl-note').textContent = game.note;
    $('gl-body').setAttribute('aria-labelledby', `gl-game-${gameKey}`);
    try { history.replaceState(null, '', gamesHash()); } catch { /* file:// or sandboxed frame */ }
  }

  function pickGame(key) {
    if (!GS || !GS.GAMES[key] || key === gameKey) return;
    gameKey = key; drawGameControls(); loadGames();
  }
  function pickDifficulty(id) {
    if (!GS || id === gameDiff[gameKey] || !GS.boardOf(gameKey, id)) return;
    gameDiff[gameKey] = id; drawGameControls(); loadGames();
  }

  async function showGames() {
    const my = ++token, panel = $('lb-panel');
    panel.removeAttribute('aria-busy');
    panel.innerHTML = `<div class="sk-group" role="status"><span class="sr-only">Loading the leaderboard…</span><div class="sk-row"><span class="sk sk--block" style="--h:4rem"></span><span class="sk sk--block" style="--h:4rem"></span><span class="sk sk--block" style="--h:4rem"></span></div></div>`;
    try { GS = await getGS(); } catch (e) { if (my === token) renderGameError(e); return; }
    if (my !== token) return;
    const G = GS.GAMES;
    if (!GS.boardOf(gameKey, gameDiff[gameKey])) gameDiff[gameKey] = GAME_DEFAULT_DIFF[gameKey];   // e.g. a hand-edited #games/wall/999
    panel.innerHTML = `<section class="gl" aria-labelledby="gl-title">
      <div class="lb-board-head"><span class="lb-board-head__icon" aria-hidden="true">${ico('trophy', { size: 'nav' })}</span>
        <div><h2 class="lb-board-head__title" id="gl-title">Game Leaderboards</h2><p class="lb-board-head__sub">Competitive game rankings: your fastest completed run. Separate from your overall learning rank.</p></div></div>
      <div class="gl-games" role="tablist" aria-label="Game" id="gl-games">${GS.GAME_KEYS.map((k) => `<button type="button" class="gl-card" role="tab" id="gl-game-${k}" data-game="${k}" aria-selected="false" aria-controls="gl-body" tabindex="-1">
        <span class="gl-card__icon" aria-hidden="true">${ico(G[k].icon, { size: 'nav' })}</span>
        <span class="gl-card__text"><span class="gl-card__name">${esc(G[k].label)}</span><span class="gl-card__desc">${esc(G[k].blurb)}</span></span></button>`).join('')}</div>
      <div class="gl-diff lb-toolbar" id="gl-diff"></div>
      <p class="lb-note gl-note" id="gl-note"></p>
      <div id="gl-body" role="tabpanel" aria-live="polite"></div></section>`;
    drawGameControls();
    loadGames();
  }

  function drawMe() {
    const el = $('lb-me'), xp = (myState && myState.xp) || 0, p = X.levelProgress(xp), t = X.tierOf(p.level);
    const badgeN = myState && myState.badges ? Object.keys(myState.badges).length : 0;
    el.style.setProperty('--tier', t.color);
    el.innerHTML = `<div class="xp-card__top"><div class="xp-level" aria-hidden="true">${p.level}</div>
      <div><p class="xp-card__name">${esc((me && me.name) || 'You')} · Level ${p.level} <span class="xp-tier">${ico(X.tierIconId(p.level), { size: 'sm' })}${esc(t.name)}</span></p>
      <p class="xp-card__sub">${xp.toLocaleString()} XP · ${badgeN} badge${badgeN === 1 ? '' : 's'}</p></div></div>
      <div><div class="xp-bar" role="progressbar" aria-label="Progress to next level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.pct}"><i style="--p:${p.pct / 100}"></i></div>
      <div class="xp-bar__label"><span>${p.maxed ? 'Max level' : `${p.into} / ${p.need} XP to Level ${p.level + 1}`}</span></div></div>
      <button type="button" class="btn btn--ghost lb-mine-btn" id="lb-mine-btn" aria-pressed="${view === 'mine'}" aria-controls="lb-panel">${ico('medal', { size: 'sm' })}My badges <span class="lb-mine-btn__n">${badgeN}</span></button>`;
  }

  function drawPrivacy() {
    const box = $('lb-privacy'), hidden = !!(myState && myState.hidden);
    box.innerHTML = `<span>${hidden ? 'You are hidden from the public leaderboards.' : 'Your name, level, XP, streak, badges and game times are visible to other learners.'}</span>
      <button type="button" class="btn btn--ghost btn--sm" id="lb-vis">${hidden ? 'Show me on leaderboards' : 'Hide me from leaderboards'}</button>`;
    $('lb-vis').addEventListener('click', async (ev) => {
      const b = ev.currentTarget; b.disabled = true;
      try { const r = await X.setVisibility(hidden); if (r && r.ok) { myState = { ...(myState || {}), hidden: !hidden }; drawPrivacy(); Object.keys(cache).forEach((k) => delete cache[k]); Object.keys(gameCache).forEach((k) => delete gameCache[k]); if (view === 'games') { if (GS && $('gl-body')) loadGames(true); } else if (view !== 'mine') showBoard(view, true); } }
      catch (e) { console.warn('[leaderboard] visibility failed', e); b.disabled = false; }
    });
  }

  // "How XP works" modal. Native <dialog>: Esc and the focus trap are the browser's. A click on the
  // <dialog> element itself (its padding is 0, so that can only be the backdrop) closes it.
  function wireHow() {
    const dlg = $('lb-how-dialog'), openBtn = $('lb-how-btn');
    if (!dlg || !openBtn) return;
    const close = () => { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); };
    openBtn.addEventListener('click', () => { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); });
    $('lb-how-close').addEventListener('click', close);
    $('lb-how-ok').addEventListener('click', close);
    dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  }

  function syncSort() {
    document.querySelectorAll('#lb-sort .lb-sort__btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.dir === dir)));
    document.querySelectorAll('#lb-limit .lb-sort__btn').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.limit) === max)));
  }

  // v is an overall board (level | streak | badges), 'games' (Game Leaderboards) or 'mine'. On 'mine' no tab is selected (it lives under the level
  // card, not in the tab row) and the order control is hidden because the badge grid has no ranking.
  function select(v, target) {
    view = v; if (v !== 'mine') lastBoard = v;
    document.querySelectorAll('#lb-tabs .lb-tab').forEach((b) => {
      const on = b.dataset.view === v;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = (v === 'mine' ? b.dataset.view === lastBoard : on) ? 0 : -1;   // roving tabindex: one Tab stop, arrow keys move between tabs
      b.setAttribute('aria-controls', 'lb-panel');
    });
    const mineBtn = $('lb-mine-btn');
    if (mineBtn) mineBtn.setAttribute('aria-pressed', String(v === 'mine'));
    $('lb-toolbar').hidden = v === 'mine' || v === 'games';   // order/limit only apply to the overall boards
    $('lb-panel').setAttribute('aria-labelledby', v === 'mine' ? 'lb-mine-btn' : `tab-${v}`);
    try { history.replaceState(null, '', v === 'games' ? gamesHash() : `#${v}${v === 'mine' && target ? '/' + target : ''}`); } catch { /* file:// or sandboxed frame */ }   // so a refresh or a shared link reopens the same view
    // A deep link may point at a badge you do not own yet, so it always resets the Owned filter to "all".
    if (v === 'mine') { if (target) mineFilter = 'all'; showMine(); revealTarget(target); } else if (v === 'games') { revealTarget(); showGames(); } else { revealTarget(); showBoard(v); }
  }

  async function init() {
    X = window.LWXP;
    if (!X) { $('lb-panel').innerHTML = '<p class="lb-empty">The leaderboard could not load. Refresh the page.</p>'; return; }
    try { await window.LWAuth.whenAuthReady(); } catch { /* ignore */ }
    me = window.LWAuth && window.LWAuth.getCurrentUser ? window.LWAuth.getCurrentUser() : null;
    try { myState = await X.getMyState(); } catch (e) { console.warn('[leaderboard] state failed', e); myState = null; }
    try { drawMe(); drawPrivacy(); } catch (e) { console.warn('[leaderboard] header failed', e); }
    wireHow();
    $('lb-panel').addEventListener('click', (e) => { const b = e.target.closest('#bd-filter .lb-sort__btn'); if (b && b.dataset.filter !== mineFilter) { mineFilter = b.dataset.filter; applyMineFilter(); } });
    $('lb-tabs').addEventListener('click', (e) => { const b = e.target.closest('.lb-tab'); if (b) select(b.dataset.view); });
    // Game Leaderboards controls + Retry (all inside #lb-panel, which is re-rendered, so one delegated listener).
    $('lb-panel').addEventListener('click', (e) => {
      const card = e.target.closest('#gl-games .gl-card'); if (card) { pickGame(card.dataset.game); return; }
      const dbtn = e.target.closest('#gl-diff .lb-sort__btn'); if (dbtn) { pickDifficulty(dbtn.dataset.diff); return; }
      // Retry re-runs the same loader (no page reload). If even the module failed to arrive there is no shell yet, so start over.
      if (e.target.closest('[data-gl-retry]')) { if (GS && $('gl-body')) loadGames(true); else showGames(); }
    });
    $('lb-panel').addEventListener('keydown', (e) => {
      if ((e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') || !e.target.closest('#gl-games')) return;
      const cards = [...document.querySelectorAll('#gl-games .gl-card')], i = cards.findIndex((c) => c.dataset.game === gameKey);
      const n = cards[(i + (e.key === 'ArrowRight' ? 1 : cards.length - 1)) % cards.length]; e.preventDefault(); n.focus(); pickGame(n.dataset.game);
    });
    // "My badges" button under the level card: opens the badge grid; pressing it again returns to the board you were on.
    $('lb-me').addEventListener('click', (e) => { if (e.target.closest('#lb-mine-btn')) select(view === 'mine' ? lastBoard : 'mine'); });
    // Order control: re-renders from the cache (no refetch).
    $('lb-sort').addEventListener('click', (e) => {
      const b = e.target.closest('.lb-sort__btn'); if (!b || b.dataset.dir === dir) return;
      dir = b.dataset.dir; syncSort(); if (view !== 'mine') renderBoard(view);
    });
    // Limit control: Top 10 / 25 / 50. Fetches again only when the new limit is bigger than what is already loaded.
    $('lb-limit').addEventListener('click', (e) => {
      const b = e.target.closest('.lb-sort__btn'); if (!b || Number(b.dataset.limit) === max) return;
      max = Number(b.dataset.limit); syncSort(); if (view !== 'mine') showBoard(view);
    });
    $('lb-tabs').addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const tabs = [...document.querySelectorAll('#lb-tabs .lb-tab')], i = tabs.findIndex((t) => t.dataset.view === (view === 'mine' ? lastBoard : view));
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; n.focus(); select(n.dataset.view);
    });
    const [hashView, hashTarget, hashDiff] = location.hash.replace('#', '').split('/');   // "#mine", "#mine/badge-streak_7", "#games/wall/21"
    let start = [...BOARDS, 'games', 'mine'].includes(hashView) ? hashView : 'level';   // old #xp / #weekly links fall back to Level
    if (LEGACY_GAME_HASH[hashView]) { start = 'games'; gameKey = LEGACY_GAME_HASH[hashView]; }   // old #sentence / #wall / #timeAttack links
    else if (hashView === 'games' && Object.prototype.hasOwnProperty.call(gameDiff, hashTarget)) {
      gameKey = hashTarget;
      if (hashDiff) gameDiff[gameKey] = hashDiff;   // checked against the game's real boards in showGames(); a bad value falls back to the default
    }
    select(start, start === 'mine' ? hashTarget : undefined);
  }
  if (window.LWXP) init(); else document.addEventListener('lwxp-ready', init, { once: true });
})();