/**
 * js/skeleton.js — small helper for the loading skeletons (css/style.css §20).
 * Classic script, no dependencies, safe to load on any page.
 *
 *  1. First swap only: when a [data-sk] container loses its .sk-group (the page
 *     script replaced it with real content) the new content fades in once.
 *     Later re-renders (e.g. the Firestore re-sync) are untouched, so nothing
 *     flashes a second time.
 *  2. Stall guard: a skeleton still on screen after STALL_MS means the load
 *     failed or hung (no LWXP, offline, signed out...). Rather than blink
 *     forever it becomes a quiet one-line note. If the data does arrive later,
 *     the page script's innerHTML still replaces the note as usual.
 */
(function () {
  'use strict';
  var STALL_MS = 12000;
  var REVEAL_MS = 400;

  function watch(host) {
    if (!host.querySelector(':scope > .sk-group')) return;
    var mo = new MutationObserver(function () {
      if (host.querySelector(':scope > .sk-group')) return;
      mo.disconnect();
      host.classList.add('sk-revealing');
      setTimeout(function () { host.classList.remove('sk-revealing'); }, REVEAL_MS);
    });
    mo.observe(host, { childList: true });
  }

  function init() {
    var hosts = document.querySelectorAll('[data-sk]');
    for (var i = 0; i < hosts.length; i++) watch(hosts[i]);

    setTimeout(function () {
      var groups = document.querySelectorAll('.sk-group');
      for (var j = 0; j < groups.length; j++) {
        var g = groups[j];
        if (!g.isConnected) continue;
        var note = document.createElement('p');
        note.className = 'sk-stalled';
        note.setAttribute('role', 'status');
        note.textContent = 'Taking longer than usual\u2026 try refreshing the page.';
        g.replaceWith(note);
      }
    }, STALL_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
