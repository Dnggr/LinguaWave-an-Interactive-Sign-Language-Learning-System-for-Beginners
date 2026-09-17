/* =====================================================================
 * js/icons.js — LinguaWave shared icon system
 * ---------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * Before this, the SAME category was drawn three different ways
 * depending on which screen you were on: an emoji chip on index.html,
 * a hand-copied inline <svg> on pages/homepage.html, and an emoji
 * lookup table (UNIT_ICONS / CATEGORY_ICONS in js/camera-practice.js)
 * once you were deeper in the app. Status glyphs were worse still —
 * raw Unicode ("\u25b6", "\u2714", "\u25cb") and per-caller emoji picked by
 * hand at each call site. See LinguaWave_Icon_Audit.md.
 *
 * This is now the single source of truth for every icon in the app.
 * It restates the rationale that was already written on homepage.html
 * and then only honoured there: inline SVG painted with currentColor
 * renders identically on every OS/browser and depends on no font's
 * emoji fallback.
 *
 * ARCHITECTURE NOTES (non-obvious, please preserve)
 *  - Plain <script>, NOT an ES module, and it assigns window.LWIcons.
 *    The app mixes `type="module"` scripts (auth.js, camera-practice.js)
 *    with plain ones (main.js, data.js, missions.js); a global is the
 *    only shape both can read. Load it in <head> BEFORE any consumer.
 *  - The SVG bodies are inlined as strings rather than fetched from
 *    ./icons/*.svg on purpose: there is no build step and no dev server
 *    guarantee here, and fetch() of a relative path fails outright
 *    under the file:// protocol. Inlining also means an icon is never
 *    a frame late, so no icon-shaped layout pop on first paint.
 *  - Every icon shares one wrapper (24x24 viewBox, 1.8px round-cap
 *    currentColor stroke), so only the path body differs per id. Do not
 *    hand-edit a wrapper into BODIES — keep bodies path-only.
 *  - There is deliberately NO silent fallback. The old code did
 *    `CATEGORY_ICONS[cat.id] ?? '\ud83d\udd16'`, so an unmapped category
 *    rendered a generic bookmark emoji that nobody had chosen and
 *    nobody could see was wrong. An unknown id now renders a dashed
 *    placeholder, warns once in the console, and is recorded in
 *    LWIcons.missing() so it is catchable in review. If a generic icon
 *    IS the intent, ask for 'category' or 'unit' explicitly.
 * ===================================================================== */
(function (root) {
  'use strict';

  /* Shared wrapper attributes — identical for all 126 icons. */
  var OPEN  = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"'
            + ' fill="none" stroke="currentColor" stroke-width="1.8"'
            + ' stroke-linecap="round" stroke-linejoin="round" focusable="false"';
  var CLOSE = '</svg>';

  /* Path bodies, keyed by icon id. */
  var BODIES = {
    actions: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
    affection_feelings: '<path d="M20.8 8.8c0 5-8.8 10.2-8.8 10.2S3.2 13.8 3.2 8.8A4.7 4.7 0 0 1 12 6.3a4.7 4.7 0 0 1 8.8 2.5Z"/>',
    alphabet: '<path d="M4 18 8 6l4 12M5.5 14h5"/><path d="M15 18V6h2.7a3 3 0 0 1 0 6H15m2.7 0H19a3 3 0 0 1 0 6h-4"/>',
    amounts: '<path d="m4 19 15-15 2 2L6 21 4 19Z"/><path d="m9 14 2 2m-1-5 2 2m1-5 2 2m-1-5 2 2"/>',
    animals: '<circle cx="8" cy="8" r="2.1"/><circle cx="16" cy="8" r="2.1"/><circle cx="5.8" cy="12.5" r="1.9"/><circle cx="18.2" cy="12.5" r="1.9"/><path d="M12 11c-3.2 0-5 2.2-5 4.5 0 2.1 2 3.5 5 3.5s5-1.4 5-3.5c0-2.3-1.8-4.5-5-4.5Z"/>',
    animals_unit: '<circle cx="8" cy="8" r="2.1"/><circle cx="16" cy="8" r="2.1"/><circle cx="5.8" cy="12.5" r="1.9"/><circle cx="18.2" cy="12.5" r="1.9"/><path d="M12 11c-3.2 0-5 2.2-5 4.5 0 2.1 2 3.5 5 3.5s5-1.4 5-3.5c0-2.3-1.8-4.5-5-4.5Z"/>',
    answers: '<path d="m5 12 4 4L19 6"/>',
    appearance: '<path d="m12 3-1.3 4.7L6 9l4.7 1.3L12 15l1.3-4.7L18 9l-4.7-1.3L12 3Z"/><path d="m19 15-.7 2.3L16 18l2.3.7L19 21l.7-2.3L22 18l-2.3-.7L19 15Z"/><path d="m5 14-.6 1.9L2.5 16l1.9.6L5 18l.6-1.4L7.5 16l-1.9-.1L5 14Z"/>',
    asking_for_help: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="m6.3 6.3 3.6 3.6m4.2 4.2 3.6 3.6m0-11.4-3.6 3.6m-4.2 4.2-3.6 3.6"/>',
    asking_questions: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.7 2.7 0 1 1 4.8 1.7c-.9 1.1-2.3 1.4-2.3 3"/><path d="M12 17h.01"/>',
    basic_phrases: '<path d="M4 5.5h16v10H9l-5 4v-14Z"/>',
    basic_responses: '<path d="M4 5.5h16v10H9l-5 4v-14Z"/><path d="m8 10 2 2 5-5"/>',
    bathroom: '<path d="M4 12h16"/><path d="M6 12V7a3 3 0 0 1 5.5-1.7"/><path d="M4 12v3a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-3"/><path d="M7 19v2m10-2v2"/>',
    body: '<circle cx="12" cy="7" r="3"/><path d="M5 21c.7-4 3-6 7-6s6.3 2 7 6"/>',
    camera: '<path d="M4 8h4l1.5-2h5L16 8h4v11H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
    camera_tips: '<path d="M9 18h6m-5 3h4"/><path d="M8 14a6 6 0 1 1 8 0c-1 1-2 2-2 4h-4c0-2-1-3-2-4Z"/>',
    category: '<path d="M3 7h7l2 2h9v10H3z"/><path d="M3 7V5h7l2 2"/>',
    celebration: '<path d="m4 20 6-6m0 0 4-4m-4 4 3 3m1-11 3 3m-7-1 3 3m1-8 3 3"/><path d="m15 4 1-2m3 5 2-1m-1 5 2 .5"/>',
    classroom: '<rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 5V3h6v2M8 10h8M8 14h6M8 18h4"/>',
    classroom_actions: '<path d="M7 11V6a1.5 1.5 0 0 1 3 0v5m0 0V4.5a1.5 1.5 0 0 1 3 0V11m0 0V6a1.5 1.5 0 0 1 3 0v6m0 0V8.5a1.5 1.5 0 0 1 3 0v5.5c0 4.2-2.6 7-6.7 7H11c-2.6 0-4.4-1.5-5.2-3.5L4 13a1.5 1.5 0 0 1 2.8-1.1L8 14"/>',
    clothes: '<path d="m8 4 4 2 4-2 4 4-3 2v9H7v-9L4 8l4-4Z"/><path d="M9 6c.7 2 1.7 3 3 3s2.3-1 3-3"/>',
    clothes_unit: '<path d="m8 4 4 2 4-2 4 4-3 2v9H7v-9L4 8l4-4Z"/><path d="M9 6c.7 2 1.7 3 3 3s2.3-1 3-3"/>',
    colors: '<path d="M12 3a9 9 0 0 0 0 18h1.2c1.3 0 2-1.7 1-2.6-.8-.7-.3-2.2.8-2.2H17a4 4 0 0 0 4-4.1A9 9 0 0 0 12 3Z"/><circle cx="7.5" cy="10" r="1"/><circle cx="10" cy="6.8" r="1"/><circle cx="14" cy="6.8" r="1"/><circle cx="17" cy="10" r="1"/>',
    colors_unit: '<path d="M12 3a9 9 0 0 0 0 18h1.2c1.3 0 2-1.7 1-2.6-.8-.7-.3-2.2.8-2.2H17a4 4 0 0 0 4-4.1A9 9 0 0 0 12 3Z"/><circle cx="7.5" cy="10" r="1"/><circle cx="10" cy="6.8" r="1"/><circle cx="14" cy="6.8" r="1"/><circle cx="17" cy="10" r="1"/>',
    communicate: '<path d="M4 5.5h16v10H9l-5 4v-14Z"/>',
    communication: '<path d="M4 5.5h16v10H9l-5 4v-14Z"/>',
    community: '<path d="M4 21V9l6-3v15M10 21V4h6v17M16 21v-9l4 2v7"/><path d="M7 12h1m-1 3h1m5-8h1m-1 4h1m-1 4h1m5-1h1"/>',
    complete: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    continue_mission: '<path d="M4 12h15m-5-5 5 5-5 5"/>',
    conversation: '<path d="M4 5h15v9H9l-5 4V5Z"/><path d="M9 19h7l4-3V8"/>',
    current: '<path d="m9 6 9 6-9 6V6Z"/>',
    daily_activities: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 9h16"/><path d="M8 13h.01m4 0h.01m4 0h.01M8 17h.01m4 0h.01"/>',
    daily_needs: '<path d="M5 8h12v6a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8Z"/><path d="M17 10h2a2 2 0 0 1 0 4h-2M8 4c0 1 1 1 1 2m3-2c0 1 1 1 1 2"/>',
    dashboard: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    days: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 9h16"/><path d="M8 13h.01m4 0h.01m4 0h.01M8 17h.01m4 0h.01"/>',
    daytime: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
    describing_things: '<circle cx="8" cy="8" r="4"/><path d="m14 18 4-8 4 8Z"/><rect x="3" y="15" width="6" height="6" rx="1"/>',
    descriptions: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h5M9 12h6M9 16h6"/>',
    directions: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 4.9-4.9 2 2-4.9 4.9-2Z"/>',
    distance: '<path d="m4 19 15-15 2 2L6 21 4 19Z"/><path d="m9 14 2 2m-1-5 2 2m1-5 2 2m-1-5 2 2"/>',
    dressing: '<path d="m8 4 4 2 4-2 4 4-3 2v9H7v-9L4 8l4-4Z"/><path d="M9 6c.7 2 1.7 3 3 3s2.3-1 3-3"/>',
    drinks: '<path d="M5 8h12v6a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8Z"/><path d="M17 10h2a2 2 0 0 1 0 4h-2M8 4c0 1 1 1 1 2m3-2c0 1 1 1 1 2"/>',
    emergency_situations: '<path d="m12 3-1.3 4.7L6 9l4.7 1.3L12 15l1.3-4.7L18 9l-4.7-1.3L12 3Z"/><path d="m19 15-.7 2.3L16 18l2.3.7L19 21l.7-2.3L22 18l-2.3-.7L19 15Z"/><path d="m5 14-.6 1.9L2.5 16l1.9.6L5 18l.6-1.4L7.5 16l-1.9-.1L5 14Z"/>',
    error: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>',
    everyday_dialogues: '<path d="M4 5.5h16v10H9l-5 4v-14Z"/>',
    family: '<path d="m12 3-1.3 4.7L6 9l4.7 1.3L12 15l1.3-4.7L18 9l-4.7-1.3L12 3Z"/><path d="m19 15-.7 2.3L16 18l2.3.7L19 21l.7-2.3L22 18l-2.3-.7L19 15Z"/><path d="m5 14-.6 1.9L2.5 16l1.9.6L5 18l.6-1.4L7.5 16l-1.9-.1L5 14Z"/>',
    family_conversations: '<path d="M4 5h15v9H9l-5 4V5Z"/><path d="M9 19h7l4-3V8"/>',
    family_phrases: '<path d="m12 3-1.3 4.7L6 9l4.7 1.3L12 15l1.3-4.7L18 9l-4.7-1.3L12 3Z"/><path d="m19 15-.7 2.3L16 18l2.3.7L19 21l.7-2.3L22 18l-2.3-.7L19 15Z"/><path d="m5 14-.6 1.9L2.5 16l1.9.6L5 18l.6-1.4L7.5 16l-1.9-.1L5 14Z"/>',
    family_unit: '<path d="m12 3-1.3 4.7L6 9l4.7 1.3L12 15l1.3-4.7L18 9l-4.7-1.3L12 3Z"/><path d="m19 15-.7 2.3L16 18l2.3.7L19 21l.7-2.3L22 18l-2.3-.7L19 15Z"/><path d="m5 14-.6 1.9L2.5 16l1.9.6L5 18l.6-1.4L7.5 16l-1.9-.1L5 14Z"/>',
    feedback: '<path d="M4 5.5h16v10H9l-5 4v-14Z"/>',
    feelings: '<path d="m12 3-1.3 4.7L6 9l4.7 1.3L12 15l1.3-4.7L18 9l-4.7-1.3L12 3Z"/><path d="m19 15-.7 2.3L16 18l2.3.7L19 21l.7-2.3L22 18l-2.3-.7L19 15Z"/><path d="m5 14-.6 1.9L2.5 16l1.9.6L5 18l.6-1.4L7.5 16l-1.9-.1L5 14Z"/>',
    fingerspell_name: '<path d="M7 11V6a1.5 1.5 0 0 1 3 0v5m0 0V4.5a1.5 1.5 0 0 1 3 0V11m0 0V6a1.5 1.5 0 0 1 3 0v6m0 0V8.5a1.5 1.5 0 0 1 3 0v5.5c0 4.2-2.6 7-6.7 7H11c-2.6 0-4.4-1.5-5.2-3.5L4 13a1.5 1.5 0 0 1 2.8-1.1L8 14"/>',
    food: '<path d="M12 7c-2-3-5-2-6.5 0-2 3-.8 9 2.1 11.4 1.2 1 2.5-.1 4.4-.1s3.2 1.1 4.4.1C19.3 16 20 10 18 7c-1.4-2.2-4.1-3-6-.0Z"/><path d="M12 7c0-2 1-3 3-4M13 4c1.2-.7 2.2-.7 3-.5"/>',
    food_unit: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M4 5v5m2-5v5m-2-2h2M19 5v5"/>',
    frequency: '<path d="M4 8h13l-2-2m2 2-2 2M20 16H7l2 2m-2-2 2-2"/>',
    fruits: '<path d="M12 7c-2-3-5-2-6.5 0-2 3-.8 9 2.1 11.4 1.2 1 2.5-.1 4.4-.1s3.2 1.1 4.4.1C19.3 16 20 10 18 7c-1.4-2.2-4.1-3-6-.0Z"/><path d="M12 7c0-2 1-3 3-4M13 4c1.2-.7 2.2-.7 3-.5"/>',
    furniture: '<path d="M5 12V9a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3"/><path d="M4 12h16v6H4z"/><path d="M6 18v2m12-2v2"/>',
    greetings: '<path d="M7 11V6a1.5 1.5 0 0 1 3 0v5m0 0V4.5a1.5 1.5 0 0 1 3 0V11m0 0V6a1.5 1.5 0 0 1 3 0v6m0 0V8.5a1.5 1.5 0 0 1 3 0v5.5c0 4-2.6 7-6.7 7H11c-3 0-5-2-5.8-4.4L4 13a1.5 1.5 0 0 1 3-1.1L8 14"/>',
    greetings_intro: '<path d="M7 11V6a1.5 1.5 0 0 1 3 0v5m0 0V4.5a1.5 1.5 0 0 1 3 0V11m0 0V6a1.5 1.5 0 0 1 3 0v6m0 0V8.5a1.5 1.5 0 0 1 3 0v5.5c0 4-2.6 7-6.7 7H11c-3 0-5-2-5.8-4.4L4 13a1.5 1.5 0 0 1 3-1.1L8 14"/>',
    hand_actions: '<path d="M4 12c2-2 4-2 6 0l2 2 2-2c2-2 4-2 6 0"/><path d="M7 15c2 2 4 3 5 3s3-1 5-3"/>',
    health: '<path d="M12 21s-7-4.2-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.8-7 10-7 10Z"/><path d="M9 12h6m-3-3v6"/>',
    hero_sparkle: '<path d="m12 3-1.3 4.7L6 9l4.7 1.3L12 15l1.3-4.7L18 9l-4.7-1.3L12 3Z"/><path d="m19 15-.7 2.3L16 18l2.3.7L19 21l.7-2.3L22 18l-2.3-.7L19 15Z"/><path d="m5 14-.6 1.9L2.5 16l1.9.6L5 18l.6-1.4L7.5 16l-1.9-.1L5 14Z"/>',
    home: '<path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    household: '<rect x="5" y="4" width="14" height="16" rx="1"/><path d="M12 4v16M5 12h14"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-9h.01"/>',
    insects: '<path d="M9 8h6l2 3v5a5 5 0 0 1-10 0v-5l2-3Z"/><path d="M12 8V5m-5 6H3m18 0h-4M7 16H4m16 0h-3M8 6l-2-2m10 2 2-2"/>',
    kitchen: '<path d="M5 10h10a4 4 0 0 1 4 4v2H5z"/><path d="M19 14h3"/>',
    learn: '<path d="M3 5a3 3 0 0 1 3-2h5v17H6a3 3 0 0 0-3 2V5Zm18 0a3 3 0 0 0-3-2h-5v17h5a3 3 0 0 1 3 2V5Z"/>',
    location: '<path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
    locked: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    making_requests: '<path d="M9 11V6a1.5 1.5 0 0 1 3 0v5m0 0V4a1.5 1.5 0 0 1 3 0v7m0 0V6a1.5 1.5 0 0 1 3 0v7m0 0V9a1.5 1.5 0 0 1 3 0v5c0 4-3 7-7 7H10c-3 0-5-2-6-5l-1-3a1.5 1.5 0 0 1 2.8-1.1L7 14V11a1.5 1.5 0 0 1 3 0Z"/>',
    manners: '<circle cx="12" cy="6" r="2"/><path d="M7 20c1-4 2.5-6 5-6s4 2 5 6M5 11h14M8 11l-3 3m11-3 3 3"/>',
    money: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M7 9h.01M17 15h.01"/>',
    months: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 9h16"/><path d="M8 13h.01m4 0h.01m4 0h.01M8 17h.01m4 0h.01"/>',
    nature: '<path d="M12 3 7 10h3l-4 5h5v5h2v-5h5l-4-5h3z"/>',
    needs: '<path d="M5 8h12v6a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8Z"/><path d="M17 10h2a2 2 0 0 1 0 4h-2M8 4c0 1 1 1 1 2m3-2c0 1 1 1 1 2"/>',
    not_started: '<circle cx="12" cy="12" r="9"/>',
    numbers: '<path d="M7 5 5 19M15 5l-2 14M4 10h16M3 15h16"/>',
    people: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c.7-4 2.7-6 6-6s5.3 2 6 6M15 15c3 0 5 1.6 6 5"/>',
    personal_information: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M13 10h5m-5 3h5"/>',
    personal_items: '<path d="M5 8h14l1 12H4L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    phrasebook: '<path d="M5 4h10a4 4 0 0 1 4 4v12H8a3 3 0 0 1-3-3V4Z"/><path d="M8 20V8a4 4 0 0 1 4-4"/>',
    places: '<path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    places_unit: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15m6-12v15"/>',
    plants: '<path d="M12 21V10"/><path d="M12 12c-5 0-7-3-7-6 4 0 7 2 7 6Zm0 2c5 0 7-3 7-6-4 0-7 2-7 6Z"/>',
    polite_expressions: '<path d="M4 12c2-2 4-2 6 0l2 2 2-2c2-2 4-2 6 0"/><path d="M7 15c2 2 4 3 5 3s3-1 5-3"/>',
    polite_words: '<path d="M4 12c2-2 4-2 6 0l2 2 2-2c2-2 4-2 6 0"/><path d="M7 15c2 2 4 3 5 3s3-1 5-3"/>',
    professions: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/>',
    progress: '<path d="M4 19V5m0 14h16"/><path d="m7 15 4-4 3 2 5-6"/>',
    questions: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.7 2.7 0 1 1 4.8 1.7c-.9 1.1-2.3 1.4-2.3 3"/><path d="M12 17h.01"/>',
    quote: '<path d="M9 11H5a3 3 0 0 0-3 3v3h7v-6Zm13 0h-4a3 3 0 0 0-3 3v3h7v-6Z"/>',
    requests: '<path d="M7 11V6a1.5 1.5 0 0 1 3 0v5m0 0V4.5a1.5 1.5 0 0 1 3 0V11m0 0V6a1.5 1.5 0 0 1 3 0v6m0 0V8.5a1.5 1.5 0 0 1 3 0v5.5c0 4.2-2.6 7-6.7 7H11c-2.6 0-4.4-1.5-5.2-3.5L4 13a1.5 1.5 0 0 1 2.8-1.1L8 14"/>',
    requests_unit: '<path d="M9 11V6a1.5 1.5 0 0 1 3 0v5m0 0V4a1.5 1.5 0 0 1 3 0v7m0 0V6a1.5 1.5 0 0 1 3 0v7m0 0V9a1.5 1.5 0 0 1 3 0v5c0 4-3 7-7 7H10c-3 0-5-2-6-5l-1-3a1.5 1.5 0 0 1 2.8-1.1L7 14V11a1.5 1.5 0 0 1 3 0Z"/>',
    responses: '<path d="M4 5.5h16v10H9l-5 4v-14Z"/><path d="m8 10 2 2 5-5"/>',
    school: '<path d="m3 10 9-5 9 5-9 5-9-5Z"/><path d="M6 12v5c3 2 9 2 12 0v-5M21 10v7"/>',
    school_conversations: '<path d="m3 10 9-5 9 5-9 5-9-5Z"/><path d="M6 12v5c3 2 9 2 12 0v-5M21 10v7"/>',
    school_supplies: '<path d="m4 20 3.5-1 11-11-2.5-2.5-11 11L4 20Z"/><path d="m14.5 6.5 2.5 2.5"/>',
    seasons: '<path d="M20 4C11 4 5 8 5 15c0 3 2 5 5 5 7 0 10-7 10-16Z"/><path d="M4 20c4-5 8-8 13-10"/>',
    self_introduction: '<circle cx="9" cy="9" r="2.5"/><path d="M4 17c1-3 3-4 5-4s4 1 5 4"/><rect x="14" y="5" width="6" height="14" rx="1"/><path d="M16 9h2m-2 3h2"/>',
    sequence: '<path d="M7 5 5 19M15 5l-2 14M4 10h16M3 15h16"/>',
    sequence_demo: '<path d="M4 5.5h16v10H9l-5 4v-14Z"/>',
    settings: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="M4.9 9.2 3 8l2-3 2.1 1.2A8 8 0 0 1 9 5.2L9.2 3h3.6l.2 2.2a8 8 0 0 1 1.9 1l2.1-1.2 2 3-1.9 1.2c.1.6.1 1.2 0 1.8L19 10.8l-2 3-2.1-1.2a8 8 0 0 1-1.9 1l-.2 2.2H9.2L9 13.6a8 8 0 0 1-1.9-1L5 13.8l-2-3 1.9-1.2a8 8 0 0 1 0-1.4Z"/>',
    shapes: '<circle cx="8" cy="8" r="4"/><path d="m14 18 4-8 4 8Z"/><rect x="3" y="15" width="6" height="6" rx="1"/>',
    shopping_ordering: '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2M8 12h8"/>',
    size: '<path d="m4 19 15-15 2 2L6 21 4 19Z"/><path d="m9 14 2 2m-1-5 2 2m1-5 2 2m-1-5 2 2"/>',
    snacks: '<path d="M20 12a8 8 0 1 1-8-8 4 4 0 0 0 8 8Z"/><circle cx="9" cy="14" r="1"/><circle cx="13" cy="17" r="1"/><circle cx="15" cy="11" r="1"/>',
    social: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c.7-4 2.7-6 6-6s5.3 2 6 6M15 15c3 0 5 1.6 6 5"/>',
    social_conversations: '<path d="m4 20 6-6m0 0 4-4m-4 4 3 3m1-11 3 3m-7-1 3 3m1-8 3 3"/><path d="m15 4 1-2m3 5 2-1m-1 5 2 .5"/>',
    sound: '<path d="M4 10h4l5-4v12l-5-4H4z"/><path d="M16 9c1.5 1.5 1.5 4.5 0 6m2-8c3 3 3 7 0 10"/>',
    subjects: '<path d="M5 4h10a4 4 0 0 1 4 4v12H8a3 3 0 0 1-3-3V4Z"/><path d="M8 20V8a4 4 0 0 1 4-4"/>',
    success: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    talking_about_feelings: '<path d="M4 5.5h16v10H9l-5 4v-14Z"/>',
    taste: '<path d="M7 4c1 2 1 4 0 6s-1 5 2 7c2 1 4 1 6 0 3-2 3-5 2-7s-1-4 0-6"/><path d="M9 20h6"/>',
    temperature: '<path d="M10 14.5V5a2 2 0 1 1 4 0v9.5a4 4 0 1 1-4 0Z"/><path d="M12 9v7"/>',
    theme_moon: '<path d="M20 15a8 8 0 0 1-11-11 8 8 0 1 0 11 11Z"/>',
    theme_sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
    time: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    time_unit: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    touch: '<path d="M7 11V6a1.5 1.5 0 0 1 3 0v5m0 0V4.5a1.5 1.5 0 0 1 3 0V11m0 0V6a1.5 1.5 0 0 1 3 0v6m0 0V8.5a1.5 1.5 0 0 1 3 0v5.5c0 4.2-2.6 7-6.7 7H11c-2.6 0-4.4-1.5-5.2-3.5L4 13a1.5 1.5 0 0 1 2.8-1.1L8 14"/>',
    transportation: '<circle cx="13" cy="5" r="2"/><path d="m12 8-2 5 3 2 2 5m-3-5-4 4m2-6 5-1 2 3"/>',
    turn_taking: '<path d="M4 8h13l-2-2m2 2-2 2M20 16H7l2 2m-2-2 2-2"/>',
    unit: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
    vegetables: '<path d="m12 3-1.3 4.7L6 9l4.7 1.3L12 15l1.3-4.7L18 9l-4.7-1.3L12 3Z"/><path d="m19 15-.7 2.3L16 18l2.3.7L19 21l.7-2.3L22 18l-2.3-.7L19 15Z"/><path d="m5 14-.6 1.9L2.5 16l1.9.6L5 18l.6-1.4L7.5 16l-1.9-.1L5 14Z"/>',
    vehicles: '<path d="m5 16 1-5 2-3h8l2 3 1 5M4 16h16v3H4z"/><circle cx="8" cy="19" r="1"/><circle cx="16" cy="19" r="1"/>',
    weather: '<path d="M8 17h9a4 4 0 0 0 .5-8A5 5 0 0 0 8 7a5 5 0 0 0 0 10Z"/><path d="M6 4v2m-3 1 1.5 1M2 12h2m8-8v2m3-1-1.5 1"/>',
    wild_animals: '<circle cx="12" cy="12" r="7"/><path d="M8 8 6 5m10 3 2-3M8 16l-2 3m10-3 2 3"/><circle cx="9.5" cy="11" r=".7"/><circle cx="14.5" cy="11" r=".7"/><path d="M10 14c1.3 1 2.7 1 4 0"/>',
  };

  /* ── LOCAL OVERRIDES ────────────────────────────────────────────────
   * The supplied 24x24 pack ships 126 files but only 81 distinct path
   * bodies — 27 groups of ids share identical artwork. Some of that is
   * fine and intentional (a unit and its category are the same subject:
   * animals/animals_unit, colors/colors_unit, time/time_unit). Some of
   * it is not, and would have re-created the exact defect the icon audit
   * was written about — two unrelated concepts drawn the same way on one
   * screen. The bodies below replace the pack's for ids where that
   * mattered on a screen a user actually sees:
   *
   *   feelings, family, family_unit, family_phrases, appearance,
   *   emergency_situations, vegetables  — the pack drew all seven as the
   *       hero sparkle. "Feelings" is a landing-page chip, a homepage
   *       topic card AND a sidebar row, so a sparkle there reads as a bug.
   *   communicate  — the pack drew it as the plain speech bubble, which
   *       is the Feedback nav icon. That is audit section 1 verbatim:
   *       nav item and benefit card sharing one glyph.
   *   daytime  — the pack drew it as theme_sun, i.e. the theme toggle.
   *   fingerspell_name, needs, social, sequence  — each was identical to
   *       an unrelated sibling (requests / drinks / people / numbers).
   *
   * 'user' and 'warning' are additions, not overrides: the pack has no
   * avatar glyph (the header user chip needed one) and no warning glyph
   * distinct from 'error' (the tracking/model failures are warnings, not
   * errors, and were "\\u26a0\\ufe0f" in a textContent string).
   *
   * Everything NOT listed here still uses the pack's own artwork. The
   * remaining shared-shape groups are recorded in the migration notes;
   * they are lower-visibility and want a designer, not a stopgap. */
  var OVERRIDES = {
    feelings: '<circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01"/><path d="M8.2 14.2a4.8 4.8 0 0 0 7.6 0"/>',
    family: '<circle cx="7" cy="7.5" r="2.6"/><circle cx="17" cy="7.5" r="2.6"/><circle cx="12" cy="14" r="2.1"/><path d="M2.5 16.5c.6-3 2.3-4.4 4.5-4.4M21.5 16.5c-.6-3-2.3-4.4-4.5-4.4M8.5 21c.4-2.4 1.5-3.4 3.5-3.4s3.1 1 3.5 3.4"/>',
    family_unit: '<path d="M3 11.2 12 4.2l9 7"/><path d="M5.6 9.6V20h12.8V9.6"/><circle cx="12" cy="12.8" r="1.8"/><path d="M8.4 19c.5-2.3 1.9-3.4 3.6-3.4s3.1 1.1 3.6 3.4"/>',
    family_phrases: '<path d="M4 5.5h16v10H9l-5 4v-14Z"/><circle cx="9.6" cy="9.4" r="1.5"/><circle cx="14.4" cy="9.4" r="1.5"/>',
    appearance: '<circle cx="12" cy="8" r="4.2"/><path d="M4.5 20.5c1-4.2 3.9-6.3 7.5-6.3s6.5 2.1 7.5 6.3"/><path d="M10.4 7.6h.01M13.6 7.6h.01"/>',
    emergency_situations: '<path d="M6 17.5a6 6 0 0 1 12 0H6Z"/><path d="M3.5 21h17"/><path d="M12 4.5v2.4M6.6 6.6 8.2 8.2M17.4 6.6 15.8 8.2"/>',
    vegetables: '<path d="M12.8 10.2 5 18a2.1 2.1 0 0 0 3 3l7.8-7.8-3-3Z"/><path d="M14.4 11.8c1.2-1.9 3.2-2.7 5.1-2.1M13 10.2c-.5-2 .4-4 2.1-5"/>',
    communicate: '<path d="M3.5 5.5h12.5v9H8.5l-5 4v-13Z"/><path d="M18.8 7.6a5 5 0 0 1 0 7M21.4 5a8.6 8.6 0 0 1 0 12.2"/>',
    daytime: '<path d="M12 4v1.8M5.4 11.5H3.6M20.4 11.5h-1.8M7.3 6.3 6 5M16.7 6.3 18 5"/><circle cx="12" cy="11.5" r="3.4"/><path d="M3 17h18M6 20.5h12"/>',
    fingerspell_name: '<path d="M7 11V5.8a1.6 1.6 0 0 1 3.2 0V11m0-1.4a1.6 1.6 0 0 1 3.2 0V11m0-.6a1.6 1.6 0 0 1 3.2 0v4.2A6 6 0 0 1 10.6 21H10a6 6 0 0 1-6-6v-2.4a1.6 1.6 0 0 1 3-.8"/>',
    needs: '<path d="M6.2 8.5h11.6l-1 11.2a1.8 1.8 0 0 1-1.8 1.6H9a1.8 1.8 0 0 1-1.8-1.6L6.2 8.5Z"/><path d="M14.5 8.5 16.2 3M7 12.5h10"/>',
    social: '<circle cx="12" cy="6.5" r="2.4"/><circle cx="5.5" cy="16.5" r="2.4"/><circle cx="18.5" cy="16.5" r="2.4"/><path d="M10.2 8.2 7.3 14.3M13.8 8.2l2.9 6.1M8 17.3h8"/>',
    sequence: '<path d="m5.5 7 3.5 5-3.5 5M12 7l3.5 5-3.5 5"/><path d="M19.5 6.5v11"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20.6c.9-3.9 3.5-5.9 7-5.9s6.1 2 7 5.9"/>',
    warning: '<path d="M12 4.2 2.6 20.2h18.8L12 4.2Z"/><path d="M12 10v4.2m0 2.8h.01"/>'
  };
  for (var ovr in OVERRIDES) {
    if (Object.prototype.hasOwnProperty.call(OVERRIDES, ovr)) BODIES[ovr] = OVERRIDES[ovr];
  }

  /* Human-readable names, used for aria-label when an icon is NOT
   * decorative (i.e. when it is the only thing conveying meaning). */
  var LABELS = {
    user: 'Your account',
    warning: 'Warning',
    actions: 'Actions',
    affection_feelings: 'Affection Feelings',
    alphabet: 'Alphabet',
    amounts: 'Amounts',
    animals: 'Animals',
    animals_unit: 'Animals Unit',
    answers: 'Answers',
    appearance: 'Appearance',
    asking_for_help: 'Asking For Help',
    asking_questions: 'Asking Questions',
    basic_phrases: 'Basic Phrases',
    basic_responses: 'Basic Responses',
    bathroom: 'Bathroom',
    body: 'Body',
    camera: 'Camera',
    camera_tips: 'Camera Tips',
    category: 'Category',
    celebration: 'Celebration',
    classroom: 'Classroom',
    classroom_actions: 'Classroom Actions',
    clothes: 'Clothes',
    clothes_unit: 'Clothes Unit',
    colors: 'Colors',
    colors_unit: 'Colors Unit',
    communicate: 'Communicate',
    communication: 'Communication',
    community: 'Community',
    complete: 'Complete',
    continue_mission: 'Continue Mission',
    conversation: 'Conversation',
    current: 'Current',
    daily_activities: 'Daily Activities',
    daily_needs: 'Daily Needs',
    dashboard: 'Dashboard',
    days: 'Days',
    daytime: 'Daytime',
    describing_things: 'Describing Things',
    descriptions: 'Descriptions',
    directions: 'Directions',
    distance: 'Distance',
    dressing: 'Dressing',
    drinks: 'Drinks',
    emergency_situations: 'Emergency Situations',
    error: 'Error',
    everyday_dialogues: 'Everyday Dialogues',
    family: 'Family',
    family_conversations: 'Family Conversations',
    family_phrases: 'Family Phrases',
    family_unit: 'Family Unit',
    feedback: 'Feedback',
    feelings: 'Feelings',
    fingerspell_name: 'Fingerspell Name',
    food: 'Food',
    food_unit: 'Food Unit',
    frequency: 'Frequency',
    fruits: 'Fruits',
    furniture: 'Furniture',
    greetings: 'Greetings',
    greetings_intro: 'Greetings Intro',
    hand_actions: 'Hand Actions',
    health: 'Health',
    hero_sparkle: 'Hero Sparkle',
    home: 'Home',
    household: 'Household',
    info: 'Info',
    insects: 'Insects',
    kitchen: 'Kitchen',
    learn: 'Learn',
    location: 'Location',
    locked: 'Locked',
    making_requests: 'Making Requests',
    manners: 'Manners',
    money: 'Money',
    months: 'Months',
    nature: 'Nature',
    needs: 'Needs',
    not_started: 'Not Started',
    numbers: 'Numbers',
    people: 'People',
    personal_information: 'Personal Information',
    personal_items: 'Personal Items',
    phrasebook: 'Phrasebook',
    places: 'Places',
    places_unit: 'Places Unit',
    plants: 'Plants',
    polite_expressions: 'Polite Expressions',
    polite_words: 'Polite Words',
    professions: 'Professions',
    progress: 'Progress',
    questions: 'Questions',
    quote: 'Quote',
    requests: 'Requests',
    requests_unit: 'Requests Unit',
    responses: 'Responses',
    school: 'School',
    school_conversations: 'School Conversations',
    school_supplies: 'School Supplies',
    seasons: 'Seasons',
    self_introduction: 'Self Introduction',
    sequence: 'Sequence',
    sequence_demo: 'Sequence Demo',
    settings: 'Settings',
    shapes: 'Shapes',
    shopping_ordering: 'Shopping Ordering',
    size: 'Size',
    snacks: 'Snacks',
    social: 'Social',
    social_conversations: 'Social Conversations',
    sound: 'Sound',
    subjects: 'Subjects',
    success: 'Success',
    talking_about_feelings: 'Talking About Feelings',
    taste: 'Taste',
    temperature: 'Temperature',
    theme_moon: 'Theme Moon',
    theme_sun: 'Theme Sun',
    time: 'Time',
    time_unit: 'Time Unit',
    touch: 'Touch',
    transportation: 'Transportation',
    turn_taking: 'Turn Taking',
    unit: 'Unit',
    vegetables: 'Vegetables',
    vehicles: 'Vehicles',
    weather: 'Weather',
    wild_animals: 'Wild Animals',
  };

  /* Semantic aliases -> pack ids. These exist so call sites can name the
   * MEANING they want ('done', 'lock') without caring what the artwork
   * file happens to be called. Resolving three concepts that used to
   * share one glyph (audit section 1) is handled here too: 'learn',
   * 'progress' and 'communicate' are now distinct from the topic icons
   * 'phrasebook', 'sequence' and 'people' they used to be confused with. */
  var ALIASES = {
    done: 'complete',
    completed: 'complete',
    lock: 'locked',
    active: 'current',
    todo: 'not_started',
    pending: 'not_started',
    warning: 'error',
    confirming: 'info',
    celebrate: 'celebration',
    practice: 'camera',
    sparkle: 'hero_sparkle',
    sun: 'theme_sun',
    moon: 'theme_moon',
    /* FOUND DURING MIGRATION — js/data.js renamed three CATEGORIES ids to
     * an 'essentials_' prefix at some point, but the icon maps were never
     * updated. Because the old lookup ended in a bookmark-emoji default,
     * these three categories have been silently rendering a generic
     * bookmark that nobody picked — exactly the failure the audit
     * predicted. Same subjects, just renamed, so they alias to the
     * artwork that was always meant for them. */
    essentials_greetings: 'greetings_intro',
    essentials_polite_expressions: 'polite_expressions',
    essentials_basic_responses: 'basic_responses',
    /* 'welcome' is the one id the homepage pivot removed from UNITS but
     * that older links/bookmarks can still carry — point it somewhere
     * sensible rather than at the placeholder. */
    welcome: 'greetings_intro'
  };

  /* NOTE: every id used by UNIT_ICONS and CATEGORY_ICONS (103 of them)
   * has real artwork in BODIES, so none of them needs an alias. Aliases
   * above are semantic conveniences only. resolve() checks BODIES first,
   * so an alias can never shadow a real icon. */

  var MISSING = {};   /* id -> times requested, for LWIcons.missing() */

  var PLACEHOLDER =
    '<rect x="3.5" y="3.5" width="17" height="17" rx="3" stroke-dasharray="3 3"/>'
    + '<path d="M9.7 9.4a2.3 2.3 0 1 1 2.3 2.6v1"/><path d="M12 16.2v.01"/>';

  function resolve(id) {
    if (!id) return null;
    var key = String(id);
    if (BODIES[key]) return key;
    if (ALIASES[key] && BODIES[ALIASES[key]]) return ALIASES[key];
    return null;
  }

  function has(id) { return resolve(id) !== null; }

  function noteMissing(id) {
    var key = String(id || '(empty)');
    if (!MISSING[key]) {
      MISSING[key] = 0;
      if (root.console && console.warn) {
        console.warn('[LWIcons] no icon assigned for id "' + key
          + '" — rendering the explicit placeholder. Add a body to'
          + ' BODIES in js/icons.js or an alias in ALIASES.');
      }
    }
    MISSING[key]++;
  }

  /* opts:
   *   size   'md' (24, default) | 'sm' (16) | 'status' (14) | 'nav' (24)
   *   className  extra classes appended after the size class
   *   label  accessible name. Pass a string when the icon carries meaning
   *          on its own; omit it for decorative icons sitting next to
   *          visible text (the common case), which get aria-hidden. */
  function markup(id, opts) {
    opts = opts || {};
    var key = resolve(id);
    var body = key ? BODIES[key] : (noteMissing(id), PLACEHOLDER);
    var cls  = 'lw-icon';
    if (opts.size && opts.size !== 'md') cls += ' lw-icon--' + opts.size;
    if (!key) cls += ' lw-icon--missing';
    if (opts.className) cls += ' ' + opts.className;
    var label = opts.label;
    if (label === true) label = key ? LABELS[key] : 'Missing icon';
    var a11y = label
      ? ' role="img" aria-label="' + String(label).replace(/"/g, '&quot;') + '"'
      : ' aria-hidden="true"';
    return OPEN + ' class="' + cls + '"' + a11y + '>' + body + CLOSE;
  }

  /* DOM-node form. Use this instead of markup() whenever the text beside
   * the icon is DYNAMIC (a model's detected label, a user's name, a sign
   * id): building a node and setting .textContent separately means
   * nothing user- or model-supplied is ever parsed as HTML. */
  function node(id, opts) {
    var wrap = document.createElement('div');
    wrap.innerHTML = markup(id, opts);
    return wrap.firstChild;
  }

  /* Replace an element's contents with "[icon] text".
   * This is the safe replacement for the ~40 call sites that used to do
   * el.textContent = '\u2705 Nice! Detected: ' + label; an emoji could ride
   * along inside textContent, an <svg> cannot. */
  function setLabel(el, id, text, opts) {
    if (!el) return el;
    el.textContent = '';
    if (id) el.appendChild(node(id, opts));
    if (text !== undefined && text !== null && text !== '') {
      var span = document.createElement('span');
      span.className = 'lw-icon-label';
      span.textContent = String(text);
      el.appendChild(span);
    }
    return el;
  }

  /* Swap the icon inside an element that setLabel() already populated,
   * leaving the text alone. Used by the theme toggle. */
  function replaceIcon(el, id, opts) {
    if (!el) return el;
    var old = el.querySelector('svg.lw-icon');
    var fresh = node(id, opts);
    if (old) el.replaceChild(fresh, old);
    else el.insertBefore(fresh, el.firstChild);
    return el;
  }

  root.LWIcons = {
    markup: markup,
    node: node,
    setLabel: setLabel,
    replaceIcon: replaceIcon,
    has: has,
    resolve: resolve,
    label: function (id) { var k = resolve(id); return k ? LABELS[k] : null; },
    ids: function () { return Object.keys(BODIES).sort(); },
    missing: function () { return JSON.parse(JSON.stringify(MISSING)); },
    /* Hydrate any element carrying data-lw-icon="<id>" in static markup.
     * Lets HTML pages declare icons without inlining 126 path strings
     * into every page, and keeps index.html's chips in sync with the
     * same map the in-app screens use. */
    hydrate: function (scope) {
      var nodes = (scope || document).querySelectorAll('[data-lw-icon]');
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        if (el.getAttribute('data-lw-icon-done') === '1') continue;
        var opts = { size: el.getAttribute('data-lw-icon-size') || 'md' };
        var lbl = el.getAttribute('data-lw-icon-label');
        if (lbl) opts.label = lbl;
        /* data-lw-icon-class puts extra classes on the <svg> itself, not
         * on a wrapper. The theme toggle needs this: css/style.css
         * animates .theme-switch__icon--sun / --moon on the svg element,
         * so the class has to land there or the sun/moon crossfade dies. */
        var extra = el.getAttribute('data-lw-icon-class');
        if (extra) opts.className = extra;
        /* data-lw-icon-self="1" means "become the icon", i.e. replace this
         * placeholder element rather than nest an svg inside it. Used
         * where CSS already targets the svg as a direct child. */
        if (el.getAttribute('data-lw-icon-self') === '1' && el.parentNode) {
          var svg = node(el.getAttribute('data-lw-icon'), opts);
          svg.setAttribute('data-lw-icon-done', '1');
          el.parentNode.replaceChild(svg, el);
          continue;
        }
        el.innerHTML = markup(el.getAttribute('data-lw-icon'), opts);
        el.setAttribute('data-lw-icon-done', '1');
      }
      return nodes.length;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { root.LWIcons.hydrate(); });
  } else {
    root.LWIcons.hydrate();
  }
})(typeof window !== 'undefined' ? window : globalThis);
