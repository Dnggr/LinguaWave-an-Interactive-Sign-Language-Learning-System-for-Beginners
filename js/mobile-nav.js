/**
 * js/mobile-nav.js — menu button for the app shell on phones/tablets in portrait
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT   Adds a hamburger button to `.app-sidebar` and toggles `.is-open`
 *        on it. All layout lives in css/responsive.css (≤ 900px); above
 *        that width the button is display:none and this file does nothing
 *        visible, so the desktop sidebar is untouched.
 * WHY    The old horizontal link row clipped Learn/Progress/Feedback/
 *        Settings on every phone (see AI_MEMORY.md session log).
 * SAFE   No page markup changes; no dependency on main.js/auth.js/theme.js
 *        (it never touches the theme switch or logout — those elements are
 *        only re-ordered by CSS, so their existing listeners keep working).
 *        If this script fails to load, `.lw-nav-ready` is never set and the
 *        CSS falls back to the previous scrolling row.
 * CLOSES on: link tap, Escape (focus returns to the button), tap outside,
 *        resize past the breakpoint, and bfcache restore.
 */
(function () {
  'use strict';
  var BREAKPOINT = '(max-width: 900px)';

  function init() {
    var aside = document.querySelector('.app-sidebar');
    var nav = aside && aside.querySelector('.app-sidebar__nav');
    if (!aside || !nav || aside.querySelector('.lw-nav-toggle')) return;

    if (!nav.id) nav.id = 'lw-app-nav';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lw-nav-toggle';
    btn.setAttribute('aria-controls', nav.id);
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open menu');
    btn.innerHTML = '<span class="lw-nav-toggle__bar"></span><span class="lw-nav-toggle__bar"></span><span class="lw-nav-toggle__bar"></span>';

    // Right after the logo, so keyboard order is: logo → menu button → links.
    var logo = aside.querySelector('.app-sidebar__logo');
    if (logo && logo.nextSibling) aside.insertBefore(btn, logo.nextSibling);
    else aside.insertBefore(btn, aside.firstChild);

    // The current page must be exposed to assistive tech, not just colour.
    Array.prototype.forEach.call(nav.querySelectorAll('.app-sidebar__link.active'), function (a) {
      a.setAttribute('aria-current', 'page');
    });

    var mq = window.matchMedia(BREAKPOINT);

    function setOpen(open, returnFocus) {
      aside.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (!open && returnFocus) btn.focus();
    }

    btn.addEventListener('click', function () {
      setOpen(!aside.classList.contains('is-open'));
    });

    // Closing on link tap covers same-page (#hash / already-active) taps that
    // don't unload the page; real navigations simply unload it.
    nav.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && aside.classList.contains('is-open')) setOpen(false, true);
    });

    document.addEventListener('pointerdown', function (e) {
      if (aside.classList.contains('is-open') && !aside.contains(e.target)) setOpen(false);
    });

    function onBreakpoint() { if (!mq.matches) setOpen(false); }
    if (mq.addEventListener) mq.addEventListener('change', onBreakpoint);
    else if (mq.addListener) mq.addListener(onBreakpoint);

    window.addEventListener('pageshow', function () { setOpen(false); });

    // Last: only now does the CSS switch to the collapsed layout.
    aside.classList.add('lw-nav-ready');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
