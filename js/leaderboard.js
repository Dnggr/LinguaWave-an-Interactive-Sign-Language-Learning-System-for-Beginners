/**
 * js/leaderboard.js — pages/leaderboard.html
 * Views: All-time XP · This week · Streaks · Badges (public boards from `publicProfiles`), each sortable
 *        highest-first / lowest-first, and "My badges" (the learner's own level-badge grid from their private xpState).
 *        "My badges" is NOT a tab: it is the button under the level card in the side panel (#lb-mine-btn).
 * Layout: boards in the main column, the learner's own level card in the right-hand side panel (#lb-me).
 * "How XP works" lives in a modal (#lb-how-dialog) opened from #lb-how-btn.
 * Read-only. All names are user-entered and PUBLIC to other signed-in learners, so every string is
 * escaped before it touches innerHTML.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let X, me = null, myState = null, view = 'xp', lastBoard = 'xp', dir = 'desc', token = 0;
  const cache = {};                              // kind -> rows (always best-first, as loaded); flipping the order never refetches
  // Lucide icons come from the shared registry in js/icons.js (inline SVG, currentColor). If it ever failed to load the
  // text next to each icon still reads on its own, so a missing icon degrades to "no icon", never to a broken glyph.
  const ico = (id, o) => (window.LWIcons ? window.LWIcons.markup(id, o) : '');

  const SCORE = {
    xp:     (r) => ({ big: (r.xp || 0).toLocaleString(), small: 'XP' }),
    weekly: (r) => ({ big: (r.weeklyXp || 0).toLocaleString(), small: 'XP this week' }),
    streak: (r) => ({ big: String(r.streak || 0), small: 'day streak' }),
    badges: (r) => ({ big: String(r.badgeCount || 0), small: 'badges' }),
  };

  function levelRowLabel(level) { const t = X.tierOf(level); return `<div class="lb-lv" style="--tier:${esc(t.color)}" title="${esc(t.name)}">${level}</div>`; }

  function rowHtml(r, rank, kind) {
    const s = SCORE[kind](r), mine = me && r.uid === me.uid;
    // Hover labels (title) + aria-label so each badge icon is named for mouse and screen-reader users alike.
    const icons = (r.recentBadges || []).map((id) => { const b = X.badgeInfo(id); return `<span class="lb-badge" role="img" title="${esc(b.name)}" aria-label="${esc(b.name)}" style="--bd:${esc(b.color || '#38bdf8')}">${ico(X.badgeIconId(id), { size: 'sm' })}</span>`; }).join('');
    // Badges board: show how many badges are NOT in the (max 5) recent icons, e.g. "+12".
    const extra = kind === 'badges' ? Math.max(0, (r.badgeCount || 0) - (r.recentBadges || []).length) : 0;
    const more = extra ? `<span class="lb-more" title="${extra} more badge${extra === 1 ? '' : 's'}" aria-label="${extra} more badges">+${extra}</span>` : '';
    return `<li class="lb-row${mine ? ' is-me' : ''}${rank <= 3 ? ' is-top' : ''}${kind === 'badges' ? ' lb-row--badges' : ''}">
      <div class="lb-rank">${rank}</div>
      ${levelRowLabel(r.level || 1)}
      <div><div class="lb-name">${esc(r.name || 'Learner')}${mine ? ' (you)' : ''}</div>
        <div class="lb-meta"><span class="lb-stat lb-stat--streak" title="Day streak" aria-label="${r.streak || 0} day streak">${ico('flame', { size: 'sm' })}${r.streak || 0}</span><span class="lb-stat" title="Badges earned" aria-label="${r.badgeCount || 0} badges earned">${ico('medal', { size: 'sm' })}${r.badgeCount || 0}</span><span class="lb-badges">${icons}${more}</span></div></div>
      <div class="lb-score">${esc(s.big)}<small>${esc(s.small)}</small></div></li>`;
  }

  // Rows are cached best-first. Ascending just reverses the list; each row keeps its REAL rank number, so the lowest
  // row on a 50-row board still reads "50", not "1". (Only the top 50 are loaded, so "Lowest first" orders those 50.)
  function renderBoard(kind) {
    const panel = $('lb-panel'), rows = cache[kind] || [];
    if (!rows.length) { panel.innerHTML = `<p class="lb-empty">${kind === 'weekly' ? 'Nobody has earned XP this week yet. Be the first!' : 'No learners on the board yet. Finish a lesson to appear here.'}</p>`; return; }
    const ranked = rows.map((r, i) => ({ r, rank: i + 1 }));
    if (dir === 'asc') ranked.reverse();
    let html = `<ol class="lb-list">${ranked.map((x) => rowHtml(x.r, x.rank, kind)).join('')}</ol>`;
    if (dir === 'asc') html += `<p class="lb-note">Lowest first, within the top ${rows.length} learners on this board. Rank numbers are unchanged.</p>`;
    if (me && !rows.some((r) => r.uid === me.uid)) html += `<p class="lb-note lb-me-pin">You are not in the top ${rows.length} on this board yet. Keep learning to climb!</p>`;
    panel.innerHTML = html;
  }

  async function showBoard(kind, force) {
    const my = ++token, panel = $('lb-panel');
    try {
      if (force || !cache[kind]) {
        panel.innerHTML = '<p class="lb-note">Loading…</p>';
        const rows = await X.loadBoard(kind);
        if (my !== token) return;
        cache[kind] = rows;
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
    return `<div class="bd is-${st}" style="--bd:${esc(b.color || '#38bdf8')}">
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
    const group = (title, ids) => `<section class="bd-group"><h3>${esc(title)}</h3><div class="bd-grid">${ids.map((id) => badgeCell(all[id], owned[id] ? 'earned' : 'todo')).join('')}</div></section>`;
    const lvGrid = (title, g) => {
      const nx = lowest(g), ids = perLevel(g), got = ids.filter((id) => owned[id]).length;
      const stateOf = (id) => owned[id] ? 'earned' : id === nx ? 'next' : all[id].level <= level ? 'ready' : 'locked';
      return `<section class="bd-group"><h3>${esc(title)} <span class="bd-count">${got}/${ids.length} earned</span></h3><div class="bd-grid">${ids.map((id) => badgeCell(all[id], stateOf(id))).join('')}</div></section>`;
    };
    $('lb-panel').innerHTML =
      `<p class="lb-note">You are Level ${level}. Finish a lesson or clear a wall to earn your next badge. Badges for levels you have already reached are handed out lowest first, so you can catch up on any you missed; higher levels unlock as you level up.</p>` +
      lvGrid('Lesson badges by level', 'lesson') + lvGrid('Wall Breaker badges by level', 'game') +
      group('Streaks', byGroup('streak')) + group('Milestones', [...byGroup('lesson'), ...byGroup('game')]);
  }

  function drawMe() {
    const el = $('lb-me'), xp = (myState && myState.xp) || 0, p = X.levelProgress(xp), t = X.tierOf(p.level);
    const badgeN = myState && myState.badges ? Object.keys(myState.badges).length : 0;
    el.style.setProperty('--tier', t.color);
    el.innerHTML = `<div class="xp-card__top"><div class="xp-level" aria-hidden="true">${p.level}</div>
      <div><p class="xp-card__name">${esc((me && me.name) || 'You')} · Level ${p.level} <span class="xp-tier">${ico(X.tierIconId(p.level), { size: 'sm' })}${esc(t.name)}</span></p>
      <p class="xp-card__sub">${xp.toLocaleString()} XP · ${badgeN} badge${badgeN === 1 ? '' : 's'}</p></div></div>
      <div><div class="xp-bar" role="progressbar" aria-label="Progress to next level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.pct}"><i style="width:${p.pct}%"></i></div>
      <div class="xp-bar__label"><span>${p.maxed ? 'Max level' : `${p.into} / ${p.need} XP to Level ${p.level + 1}`}</span></div></div>
      <button type="button" class="btn btn--ghost lb-mine-btn" id="lb-mine-btn" aria-pressed="${view === 'mine'}" aria-controls="lb-panel">${ico('medal', { size: 'sm' })}My badges <span class="lb-mine-btn__n">${badgeN}</span></button>`;
  }

  function drawPrivacy() {
    const box = $('lb-privacy'), hidden = !!(myState && myState.hidden);
    box.innerHTML = `<span>${hidden ? 'You are hidden from the public leaderboards.' : 'Your name, level, XP, streak and badges are visible to other learners.'}</span>
      <button type="button" class="btn btn--ghost btn--sm" id="lb-vis">${hidden ? 'Show me on leaderboards' : 'Hide me from leaderboards'}</button>`;
    $('lb-vis').addEventListener('click', async (ev) => {
      const b = ev.currentTarget; b.disabled = true;
      try { const r = await X.setVisibility(hidden); if (r && r.ok) { myState = { ...(myState || {}), hidden: !hidden }; drawPrivacy(); Object.keys(cache).forEach((k) => delete cache[k]); if (view !== 'mine') showBoard(view, true); } }
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
  }

  // v is a board ('xp' | 'weekly' | 'streak' | 'badges') or 'mine'. On 'mine' no tab is selected (it lives under the level
  // card, not in the tab row) and the order control is hidden because the badge grid has no ranking.
  function select(v) {
    view = v; if (v !== 'mine') lastBoard = v;
    document.querySelectorAll('#lb-tabs .lb-tab').forEach((b) => {
      const on = b.dataset.view === v;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = (v === 'mine' ? b.dataset.view === lastBoard : on) ? 0 : -1;   // roving tabindex: one Tab stop, arrow keys move between tabs
      b.setAttribute('aria-controls', 'lb-panel');
    });
    const mineBtn = $('lb-mine-btn');
    if (mineBtn) mineBtn.setAttribute('aria-pressed', String(v === 'mine'));
    $('lb-toolbar').hidden = v === 'mine';
    $('lb-panel').setAttribute('aria-labelledby', v === 'mine' ? 'lb-mine-btn' : `tab-${v}`);
    try { history.replaceState(null, '', `#${v}`); } catch { /* file:// or sandboxed frame */ }   // so a refresh or a shared link reopens the same view
    if (v === 'mine') showMine(); else showBoard(v);
  }

  async function init() {
    X = window.LWXP;
    if (!X) { $('lb-panel').innerHTML = '<p class="lb-empty">The leaderboard could not load. Refresh the page.</p>'; return; }
    try { await window.LWAuth.whenAuthReady(); } catch { /* ignore */ }
    me = window.LWAuth && window.LWAuth.getCurrentUser ? window.LWAuth.getCurrentUser() : null;
    try { myState = await X.getMyState(); } catch (e) { console.warn('[leaderboard] state failed', e); myState = null; }
    try { drawMe(); drawPrivacy(); } catch (e) { console.warn('[leaderboard] header failed', e); }
    wireHow();
    $('lb-tabs').addEventListener('click', (e) => { const b = e.target.closest('.lb-tab'); if (b) select(b.dataset.view); });
    // "My badges" button under the level card: opens the badge grid; pressing it again returns to the board you were on.
    $('lb-me').addEventListener('click', (e) => { if (e.target.closest('#lb-mine-btn')) select(view === 'mine' ? lastBoard : 'mine'); });
    // Order control: re-renders from the cache (no refetch).
    $('lb-sort').addEventListener('click', (e) => {
      const b = e.target.closest('.lb-sort__btn'); if (!b || b.dataset.dir === dir) return;
      dir = b.dataset.dir; syncSort(); if (view !== 'mine') renderBoard(view);
    });
    $('lb-tabs').addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const tabs = [...document.querySelectorAll('#lb-tabs .lb-tab')], i = tabs.findIndex((t) => t.dataset.view === (view === 'mine' ? lastBoard : view));
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; n.focus(); select(n.dataset.view);
    });
    const hash = location.hash.replace('#', ''); select(['xp', 'weekly', 'streak', 'badges', 'mine'].includes(hash) ? hash : 'xp');
  }
  if (window.LWXP) init(); else document.addEventListener('lwxp-ready', init, { once: true });
})();