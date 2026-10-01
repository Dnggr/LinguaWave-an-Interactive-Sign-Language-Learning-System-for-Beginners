/**
 * main.js — Global JavaScript Controller
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Shared utilities and UI behaviours that run on every
 *            page: active nav link highlighting, progress-bar
 *            animation, badge rendering, and user-detail rendering
 *            (name/email/level pulled from js/auth.js's session).
 *
 * CONNECTS : Loaded by index.html and all pages/*.html via
 *            <script src="../js/main.js"> (or ./js/main.js from root).
 *            Requires js/auth.js to be loaded first on every page.
 *
 * ─────────────────────────────────────────────────────────────────
 */

'use strict';

/* ── ACTIVE USER ──────────────────────────────────────────────────── */
/*
 * Reads the logged-in user from js/auth.js (window.LWAuth). Every
 * protected page should already have run requireAuth(), so this
 * should never be null in practice — the fallback just keeps pages
 * from crashing if auth.js hasn't loaded for some reason.
 *
 * CLEANUP (this revision) — removed MOCK_PROGRESS and the `level`/
 * `progress` fields it fed. Both were leftovers from the pre-Missions
 * curriculum (basic/medium/intermediate) and had been fully dead for
 * some time: `.progress` was never read anywhere (real progress comes
 * from window.LWMissions), and no page still has a [data-user-level]
 * hook. Only the fields initUserDetails() below actually renders remain.
 */
function getActiveUser() {
  const session = window.LWAuth?.getCurrentUser?.();
  return {
    name:  session?.name  || 'Guest',
    email: session?.email || '',
    joined: session?.joined || '',
  };
}


/* ── UTILITY: get current page filename ─────────────────────────── */
function currentPage() {
  const path = window.location.pathname;
  return path.split('/').pop() || 'index.html';
}


/* ── NAVBAR: mark active link ────────────────────────────────────── */
/*
 * Adds .active class to the navbar link whose href matches the
 * current page so the user knows where they are.
 */
function initActiveNav() {
  const page = currentPage();
  document.querySelectorAll('.navbar__links a').forEach(link => {
    if (link.getAttribute('href') === page ||
        link.getAttribute('href') === `./${page}` ||
        link.getAttribute('href') === `pages/${page}`) {
      link.classList.add('active');
    }
  });
}


/* ── SIDEBAR NAV GUARD ────────────────────────────────────────────
 * Two problems this stops on every .app-sidebar__link (Dashboard /
 * Learn / Progress / Feedback / Settings, on every page that has
 * the sidebar):
 *   1. Clicking the link for the page you're already on used to just
 *      re-navigate to the exact same URL — a full, pointless reload.
 *      Each page already hardcodes `.active` on its own current
 *      sidebar link (see e.g. pages/dashboard.html), so that's all
 *      this needs to check — no need to re-derive "current page"
 *      from the URL the way initActiveNav() above does.
 *   2. Rapid repeat clicks — same link or a different one, fired
 *      before the browser has actually left the page — could queue
 *      up more than one navigation. Once a real navigation starts,
 *      further clicks on ANY sidebar link are ignored until this
 *      page actually unloads.
 * Only plain left-clicks are intercepted; Ctrl/Cmd/Shift-click and
 * middle-click (open in a new tab) are left alone.
 */
function initSidebarNavGuard() {
  const links = document.querySelectorAll('.app-sidebar__link');
  if (!links.length) return;

  let navigating = false, navTimer = null;
  const root = document.documentElement;

  function clearNavState() {
    navigating = false;
    clearTimeout(navTimer); navTimer = null;
    root.classList.remove('lw-navigating');
    links.forEach((l) => { l.classList.remove('is-loading'); l.removeAttribute('aria-busy'); });
  }

  // PERF — every sidebar link is a full page load (auth + Firebase + missions.js), so
  // spam-clicking felt laggy. Two things fix the feel without touching the pages:
  //  1. prefetch the target HTML as soon as the pointer is on the link, so the click
  //     itself is (nearly) instant;
  //  2. give immediate visual feedback on click (spinner + progress cursor) so the
  //     wait never looks like a frozen UI.
  const canSpeculate = !!(window.HTMLScriptElement && HTMLScriptElement.supports &&
                          HTMLScriptElement.supports('speculationrules'));
  if (canSpeculate) {
    // Chromium: browser prefetches sidebar targets on hover/pointer-down.
    // (prefetch only — NOT prerender, which would run each page's auth/Firestore code early.)
    const rules = document.createElement('script');
    rules.type = 'speculationrules';
    rules.textContent = JSON.stringify({
      prefetch: [{ source: 'document', where: { selector_matches: '.app-sidebar__link' }, eagerness: 'moderate' }],
    });
    document.head.appendChild(rules);
  }
  const prefetched = new Set();
  function prefetchLink(link) {
    if (canSpeculate) return;                       // handled by the rules above
    const href = link.href;                         // '' / page URL for locked links (href removed)
    if (!href || link.classList.contains('active') || prefetched.has(href)) return;
    if (link.getAttribute('aria-disabled') === 'true') return;
    prefetched.add(href);
    const p = document.createElement('link');
    p.rel = 'prefetch'; p.href = href; p.as = 'document';
    document.head.appendChild(p);
  }

  links.forEach((link) => {
    ['pointerenter', 'focus', 'touchstart'].forEach((ev) =>
      link.addEventListener(ev, () => prefetchLink(link), { passive: true }));

    link.addEventListener('click', (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      // Already on this page, or another nav click is already in
      // flight — swallow this one instead of firing another reload.
      if (link.classList.contains('active') || navigating) {
        e.preventDefault();
        return;
      }
      // Locked links (game-gate.js) have no href and handle their own click.
      if (!link.getAttribute('href')) return;

      navigating = true;
      link.classList.add('is-loading');
      link.setAttribute('aria-busy', 'true');
      root.classList.add('lw-navigating');
      // Safety net: if the navigation stalls (offline, blocked), don't leave the
      // sidebar dead forever.
      navTimer = setTimeout(clearNavState, 8000);
    });
  });

  // Bfcache restore (browser back/forward) can bring this exact JS
  // state back without DOMContentLoaded re-running — reset the flag
  // so a `navigating` left `true` from before the user left doesn't
  // permanently block the sidebar after they return.
  window.addEventListener('pageshow', clearNavState);
}


/* ── SIDEBAR ACCOUNT LINKS ────────────────────────────────────────
 * Settings no longer sits in the main list. It is pinned to the bottom
 * of the sidebar, a thin divider under it, then the Profile link — so the
 * bottom of the sidebar reads  Settings / ─── / Profile  and then the
 * theme switch + Log out.
 * Done here (not in each page's markup) so every learner page gets it from
 * one place. It only acts on a sidebar that already has a Settings link, so
 * admin sidebars are untouched; running twice does nothing. Must run BEFORE
 * initSidebarNavGuard() so the new link is covered by it, which is why it is
 * called straight away (this script sits at the end of <body>) and again at
 * the top of DOMContentLoaded for pages that load it differently.
 * CSS: .app-sidebar__link--pin / .app-sidebar__divider in css/style.css.
 */
function initSidebarAccountLinks() {
  const nav = document.querySelector('.app-sidebar__nav');
  if (!nav || nav.querySelector('.app-sidebar__link--pin')) return;   // no sidebar, or already done
  const settings = nav.querySelector('a[href="settings.html"]');
  if (!settings) return;

  nav.appendChild(settings);                       // make sure it is the last item…
  settings.classList.add('app-sidebar__link--pin'); // …so its auto top margin pushes the pair to the bottom

  const divider = document.createElement('div');
  divider.className = 'app-sidebar__divider';
  divider.setAttribute('role', 'separator');
  nav.appendChild(divider);

  const onProfile = /^profile(\.html)?$/.test(currentPage());
  const profile = document.createElement('a');
  profile.href = 'profile.html';
  profile.className = 'app-sidebar__link' + (onProfile ? ' active' : '');
  profile.innerHTML = '<span class="app-sidebar__icon" aria-hidden="true" data-lw-icon="user_round"></span>Profile';
  nav.appendChild(profile);
  if (window.LWIcons && typeof window.LWIcons.hydrate === 'function') window.LWIcons.hydrate(nav);
}
initSidebarAccountLinks();


/* ── PROGRESS BARS: animate fill on page load ────────────────────── */
/*
 * Reads [data-progress="0-100"] on any .progress-bar__fill element
 * and sets --p (the fill is slid with transform, see css/style.css's
 * .progress-bar__fill) so the CSS transition plays on load.
 * TODO: replace hardcoded data attributes with values from Firestore.
 */
function initProgressBars() {
  document.querySelectorAll('.progress-bar__fill[data-progress]').forEach(el => {
    const pct = Math.min(100, Math.max(0, parseInt(el.dataset.progress, 10)));
    // Defer to next frame so transition fires
    requestAnimationFrame(() => { el.style.setProperty('--p', String(pct)); });
  });
}


/* ── TOAST NOTIFICATIONS ─────────────────────────────────────────── */
/*
 * showToast(message, type)
 * Programmatically displays a slide-in notification at the bottom
 * of the screen.  type: 'success' | 'error' | 'info'
 * Used by lesson.js to give feedback (e.g. when a locked lesson is
 * opened directly). Every page that can call this must link
 * css/toast.css — confirmed all of them do (pages/camera-practice.html was
 * missing it and has been fixed).
 */
function showToast(message, type = 'info') {
  // Remove existing toasts
  document.querySelectorAll('.toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');
  // ICON MIGRATION — the audit's section 3 asked for one shared status
  // icon component instead of each caller prefixing its own emoji into
  // the message ('\u2705 Saved', 'Thanks! \ud83c\udf89'). The `type` argument this
  // function has always taken is now the only thing that picks the
  // icon, so callers pass plain text and can't disagree with it.
  // setLabel() over innerHTML: toast messages carry user-entered text.
  const TOAST_ICONS = { success: 'success', error: 'error', info: 'info', warning: 'warning' };
  if (window.LWIcons) {
    window.LWIcons.setLabel(toast, TOAST_ICONS[type] || 'info', message, { size: 'sm' });
  } else {
    toast.textContent = message;
  }
  document.body.appendChild(toast);

  // Trigger animation then auto-remove
  requestAnimationFrame(() => toast.classList.add('toast--visible'));
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3000);
}


/* ── LOCKED / INVALID INTERACTION FEEDBACK ──────────────────────────
 * "Interactive Locked-State Feedback" — call this on click for any
 * element the learner CAN click but that can't actually be acted on
 * right now (a locked chapter row, a locked/pending dictionary chip,
 * any other locked/unavailable-content surface). Toggles the shared
 * .lw-shake-invalid class (css/style.css §19) on and back off via
 * 'animationend' — removing it first and forcing a reflow before
 * re-adding means a fast repeat click restarts the animation instead
 * of doing nothing because the class was already present. Doesn't
 * navigate or perform any action itself — callers still need their
 * own preventDefault()/early-return; this only supplies the feedback.
 */
function triggerLockedFeedback(el) {
  if (!el) return;
  el.classList.remove('lw-shake-invalid');
  void el.offsetWidth; // force reflow so the animation restarts on a repeat click
  el.classList.add('lw-shake-invalid');
  el.addEventListener('animationend', () => {
    el.classList.remove('lw-shake-invalid');
  }, { once: true });
}


/* ── NAVBAR / USER DETAILS: fill in placeholders from the session ──
 * Any element with [data-user-name], [data-user-email],
 * [data-user-level], or [data-user-joined] gets its text filled in.
 * Any element with [data-logout="relative/path/to/index.html"]
 * gets wired to call LWAuth.logout() instead of needing an href.
 * Used by the navbar greeting on every page and the "Your Account"
 * card on the dashboard.
 */
function initUserDetails() {
  const user = getActiveUser();

  document.querySelectorAll('[data-user-name]').forEach(el => { el.textContent = user.name; });
  document.querySelectorAll('[data-user-email]').forEach(el => { el.textContent = user.email; });
  document.querySelectorAll('[data-user-joined]').forEach(el => { el.textContent = user.joined || '—'; });
  document.querySelectorAll('[data-user-initial]').forEach(el => { el.textContent = (user.name || '?').charAt(0).toUpperCase(); });

  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      window.LWAuth?.logout(btn.dataset.logout);
    });
  });
}


/* ── INIT ────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initActiveNav();
  initSidebarAccountLinks();
  initSidebarNavGuard();
  initProgressBars();
  initUserDetails();
  // FIX (migration-analysis pass) — guarded null check added since
  // this now also runs on LinguaWave pages, several of which have
  // no <footer class="footer"> element at all; querySelector() would
  // otherwise throw here and silently abort whatever ran after it.
  const footerP = document.querySelector('.footer p');
  if (footerP) footerP.textContent = `LinguaWave · Capstone Project 2026`; // makes the footer of all pages relative to this text
});


/* ── EXPORTS (for use by page-specific JS files) ─────────────────── */
window.LinguaWave = {
  getActiveUser,
  showToast,
  triggerLockedFeedback,
};