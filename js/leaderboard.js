/**
 * js/leaderboard.js — pages/leaderboard.html
 * Views: All-time XP · This week · Streaks · Badges (public boards from `publicProfiles`)
 *        and "My badges" (the learner's own level-badge grid from their private xpState).
 * Read-only. All names are user-entered and PUBLIC to other signed-in learners, so every string is
 * escaped before it touches innerHTML.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let X, me = null, myState = null, view = 'xp', token = 0;

  const SCORE = {
    xp:     (r) => ({ big: (r.xp || 0).toLocaleString(), small: 'XP' }),
    weekly: (r) => ({ big: (r.weeklyXp || 0).toLocaleString(), small: 'XP this week' }),
    streak: (r) => ({ big: String(r.streak || 0), small: 'day streak' }),
    badges: (r) => ({ big: String(r.badgeCount || 0), small: 'badges' }),
  };

  function levelRowLabel(level) { const t = X.tierOf(level); return `<div class="lb-lv" style="--tier:${esc(t.color)}" title="${esc(t.name)}">${level}</div>`; }

  function rowHtml(r, i, kind) {
    const s = SCORE[kind](r), mine = me && r.uid === me.uid;
    const icons = (r.recentBadges || []).map((id) => esc(X.badgeInfo(id).icon)).join('');
    return `<li class="lb-row${mine ? ' is-me' : ''}">
      <div class="lb-rank">${i + 1}</div>
      ${levelRowLabel(r.level || 1)}
      <div><div class="lb-name">${esc(r.name || 'Learner')}${mine ? ' (you)' : ''}</div>
        <div class="lb-meta"><span>🔥 ${r.streak || 0}</span><span>🏅 ${r.badgeCount || 0}</span><span class="lb-badges" aria-hidden="true">${icons}</span></div></div>
      <div class="lb-score">${esc(s.big)}<small>${esc(s.small)}</small></div></li>`;
  }

  async function showBoard(kind) {
    const my = ++token, panel = $('lb-panel');
    panel.innerHTML = '<p class="lb-note">Loading…</p>';
    try {
      const rows = await X.loadBoard(kind);
      if (my !== token) return;
      if (!rows.length) { panel.innerHTML = `<p class="lb-empty">${kind === 'weekly' ? 'Nobody has earned XP this week yet. Be the first!' : 'No learners on the board yet. Finish a lesson to appear here.'}</p>`; return; }
      let html = `<ol class="lb-list">${rows.map((r, i) => rowHtml(r, i, kind)).join('')}</ol>`;
      if (me && !rows.some((r) => r.uid === me.uid)) html += `<p class="lb-note lb-me-pin">You are not in the top ${rows.length} on this board yet. Keep learning to climb!</p>`;
      panel.innerHTML = html;
    } catch (e) {
      if (my !== token) return;
      console.warn('[leaderboard] load failed', e);
      panel.innerHTML = '<p class="lb-empty">Could not load the leaderboard. Check your connection and try again.</p>';
    }
  }

  function badgeCell(b, owned, next) {
    return `<div class="bd${owned ? '' : ' is-locked'}${next ? ' is-next' : ''}" style="--bd:${esc(b.color || '#38bdf8')}">
      <div class="bd__icon" aria-hidden="true">${esc(b.icon)}</div><div class="bd__name">${esc(b.name)}</div>
      <div class="bd__desc">${esc(b.desc)}</div><div class="bd__state">${owned ? 'Earned' : (next ? 'Up next' : 'Locked')}</div></div>`;
  }
  function showMine() {
    ++token;
    const all = X.config.BADGES, owned = (myState && myState.badges) || {}, level = X.levelFromXp((myState && myState.xp) || 0);
    const group = (title, ids) => `<section class="bd-group"><h3>${esc(title)}</h3><div class="bd-grid">${ids.map((id) => badgeCell(all[id], !!owned[id], false)).join('')}</div></section>`;
    const byGroup = (g) => Object.keys(all).filter((id) => all[id].group === g && !all[id].level);
    const perLevel = (g) => Object.keys(all).filter((id) => all[id].group === g && all[id].level).sort((a, b) => all[a].level - all[b].level);
    const lowest = (g) => perLevel(g).find((id) => !owned[id] && all[id].level <= level);
    const lvGrid = (title, g) => { const nx = lowest(g); return `<section class="bd-group"><h3>${esc(title)}</h3><div class="bd-grid">${perLevel(g).map((id) => badgeCell(all[id], !!owned[id], id === nx)).join('')}</div></section>`; };
    $('lb-panel').innerHTML =
      `<p class="lb-note">You are Level ${level}. Finish a lesson to earn the next Scholar badge, or clear a wall for the next Wall Breaker badge. Badges for levels you have not reached yet unlock as you level up.</p>` +
      lvGrid('Lesson badges by level', 'lesson') + lvGrid('Wall Breaker badges by level', 'game') +
      group('Streaks', byGroup('streak')) + group('Milestones', [...byGroup('lesson'), ...byGroup('game')]);
  }

  function drawMe() {
    const el = $('lb-me'), xp = (myState && myState.xp) || 0, p = X.levelProgress(xp), t = X.tierOf(p.level);
    const badgeN = myState && myState.badges ? Object.keys(myState.badges).length : 0;
    el.style.setProperty('--tier', t.color);
    el.innerHTML = `<div class="xp-card__top"><div class="xp-level" aria-hidden="true">${p.level}</div>
      <div><p class="xp-card__name">${esc((me && me.name) || 'You')} · Level ${p.level} ${esc(t.icon)} ${esc(t.name)}</p>
      <p class="xp-card__sub">${xp.toLocaleString()} XP · ${badgeN} badge${badgeN === 1 ? '' : 's'}</p></div></div>
      <div><div class="xp-bar" role="progressbar" aria-label="Progress to next level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.pct}"><i style="width:${p.pct}%"></i></div>
      <div class="xp-bar__label"><span>${p.maxed ? 'Max level' : `${p.into} / ${p.need} XP to Level ${p.level + 1}`}</span></div></div>`;
  }

  function drawPrivacy() {
    const box = $('lb-privacy'), hidden = !!(myState && myState.hidden);
    box.innerHTML = `<span>${hidden ? 'You are hidden from the public leaderboards.' : 'Your name, level, XP, streak and badges are visible to other learners.'}</span>
      <button type="button" class="btn btn--ghost btn--sm" id="lb-vis">${hidden ? 'Show me on leaderboards' : 'Hide me from leaderboards'}</button>`;
    $('lb-vis').addEventListener('click', async (ev) => {
      const b = ev.currentTarget; b.disabled = true;
      try { const r = await X.setVisibility(hidden); if (r && r.ok) { myState = { ...(myState || {}), hidden: !hidden }; drawPrivacy(); if (view !== 'mine') showBoard(view); } }
      catch (e) { console.warn('[leaderboard] visibility failed', e); b.disabled = false; }
    });
  }

  function select(v) {
    view = v;
    document.querySelectorAll('#lb-tabs .lb-tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === v)));
    if (v === 'mine') showMine(); else showBoard(v);
  }

  async function init() {
    X = window.LWXP;
    if (!X) { $('lb-panel').innerHTML = '<p class="lb-empty">The leaderboard could not load. Refresh the page.</p>'; return; }
    try { await window.LWAuth.whenAuthReady(); } catch { /* ignore */ }
    me = window.LWAuth && window.LWAuth.getCurrentUser ? window.LWAuth.getCurrentUser() : null;
    myState = await X.getMyState();
    drawMe(); drawPrivacy();
    $('lb-tabs').addEventListener('click', (e) => { const b = e.target.closest('.lb-tab'); if (b) select(b.dataset.view); });
    $('lb-tabs').addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const tabs = [...document.querySelectorAll('#lb-tabs .lb-tab')], i = tabs.findIndex((t) => t.dataset.view === view);
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; n.focus(); select(n.dataset.view);
    });
    const hash = location.hash.replace('#', ''); select(['xp', 'weekly', 'streak', 'badges', 'mine'].includes(hash) ? hash : 'xp');
  }
  if (window.LWXP) init(); else document.addEventListener('lwxp-ready', init, { once: true });
})();
