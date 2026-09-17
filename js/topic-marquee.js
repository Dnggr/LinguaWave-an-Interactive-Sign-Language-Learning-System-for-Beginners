/* =====================================================================
 * js/topic-marquee.js — Homepage topic-preview marquee (full unit list)
 * ---------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * The TOPIC PREVIEW marquee on index.html used to hard-code 8 chips
 * (Alphabet → Needs) directly in the HTML, repeated by hand across
 * two rows and two copies each for the seamless loop — 32 <li>s of
 * duplicated markup. Those 8 were really just the first 8 entries of
 * the app's full 70-unit curriculum (see UNITS_V2 in js/missions.js),
 * and every one of those 70 units already has a matching icon in
 * js/icons.js. This file generates all 70, so the marquee previews
 * the whole course instead of a stale slice of it.
 *
 * The id/title pairs below are a small STATIC COPY, not a live import
 * of UNITS_V2 — js/missions.js is a large learning-engine file with
 * no business loading on the logged-out homepage. Keep this list in
 * sync with UNITS_V2 by hand if units are ever added, renamed, or
 * removed there.
 *
 * WHAT THIS DOES
 * Fills the two empty <ul class="topic-marquee__track"> containers in
 * index.html's TOPIC PREVIEW section, each with the full list TWICE
 * back-to-back — that's what makes the CSS's translateX(0 → -50%)
 * loop seamless (see auth.css's TOPIC MARQUEE comment). Row 1's first
 * copy is the only one left in the accessibility tree (role="list" /
 * role="listitem", no aria-hidden); every other copy — row 1's
 * duplicate, both of row 2's copies — is aria-hidden, so a screen
 * reader hears the 70 topic names once, not four times over.
 *
 * Icons are wired up via data-lw-icon="<unit id>" the same way the
 * old static markup did; js/icons.js's own DOMContentLoaded hydrate
 * pass (see icons.js) picks these up automatically as long as this
 * script — loaded `defer`, right after icons.js — runs and inserts
 * its chips before that pass fires, which `defer` guarantees.
 * ===================================================================== */
(function () {
  'use strict';

  /* Static copy of the 70 UNITS_V2 id/title pairs, in curriculum order. */
  var UNITS = [
    { id: 'alphabet', title: 'The Alphabet' },
    { id: 'fingerspell_name', title: 'Fingerspell Your Name' },
    { id: 'numbers', title: 'Numbers' },
    { id: 'greetings', title: 'Greetings' },
    { id: 'polite_words', title: 'Polite Words' },
    { id: 'people', title: 'People' },
    { id: 'feelings', title: 'Feelings' },
    { id: 'needs', title: 'Needs' },
    { id: 'actions', title: 'Actions' },
    { id: 'hand_actions', title: 'Hand Actions' },
    { id: 'communication', title: 'Communication' },
    { id: 'body', title: 'Body' },
    { id: 'personal_information', title: 'Personal Information' },
    { id: 'colors_unit', title: 'Colors' },
    { id: 'shapes', title: 'Shapes' },
    { id: 'size', title: 'Size' },
    { id: 'appearance', title: 'Appearance' },
    { id: 'touch', title: 'Touch' },
    { id: 'taste', title: 'Taste' },
    { id: 'sound', title: 'Sound' },
    { id: 'descriptions', title: 'Descriptions' },
    { id: 'family_unit', title: 'Family' },
    { id: 'home', title: 'Home' },
    { id: 'furniture', title: 'Furniture' },
    { id: 'household', title: 'Household' },
    { id: 'bathroom', title: 'Bathroom' },
    { id: 'kitchen', title: 'Kitchen' },
    { id: 'school', title: 'School' },
    { id: 'school_supplies', title: 'School Supplies' },
    { id: 'classroom', title: 'Classroom' },
    { id: 'classroom_actions', title: 'Classroom Actions' },
    { id: 'subjects', title: 'Subjects' },
    { id: 'fruits', title: 'Fruits' },
    { id: 'vegetables', title: 'Vegetables' },
    { id: 'snacks', title: 'Snacks' },
    { id: 'drinks', title: 'Drinks' },
    { id: 'animals_unit', title: 'Animals' },
    { id: 'wild_animals', title: 'Wild Animals' },
    { id: 'insects', title: 'Insects' },
    { id: 'clothes_unit', title: 'Clothes' },
    { id: 'dressing', title: 'Dressing' },
    { id: 'personal_items', title: 'Personal Items' },
    { id: 'nature', title: 'Nature' },
    { id: 'plants', title: 'Plants' },
    { id: 'weather', title: 'Weather' },
    { id: 'seasons', title: 'Seasons' },
    { id: 'places_unit', title: 'Places' },
    { id: 'vehicles', title: 'Vehicles' },
    { id: 'transportation', title: 'Transportation' },
    { id: 'professions', title: 'Professions' },
    { id: 'community', title: 'Community' },
    { id: 'time_unit', title: 'Time' },
    { id: 'daytime', title: 'Daytime' },
    { id: 'days', title: 'Days' },
    { id: 'months', title: 'Months' },
    { id: 'sequence', title: 'Sequence' },
    { id: 'frequency', title: 'Frequency' },
    { id: 'location', title: 'Location' },
    { id: 'distance', title: 'Distance' },
    { id: 'directions', title: 'Directions' },
    { id: 'social', title: 'Social' },
    { id: 'manners', title: 'Manners' },
    { id: 'turn_taking', title: 'Turn-Taking' },
    { id: 'responses', title: 'Responses' },
    { id: 'questions', title: 'Questions' },
    { id: 'conversation', title: 'Conversation' },
    { id: 'requests_unit', title: 'Requests' },
    { id: 'answers', title: 'Answers' },
    { id: 'basic_phrases', title: 'Basic Phrases' },
    { id: 'phrasebook', title: 'Phrasebook' }
  ];

  function buildChip(unit, accessible) {
    var li = document.createElement('li');
    if (accessible) li.setAttribute('role', 'listitem');

    var chip = document.createElement('div');
    chip.className = 'topic-chip';
    if (!accessible) chip.setAttribute('aria-hidden', 'true');

    var icon = document.createElement('span');
    icon.className = 'topic-chip__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.setAttribute('data-lw-icon', unit.id);

    var title = document.createElement('span');
    title.className = 'topic-chip__title';
    title.textContent = unit.title;

    chip.appendChild(icon);
    chip.appendChild(title);
    li.appendChild(chip);
    return li;
  }

  /* accessibleFirstCopy: whether this track's first of its two copies
   * should be the one left visible to assistive tech (only row 1 gets
   * this — row 2 is aria-hidden in full, both copies). */
  function populateTrack(track, accessibleFirstCopy) {
    if (!track) return;
    var frag = document.createDocumentFragment();
    for (var copy = 0; copy < 2; copy++) {
      var accessible = accessibleFirstCopy && copy === 0;
      for (var i = 0; i < UNITS.length; i++) {
        frag.appendChild(buildChip(UNITS[i], accessible));
      }
    }
    track.appendChild(frag);
  }

  function populateMarquee() {
    var rtlTrack = document.querySelector('.topic-marquee__row--rtl .topic-marquee__track');
    var ltrTrack = document.querySelector('.topic-marquee__row--ltr .topic-marquee__track');
    if (!rtlTrack || !ltrTrack) return;
    populateTrack(rtlTrack, true);
    populateTrack(ltrTrack, false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', populateMarquee);
  } else {
    populateMarquee();
  }
})();
