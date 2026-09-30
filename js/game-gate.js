// /**
//  * js/game-gate.js — locks the "Game" tab (pages/game.html)
//  * ─────────────────────────────────────────────────────────────────
//  * RULE      The Game opens only after Chapter 1 (asl_foundations) is
//  *           100% complete — AND only once GAME_RELEASED is true.
//  *
//  * RESERVED  GAME_RELEASED is deliberately FALSE: the game is still being
//  *           built, so for now the Game tab stays locked for everyone, even
//  *           after Chapter 1. When the game is ready, flip the one flag
//  *           below to true — the Chapter-1 gate then takes over with no
//  *           other change needed.
//  *
//  * WHAT IT DOES (every page that has the sidebar Game link + game.html)
//  *   - Locks every `.app-sidebar a[href$="game.html"]`: href removed,
//  *     aria-disabled, dimmed, lock icon, tooltip, shake on click.
//  *   - On game.html itself, a locked learner is sent back to dashboard.html
//  *     (so typing the URL doesn't bypass the sidebar lock).
//  *
//  * DEV ACCESS  While GAME_RELEASED is false you can still open the game to
//  *           work on it: run  localStorage.setItem('lw_game_dev','1')  in the
//  *           browser console (remove the key to lock again). Client-side
//  *           only — same trust level as all other gating in this app.
//  *
//  * DEPENDS   window.LWMissions.isChapterComplete() (js/missions.js). Only
//  *           needed once GAME_RELEASED is true; if a page doesn't load
//  *           missions.js, this script loads it on demand.
//  * Load with: <script src="../js/game-gate.js" defer></script>
//  */
// (function () {
//   'use strict';

//   var GAME_RELEASED = false;            // ← flip to true when the game is finished
//   var GATE_CHAPTER_ID = 'asl_foundations'; // Chapter 1
//   var LOCK_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
//   var scriptSrc = (document.currentScript && document.currentScript.src) || '';

//   function devOverride() {
//     try { return localStorage.getItem('lw_game_dev') === '1'; } catch (e) { return false; }
//   }

//   function loadMissions() {
//     if (window.LWMissions) return Promise.resolve();
//     return new Promise(function (resolve) {
//       var s = document.createElement('script');
//       s.src = scriptSrc.replace(/game-gate\.js(\?.*)?$/, 'missions.js');
//       s.onload = function () { resolve(); };
//       s.onerror = function () { resolve(); };
//       document.head.appendChild(s);
//     });
//   }

//   // Resolves { unlocked, reason } — 'reason' is the tooltip for a locked link.
//   function evaluate() {
//     if (devOverride()) return Promise.resolve({ unlocked: true });
//     if (!GAME_RELEASED) return Promise.resolve({ unlocked: false, reason: 'Game — coming soon' });

//     var authReady = (window.LWAuth && window.LWAuth.whenAuthReady)
//       ? window.LWAuth.whenAuthReady() : Promise.resolve();
//     return authReady.then(loadMissions).then(function () {
//       var M = window.LWMissions;
//       if (!M || !M.isChapterComplete) return { unlocked: false, reason: 'Finish Chapter 1 to unlock the Game' };
//       var sync = M.whenMissionsSyncReady ? M.whenMissionsSyncReady() : Promise.resolve();
//       return sync.then(function () {
//         var done = M.isChapterComplete(GATE_CHAPTER_ID, M.getAllMissions());
//         return done ? { unlocked: true } : { unlocked: false, reason: 'Finish Chapter 1 to unlock the Game' };
//       });
//     }).catch(function () {
//       return { unlocked: false, reason: 'Finish Chapter 1 to unlock the Game' }; // fail closed
//     });
//   }

//   function lockLink(a, reason) {
//     a.removeAttribute('href');
//     a.setAttribute('role', 'link');
//     a.setAttribute('aria-disabled', 'true');
//     a.setAttribute('tabindex', '0');
//     a.setAttribute('title', reason);
//     a.classList.add('app-sidebar__link--locked');
//     if (!a.querySelector('.app-sidebar__lock')) {
//       var badge = document.createElement('span');
//       badge.className = 'app-sidebar__lock';
//       badge.innerHTML = LOCK_ICON;
//       a.appendChild(badge);
//     }
//     var shake = function (e) {
//       if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
//       e.preventDefault();
//       a.classList.remove('lw-shake-invalid');
//       void a.offsetWidth; // restart animation on rapid repeat clicks
//       a.classList.add('lw-shake-invalid');
//       a.addEventListener('animationend', function () { a.classList.remove('lw-shake-invalid'); }, { once: true });
//     };
//     a.addEventListener('click', shake);
//     a.addEventListener('keydown', shake);
//   }

//   function init() {
//     var links = document.querySelectorAll('.app-sidebar a[href$="game.html"]');
//     var onGamePage = /\/game\.html$/.test(window.location.pathname);
//     if (!links.length && !onGamePage) return;
//     evaluate().then(function (r) {
//       if (r.unlocked) return;
//       Array.prototype.forEach.call(links, function (a) { lockLink(a, r.reason); });
//       if (onGamePage) window.location.replace('dashboard.html');
//     });
//   }

//   window.LWGameGate = { GAME_RELEASED: GAME_RELEASED, evaluate: evaluate };

//   if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
//   else init();
// })();
