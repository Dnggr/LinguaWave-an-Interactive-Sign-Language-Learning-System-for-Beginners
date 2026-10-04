/**
 * js/skeleton.js — helper for the loading skeletons (css/style.css §20, css/admin.css "ADMIN LOADING").
 * Classic script, no dependencies, safe to load on any page.
 *
 *  1. First swap only: when a [data-sk] container loses its .sk-group (the page
 *     script replaced it with real content) the new content fades in once.
 *     Later re-renders (e.g. the Firestore re-sync) are untouched, so nothing
 *     flashes a second time.
 *  2. Stall guard: a skeleton still on screen after STALL_MS means the load
 *     failed or hung (no LWXP, offline, signed out, slow network...). Rather than
 *     blink forever it becomes a quiet one-line note. If the data does arrive
 *     later, the page script's innerHTML still replaces the note as usual.
 *     Only skeletons that are actually visible are touched, so a hidden loading
 *     panel that is reused later (e.g. the admin Feedback "Refresh") keeps its
 *     skeleton instead of turning into a stale note.
 *     Skeleton table rows (tr.admin-table__sk) collapse into one note row.
 *  3. Inline skeletons: a number/label placeholder marked [data-sk-inline]
 *     (admin KPI tiles) is swapped for an em dash on stall. The page script's
 *     textContent = ... replaces the skeleton the normal way, so no cleanup is
 *     needed on success.
 *  4. window.LWSkeleton — small builders for pages that need to show a skeleton
 *     AGAIN after the first load (Refresh buttons), plus settle() so a page can
 *     end the loading look immediately when a request fails.
 *     Every builder returns the same markup the static HTML ships with.
 */
(function () {
  'use strict';
  var STALL_MS = 12000;
  var REVEAL_MS = 400;
  var NOTE_SLOW = 'Taking longer than usual\u2026 try refreshing the page.';
  var DASH = '\u2014';

  /* ── 1. fade-in on first swap ─────────────────────────────────── */
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

  /* ── 2 + 3. stall guard / settle ──────────────────────────────── */
  function isRendered(el) {
    return el.isConnected && el.getClientRects().length > 0;
  }

  function makeNote(msg) {
    var note = document.createElement('p');
    note.className = 'sk-stalled';
    note.setAttribute('role', 'status');
    note.textContent = msg;
    return note;
  }

  // onlyVisible: the timer only touches skeletons somebody can see right now.
  // An explicit settle() after a failed request replaces them wherever they are.
  function settle(root, msg, onlyVisible) {
    root = root || document;
    var groups = root.querySelectorAll('.sk-group');
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      if (!g.isConnected) continue;
      if (onlyVisible && !isRendered(g)) continue;
      g.replaceWith(makeNote(msg || NOTE_SLOW));
    }
    var rows = root.querySelectorAll('tr.admin-table__sk');
    if (rows.length && rows[0].isConnected && (!onlyVisible || isRendered(rows[0]))) {
      var tr = document.createElement('tr');
      var td = document.createElement('td');
      td.colSpan = rows[0].children.length;
      td.appendChild(makeNote(msg || NOTE_SLOW));
      tr.appendChild(td);
      rows[0].replaceWith(tr);
      for (var r = 1; r < rows.length; r++) rows[r].remove();
    }
    var inl = root.querySelectorAll('[data-sk-inline]');
    for (var j = 0; j < inl.length; j++) {
      var el = inl[j];
      if (!el.querySelector('.sk')) continue;
      if (onlyVisible && !isRendered(el)) continue;
      el.textContent = DASH;
    }
  }

  /* ── 4. builders (same markup as the static HTML) ─────────────── */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function sr(label) { return '<span class="sr-only">' + esc(label) + '</span>'; }
  function bar(w, h, cls) {
    return '<span class="sk ' + (cls || 'sk--line') + '" style="--w:' + w + (h ? ';--h:' + h : '') + '"></span>';
  }
  function group(label, inner, mod) {
    return '<div class="sk-group' + (mod ? ' ' + mod : '') + '" role="status">' + sr(label) + inner + '</div>';
  }

  var NAME_W = ['50%', '38%', '58%', '44%', '52%', '40%'];
  var SUB_W  = ['72%', '64%', '80%', '58%', '70%', '66%'];

  // Avatar + two lines + a small right-hand label (recent sign-ups, recent feedback).
  function list(label, n) {
    var rows = '';
    for (var i = 0; i < (n || 5); i++) {
      rows += '<div class="sk-row"><span class="sk sk--circle" style="--s:36px"></span>' +
        '<div class="sk-stack sk-stack--grow">' + bar(NAME_W[i % 6]) + bar(SUB_W[i % 6], '.7rem') + '</div>' +
        bar('3.5rem', '.7rem') + '</div>';
    }
    return group(label, rows, 'sk-group--list');
  }

  // Label + horizontal bar (lessons by chapter, feedback snapshot).
  var BAR_W = ['78%', '54%', '66%', '40%', '72%', '48%', '60%'];
  function bars(label, n) {
    var rows = '';
    for (var i = 0; i < (n || 6); i++) {
      rows += '<div class="sk-row">' + bar('6rem', '.8rem') + bar(BAR_W[i % 7], '.8rem') + '</div>';
    }
    return group(label, rows, 'sk-group--list');
  }

  // 14 vertical bars (sign-ups chart).
  var CHART_H = [35, 55, 42, 70, 48, 62, 30, 80, 52, 66, 40, 58, 74, 45];
  function chart(label) {
    var b = '';
    for (var i = 0; i < CHART_H.length; i++) b += '<span class="sk" style="--h:' + CHART_H[i] + '%"></span>';
    return group(label, '<div class="sk-bars">' + b + '</div>');
  }

  // Table body rows. Real <tr>/<td> cells (one per column), so the placeholders line up with the
  // table's own header columns. widths = percent width of the bar in each text column; a button-sized
  // pill is added as the last cell. The label is read out once, from the first cell.
  var ROW_SCALE = [1, 0.85, 0.95, 0.75, 0.9, 0.8];
  function table(label, n, widths) {
    var w = widths || [70, 85, 55];
    var out = '';
    for (var i = 0; i < (n || 6); i++) {
      var k = ROW_SCALE[i % 6];
      var cells = '';
      for (var c = 0; c < w.length; c++) {
        cells += '<td>' + (c === 0 && i === 0 ? sr(label) : '') + bar(Math.round(w[c] * k) + '%', '.9rem') + '</td>';
      }
      cells += '<td>' + bar('4.5rem', '1.8rem', 'sk--btn') + '</td>';
      out += '<tr class="admin-table__sk" aria-hidden="' + (i === 0 ? 'false' : 'true') + '">' + cells + '</tr>';
    }
    return out;
  }

  // Feedback cards.
  function cards(label, n) {
    var out = '';
    for (var i = 0; i < (n || 4); i++) {
      out += '<div class="sk-card"><div class="sk-row"><span class="sk sk--circle" style="--s:36px"></span>' +
        '<div class="sk-stack sk-stack--grow">' + bar(NAME_W[i % 6]) + bar(SUB_W[i % 6], '.7rem') + '</div>' +
        bar('5rem', '.8rem', 'sk--pill') + '</div>' + bar('96%', '.8rem') + bar(SUB_W[(i + 2) % 6], '.8rem') + '</div>';
    }
    return group(label, out, 'sk-group--cards');
  }

  // KPI number placeholder: goes inside an element marked [data-sk-inline].
  function kpi(w) { return bar(w || '3.2rem', '1.6rem', 'sk--title') + sr('Loading\u2026'); }

  window.LWSkeleton = {
    list: list, bars: bars, chart: chart, table: table, cards: cards, kpi: kpi,
    settle: function (root, msg) { settle(root, msg, false); },
    STALL_MS: STALL_MS
  };

  function init() {
    var hosts = document.querySelectorAll('[data-sk]');
    for (var i = 0; i < hosts.length; i++) watch(hosts[i]);
    setTimeout(function () { settle(document, NOTE_SLOW, true); }, STALL_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
