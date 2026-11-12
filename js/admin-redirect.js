const ADMIN_EMAIL = "linguawave.project@gmail.com";

async function run() {
  try {
    if (window.LWAuth && window.LWAuth.whenAuthReady) {
      await window.LWAuth.whenAuthReady();
    }
    const user = window.LWAuth && window.LWAuth.getCurrentUser && window.LWAuth.getCurrentUser();
    const email = user && user.email ? user.email.toLowerCase() : "";
    console.log("[admin-redirect] signed in as:", email || "(nobody)");
    if (email && email === ADMIN_EMAIL.toLowerCase()) {
      window.location.replace("admin-dashboard.html");
    }
  } catch (err) {
    console.error("[admin-redirect] failed:", err);
  }
}

run();
