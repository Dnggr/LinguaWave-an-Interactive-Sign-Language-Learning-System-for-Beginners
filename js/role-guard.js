(function () {
  "use strict";

  var ADMIN_EMAIL = "linguawave.project@gmail.com";
  var SESSION_KEY = "lw_session";

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

  function check(authKnown) {
    if (redirecting) return;
    var email = cachedEmail();
    var isAdmin = email === ADMIN_EMAIL.toLowerCase();

    if (isAdmin && !isAdminPage) return go(ADMIN_HOME);
    if (email && !isAdmin && isAdminPage) return go(LEARNER_HOME);
    if (!email && authKnown && isAdminPage) return go(LOGIN_PAGE);
  }

  check(false);
  window.addEventListener("lwauth-ready", function () { check(true); });
  window.addEventListener("storage", function (e) {
    if (e.key === SESSION_KEY || e.key === null) check(true);
  });
})();
