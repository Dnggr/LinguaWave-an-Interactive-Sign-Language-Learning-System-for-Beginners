/**
 * js/avatars.js — the fixed set of profile pictures
 * ─────────────────────────────────────────────────────────────────
 * Learners CHOOSE from this list; they can never upload their own picture.
 * Only the picture's ID is stored: users/{uid}.avatar (their account) and
 * publicProfiles/{uid}.avatar (the leaderboard row). The image itself always
 * comes from assets/avatars/, so a stored ID can never point anywhere else.
 *
 * TO ADD / CHANGE PICTURES: put the image in assets/avatars/ and edit LIST.
 *   - `id`   must match /^avatar-\d{2}$/ (firestore.rules enforces the same
 *            pattern). Never reuse or renumber an ID — learners already have
 *            it saved.
 *   - `file` is the real file name inside assets/avatars/ (change the
 *            placeholder names below to match your actual files).
 *
 * Exposes window.LWAvatars. Plain script (not a module); load it before the
 * page script that uses it. All pages that use it live in /pages, hence BASE.
 * ─────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var BASE = '../assets/avatars/';
  var ID_RE = /^avatar-\d{2}$/;

  var LIST = [
    { id: 'avatar-01', file: 'avatar-01.png', label: 'Avatar 1' },
    { id: 'avatar-02', file: 'avatar-02.png', label: 'Avatar 2' },
    { id: 'avatar-03', file: 'avatar-03.png', label: 'Avatar 3' },
    { id: 'avatar-04', file: 'avatar-04.png', label: 'Avatar 4' },
    { id: 'avatar-05', file: 'avatar-05.png', label: 'Avatar 5' },
    { id: 'avatar-06', file: 'avatar-06.png', label: 'Avatar 6' },
    { id: 'avatar-07', file: 'avatar-07.png', label: 'Avatar 7' },
    { id: 'avatar-08', file: 'avatar-08.png', label: 'Avatar 8' },
    { id: 'avatar-09', file: 'avatar-09.png', label: 'Avatar 9' },
    { id: 'avatar-10', file: 'avatar-10.png', label: 'Avatar 10' },
    { id: 'avatar-11', file: 'avatar-11.png', label: 'Avatar 11' },
    { id: 'avatar-12', file: 'avatar-12.png', label: 'Avatar 12' },
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function find(id) {
    if (typeof id !== 'string' || !ID_RE.test(id)) return null;
    for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id) return LIST[i];
    return null;
  }

  function src(id) {
    var a = find(id);
    return a ? BASE + a.file : null;
  }

  /* HTML for one avatar. An unknown / missing ID (learner never picked one,
   * or a picture was retired) falls back to a circle with their initial, so
   * a row never shows a broken image. `opts.size`: 'lg' | 'xl' (default 40px).
   * `opts.name` is only used for that initial. alt="" because the name is
   * always printed right next to it. */
  function markup(id, opts) {
    opts = opts || {};
    var cls = 'lw-avatar' + (opts.size ? ' lw-avatar--' + opts.size : '');
    var a = find(id);
    if (!a) {
      var initial = String(opts.name || '?').trim().charAt(0).toUpperCase() || '?';
      return '<span class="' + cls + ' lw-avatar--initial" aria-hidden="true">' + esc(initial) + '</span>';
    }
    return '<img class="' + cls + '" src="' + esc(BASE + a.file) + '" alt="" loading="lazy" decoding="async">';
  }

  window.LWAvatars = { LIST: LIST, ID_RE: ID_RE, find: find, src: src, markup: markup };
})();
