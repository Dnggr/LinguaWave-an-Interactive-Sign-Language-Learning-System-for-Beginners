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

    var logo = aside.querySelector('.app-sidebar__logo');
    if (logo && logo.nextSibling) aside.insertBefore(btn, logo.nextSibling);
    else aside.insertBefore(btn, aside.firstChild);

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

    aside.classList.add('lw-nav-ready');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
