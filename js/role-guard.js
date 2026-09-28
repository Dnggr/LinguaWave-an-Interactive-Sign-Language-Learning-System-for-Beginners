/**
 * role-guard.js — Keeps the admin on admin pages and learners off them (NEW)
 * ─────────────────────────────────────────────────────────────────
 * LOAD AS A PLAIN, SYNCHRONOUS <script> INSIDE <head> (NOT type="module",
 * NOT defer) on every page in pages/ — learner pages AND admin pages:
 *
 *     <script src="../js/role-guard.js"></script>
 *
 * Do NOT add it to index.html (index.html already routes by role after login).
 *
 * RULES
 *   - Admin account on ANY non-admin page (dashboard, learn, settings,
 *     progress, ...)          -> replaced with pages/admin-dashboard.html
 *   - Non-admin account on an admin-*.html page -> replaced with
 *     pages/dashboard.html
 *   - Nobody signed in on an admin-*.html page  -> index.html
 *
 * HOW IT WORKS
 *   Runs immediately (before the body renders) using the session cache
 *   that js/auth.js keeps in localStorage ("lw_session"), so there is no
 *   flash of the learner UI. If the cache is empty (fresh tab), it runs
 *   again on 'lwauth-ready', which auth.js fires only AFTER it has
 *   written that cache from Firebase's real signed-in user. It also
 *   re-checks on cross-tab login/logout.
 *
 * SECURITY NOTE
 *   This is page ROUTING, not a security boundary — the cache is
 *   editable in DevTools. The real lock on admin data is Firestore
 *   Security Rules (firestore.rules). js/admin-auth.js still runs its
 *   own check on every admin page too.
 *
 * KEEP IN SYNC: ADMIN_EMAIL here, in js/admin-auth.js, in index.html
 *   (LW_ADMIN_EMAIL), and in firestore.rules.
 * ─────────────────────────────────────────────────────────────────
 */
(function () {
  "use strict";

  var ADMIN_EMAIL = "firebase.admin.asl@gmail.com";
  var SESSION_KEY = "lw_session";

  // Resolve targets relative to THIS script's location so it works
  // no matter which folder the page sits in.
  var base = document.currentScript && document.currentScript.src;
  if (!base) return;
  var ADMIN_HOME = new URL("../pages/admin-dashboard.html", base).href;
  var LEARNER_HOME = new URL("../pages/dashboard.html", base).href;
  var LOGIN_PAGE = new URL("../index.html", base).href;

  var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  var isAdminPage = page.indexOf("admin-") === 0;
  var redirecting = false;

  function cachedEmail() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      var u = raw ? JSON.parse(raw) : null;
      return u && u.email ? String(u.email).toLowerCase() : "";
    } catch (e) {
      return "";
    }
  }

  function go(url) {
    if (redirecting) return;
    if (location.href.split("#")[0] === url) return;
    redirecting = true;
    location.replace(url);
  }

  // authKnown = true once Firebase has reported its state (lwauth-ready).
  function check(authKnown) {
    if (redirecting) return;
    var email = cachedEmail();
    var isAdmin = email === ADMIN_EMAIL.toLowerCase();

    if (isAdmin && !isAdminPage) return go(ADMIN_HOME);          // admin -> admin only
    if (email && !isAdmin && isAdminPage) return go(LEARNER_HOME); // learner -> out of admin
    if (!email && authKnown && isAdminPage) return go(LOGIN_PAGE); // signed out -> login
  }

  check(false);
  window.addEventListener("lwauth-ready", function () { check(true); });
  window.addEventListener("storage", function (e) {
    if (e.key === SESSION_KEY || e.key === null) check(true);
  });
})();
