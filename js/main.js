
'use strict';

function getActiveUser() {
  const session = window.LWAuth?.getCurrentUser?.();
  return {
    name:  session?.name  || 'Guest',
    email: session?.email || '',
    joined: session?.joined || '',
  };
}


function currentPage() {
  const path = window.location.pathname;
  return path.split('/').pop() || 'index.html';
}


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

  const canSpeculate = !!(window.HTMLScriptElement && HTMLScriptElement.supports &&
                          HTMLScriptElement.supports('speculationrules'));
  if (canSpeculate) {
    const rules = document.createElement('script');
    rules.type = 'speculationrules';
    rules.textContent = JSON.stringify({
      prefetch: [{ source: 'document', where: { selector_matches: '.app-sidebar__link' }, eagerness: 'moderate' }],
    });
    document.head.appendChild(rules);
  }
  const prefetched = new Set();
  function prefetchLink(link) {
    if (canSpeculate) return;
    const href = link.href;
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

      const isCurrent = link.classList.contains('active') &&
        (!link.getAttribute('href') || link.href.split('#')[0].split('?')[0] === location.href.split('#')[0].split('?')[0]);
      if (isCurrent || navigating) {
        e.preventDefault();
        return;
      }
      if (!link.getAttribute('href')) return;

      navigating = true;
      link.classList.add('is-loading');
      link.setAttribute('aria-busy', 'true');
      root.classList.add('lw-navigating');
      navTimer = setTimeout(clearNavState, 8000);
    });
  });

  window.addEventListener('pageshow', clearNavState);
}


const SIDEBAR_MAIN_SRC = (document.currentScript && document.currentScript.src) || '';

function initSidebarAccountLinks() {
  const aside = document.querySelector('.app-sidebar');
  const nav = aside && aside.querySelector('.app-sidebar__nav');
  const foot = aside && aside.querySelector('.app-sidebar__foot');
  if (!nav || !foot || foot.querySelector('.app-sidebar__user')) return;
  if (!nav.querySelector('a[href="settings.html"]')) return;

  const onProfile = /^profile(\.html)?$/.test(currentPage());
  const card = document.createElement('a');
  card.href = 'profile.html';
  card.className = 'app-sidebar__link app-sidebar__user' + (onProfile ? ' active' : '');
  if (onProfile) card.setAttribute('aria-current', 'page');
  card.title = 'View your profile';
  card.innerHTML =
    '<span class="app-sidebar__avatar" aria-hidden="true"></span>' +
    '<span class="app-sidebar__user-text">' +
      '<span class="app-sidebar__user-name" data-user-name>Learner</span>' +
      '<span class="app-sidebar__user-role">Learner</span>' +
    '</span>';

  const logout = foot.querySelector('[data-logout]');
  const theme = foot.querySelector('.theme-switch');
  const row = document.createElement('div');
  row.className = 'app-sidebar__foot-row';
  if (logout) {
    logout.className = 'app-sidebar__logout';
    logout.innerHTML = '<span class="app-sidebar__icon" aria-hidden="true" data-lw-icon="log_out"></span>Log out';
    row.appendChild(logout);
  }
  if (theme) row.appendChild(theme);

  foot.classList.add('app-sidebar__foot--account');
  foot.insertBefore(card, foot.firstChild);
  foot.appendChild(row);
  if (window.LWIcons && typeof window.LWIcons.hydrate === 'function') window.LWIcons.hydrate(foot);
}
initSidebarAccountLinks();


let sidebarAvatarsLoading = null;
function loadAvatarsScript() {
  if (window.LWAvatars) return Promise.resolve(true);
  if (sidebarAvatarsLoading) return sidebarAvatarsLoading;
  sidebarAvatarsLoading = new Promise((resolve) => {
    if (!SIDEBAR_MAIN_SRC) { resolve(false); return; }
    const s = document.createElement('script');
    s.src = SIDEBAR_MAIN_SRC.replace(/main\.js(\?.*)?$/, 'avatars.js');
    s.onload = () => resolve(!!window.LWAvatars);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
  return sidebarAvatarsLoading;
}

function paintSidebarAvatar(avatarId) {
  const slot = document.querySelector('.app-sidebar__user .app-sidebar__avatar');
  if (!slot) return;
  const name = getActiveUser().name;
  if (window.LWAvatars) {
    slot.innerHTML = window.LWAvatars.markup(avatarId, { name });
  } else {
    const initial = String(name || '?').trim().charAt(0).toUpperCase() || '?';
    slot.innerHTML = '<span class="lw-avatar lw-avatar--initial">' + initial.replace(/[&<>"']/g, '') + '</span>';
  }
}

async function initSidebarUser() {
  if (!document.querySelector('.app-sidebar__user')) return;
  paintSidebarAvatar(null);
  await loadAvatarsScript();
  const session = window.LWAuth?.getCurrentUser?.();
  if (session && Object.prototype.hasOwnProperty.call(session, 'avatar')) {
    paintSidebarAvatar(session.avatar);
    return;
  }
  paintSidebarAvatar(null);
  try {
    if (!window.LWAuth?.whenAuthReady || !window.LWAuth?.getAvatar) return;
    await window.LWAuth.whenAuthReady();
    paintSidebarAvatar(await window.LWAuth.getAvatar());
  } catch (e) {
    console.warn('[main.js] sidebar picture not loaded:', e);
  }
}

function refreshSidebarUser() {
  const session = window.LWAuth?.getCurrentUser?.();
  paintSidebarAvatar(session ? session.avatar : null);
}


function initProgressBars() {
  document.querySelectorAll('.progress-bar__fill[data-progress]').forEach(el => {
    const pct = Math.min(100, Math.max(0, parseInt(el.dataset.progress, 10)));
    requestAnimationFrame(() => { el.style.setProperty('--p', String(pct)); });
  });
}


function showToast(message, type = 'info') {
  document.querySelectorAll('.toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');
  const TOAST_ICONS = { success: 'success', error: 'error', info: 'info', warning: 'warning' };
  if (window.LWIcons) {
    window.LWIcons.setLabel(toast, TOAST_ICONS[type] || 'info', message, { size: 'sm' });
  } else {
    toast.textContent = message;
  }
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast--visible'));
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3000);
}


function triggerLockedFeedback(el) {
  if (!el) return;
  el.classList.remove('lw-shake-invalid');
  void el.offsetWidth;
  el.classList.add('lw-shake-invalid');
  el.addEventListener('animationend', () => {
    el.classList.remove('lw-shake-invalid');
  }, { once: true });
}


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


document.addEventListener('DOMContentLoaded', () => {
  initActiveNav();
  initSidebarAccountLinks();
  initSidebarNavGuard();
  initProgressBars();
  initUserDetails();
  initSidebarUser();
  const footerP = document.querySelector('.footer p');
  if (footerP) footerP.textContent = `LinguaWave · Capstone Project 2026`;
});


window.LinguaWave = {
  getActiveUser,
  showToast,
  triggerLockedFeedback,
  refreshSidebarUser,
};
