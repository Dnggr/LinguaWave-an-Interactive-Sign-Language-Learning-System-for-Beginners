/**
 * js/xp-ui.js — the "Your level" card on the Profile page (#xp-card; it used to be on the dashboard). Display only: every number
 * comes from the xpState doc via window.LWXP. Classic script, safe if LWXP is absent.
 */
(function () {
  'use strict';
  const card = document.getElementById('xp-card');
  if (!card) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function draw(st) {
    const X = window.LWXP;
    if (!X) return;
    const xp = (st && st.xp) || 0;
    const p = X.levelProgress(xp), tier = X.tierOf(p.level);
    const streak = st && st.streak ? (typeof st.streak === 'object' ? (st.__liveStreak || 0) : st.streak) : 0;
    const badges = st ? (st.badges ? Object.keys(st.badges).length : (st.badgeCount || 0)) : 0;
    card.style.setProperty('--tier', tier.color);
    card.innerHTML = `
      <div class="xp-card__top">
        <div class="xp-level" aria-hidden="true">${p.level}</div>
        <div>
          <p class="xp-card__name">Level ${p.level} · ${esc(tier.name)} ${esc(tier.icon)}</p>
          <p class="xp-card__sub">${xp.toLocaleString()} XP total</p>
        </div>
      </div>
      <div class="xp-card__progress">
        <div class="xp-bar" role="progressbar" aria-label="Progress to next level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.pct}"><i style="--p:${p.pct / 100}"></i></div>
        <div class="xp-bar__label"><span>${p.maxed ? 'Max level reached' : `${p.into} / ${p.need} XP to Level ${p.level + 1}`}</span></div>
      </div>
      <div class="xp-stats">
        <a class="xp-chip xp-chip--link" href="leaderboard.html#mine/bd-group-streak">🔥 ${streak}-day streak</a>
        <a class="xp-chip xp-chip--link" href="leaderboard.html#mine">🏅 ${badges} badge${badges === 1 ? '' : 's'}</a>
      </div>
      <a class="xp-card__link" href="leaderboard.html">Leaderboard &amp; badges →</a>`;
  }

  async function init() {
    const X = window.LWXP;
    if (!X) return;
    const st = await X.getMyState();
    // effective streak = the grace rule lives in js/xp.js (one missed day is forgiven, two in a row reset it)
    if (st) st.__liveStreak = X.liveStreakOf ? X.liveStreakOf(st) : 0;
    draw(st || { xp: 0, badges: {} });
    // What the card shows right now. Updates MERGE into it, so a partial result can never blank the card
    // (an update without xp used to redraw it as Level 1 / 0 XP / 0-day streak).
    const view = { xp: (st && st.xp) || 0, streak: (st && st.__liveStreak) || 0, badgeCount: st && st.badges ? Object.keys(st.badges).length : 0 };
    X.onUpdate((res) => {
      if (!res || typeof res.xp !== 'number') return;   // not a full XP summary: keep what is on screen
      view.xp = res.xp;
      if (typeof res.streak === 'number') view.streak = res.streak;
      view.badgeCount += (res.newBadges || []).length;
      draw({ xp: view.xp, streak: view.streak, badgeCount: view.badgeCount, __liveStreak: view.streak });
    });
    // Streaks saved before the grace rule are one short: catch them up. Each step is published through
    // onUpdate above (which redraws), so nothing more to do with the result here.
    if (st && X.syncStreak) X.syncStreak().catch(() => {});
  }
  if (window.LWXP) init(); else document.addEventListener('lwxp-ready', init, { once: true });
})();
