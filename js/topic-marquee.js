(function () {
  'use strict';

  var UNITS = [
    { id: 'alphabet', title: 'The Alphabet' },
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
    { id: 'answers', title: 'Answers' }
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
