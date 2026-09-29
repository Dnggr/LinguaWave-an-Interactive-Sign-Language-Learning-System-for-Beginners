/**
 * admin-login.js — Controller for pages/admin-login.html (NEW)
 * Signs in on the ADMIN-ONLY Firebase app (js/admin-firebase.js). Any
 * account that is not the admin email is signed straight back out, so
 * a learner can't hold an admin-app session.
 * Load as: <script type="module" src="../js/admin-login.js"></script>
 */
import { auth, adminSignIn, adminGoogleSignIn, adminSignOut } from "./admin-firebase.js";

const ADMIN_EMAIL = "linguawave.project@gmail.com"; // keep in sync (see admin-auth.js)
const DASHBOARD = "admin-dashboard.html";

const els = {
  msg: document.getElementById("admin-login-msg"),
  email: document.getElementById("admin-email"),
  password: document.getElementById("admin-password"),
  loginBtn: document.getElementById("admin-login-btn"),
  googleBtn: document.getElementById("admin-google-btn"),
};

function isAdminEmail(email) {
  return !!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

function showMsg(text) {
  els.msg.textContent = text;
  els.msg.hidden = !text;
}

function friendly(err) {
  const code = err && err.code;
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "Incorrect email or password.";
  }
  if (code === "auth/too-many-requests") return "Too many attempts. Wait a moment and try again.";
  if (code === "auth/network-request-failed") return "Network error. Check your connection.";
  return (err && err.message) || "Sign-in failed.";
}

function setBusy(busy) {
  els.loginBtn.disabled = busy;
  els.googleBtn.disabled = busy;
}

async function finish(cred) {
  const user = cred && cred.user;
  if (!user || !isAdminEmail(user.email)) {
    try { await adminSignOut(); } catch (e) { /* ignore */ }
    showMsg("This account is not the administrator account.");
    return;
  }
  window.location.replace(DASHBOARD);
}

async function run(fn) {
  showMsg("");
  setBusy(true);
  try {
    await finish(await fn());
  } catch (err) {
    showMsg(friendly(err));
  } finally {
    setBusy(false);
  }
}

els.loginBtn.addEventListener("click", () =>
  run(() => adminSignIn(els.email.value.trim(), els.password.value))
);
els.password.addEventListener("keydown", (e) => {
  if (e.key === "Enter") els.loginBtn.click();
});
els.googleBtn.addEventListener("click", () => run(() => adminGoogleSignIn()));

// Already signed in as admin? Skip the form.
(async () => {
  const params = new URLSearchParams(location.search);
  if (params.get("denied")) showMsg("That account is not the administrator account.");
  else if (params.get("from") === "learner") showMsg("Administrators sign in here, not on the learner login.");

  if (typeof auth.authStateReady === "function") await auth.authStateReady();
  if (auth.currentUser && isAdminEmail(auth.currentUser.email)) {
    window.location.replace(DASHBOARD);
  }
})();
