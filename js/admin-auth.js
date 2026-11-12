import { auth } from "./admin-firebase.js";

const ADMIN_EMAIL = "linguawave.project@gmail.com";
const SESSION_KEY = "lw_session";

function isAdminEmail(email) {
  return !!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

async function requireAdmin(opts) {
  const notLoggedInPath = (opts && opts.notLoggedInPath) || "../index.html";
  const notAdminPath = (opts && opts.notAdminPath) || "dashboard.html";

  if (window.LWAuth?.whenAuthReady) {
    await window.LWAuth.whenAuthReady();
  }
  if (typeof auth.authStateReady === "function") {
    await auth.authStateReady();
  }

  const user = auth.currentUser;

  if (!user) {
    window.location.replace(notLoggedInPath);
    return false;
  }

  if (!isAdminEmail(user.email)) {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {  }
    window.LinguaWave?.showToast?.("This area is for the admin account only.", "error");
    window.location.replace(notAdminPath);
    return false;
  }

  document.body.classList.add("admin-ready");
  return true;
}

window.LWAdminAuth = {
  ADMIN_EMAIL,
  isAdminEmail,
  requireAdmin,
};
