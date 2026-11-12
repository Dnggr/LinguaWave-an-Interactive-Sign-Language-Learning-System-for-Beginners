(function () {
  'use strict';

  var BASE = '../assets/profile_images/';
  var ID_RE = /^avatar-\d{2}$/;

  var LIST = [
    { id: 'avatar-01', file: '1.png',   label: 'Profile picture 1' },
    { id: 'avatar-02', file: '2.png',   label: 'Profile picture 2' },
    { id: 'avatar-03', file: '3.png',   label: 'Profile picture 3' },
    { id: 'avatar-04', file: '4.png',   label: 'Profile picture 4' },
    { id: 'avatar-05', file: '5.png',   label: 'Profile picture 5' },
    { id: 'avatar-06', file: '6.png',   label: 'Profile picture 6' },
    { id: 'avatar-07', file: '7.png',   label: 'Profile picture 7' },
    { id: 'avatar-08', file: '8.png',   label: 'Profile picture 8' },
    { id: 'avatar-09', file: '9.png',   label: 'Profile picture 9' },
    { id: 'avatar-10', file: '10.png', label: 'Profile picture 10' },
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
