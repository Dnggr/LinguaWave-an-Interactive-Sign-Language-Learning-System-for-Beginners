/**
 * js/xp-ui.js — the "Your level" card on the Profile page (#xp-card; it used to be on the dashboard). Display only: every number
 * comes from the server-written xpState doc via window.LWXP. Classic script, safe if LWXP is absent.
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
    if (st) {
      // effective streak = still alive if last activity was today or yesterday (local to the stored tz)
      try {
        const tz = st.tz || 'UTC', f = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(ms));
        const last = st.streak && st.streak.lastDay;
        st.__liveStreak = last && (last === f(Date.now()) || last === f(Date.now() - 86400000)) ? st.streak.current : 0;
      } catch { st.__liveStreak = 0; }
    }
    draw(st || { xp: 0, badges: {} });
    let badgeTotal = st && st.badges ? Object.keys(st.badges).length : 0;
    X.onUpdate((res) => { badgeTotal += (res.newBadges || []).length; draw({ xp: res.xp, streak: res.streak, badgeCount: badgeTotal, __liveStreak: res.streak }); });
  }
  if (window.LWXP) init(); else document.addEventListener('lwxp-ready', init, { once: true });
})();