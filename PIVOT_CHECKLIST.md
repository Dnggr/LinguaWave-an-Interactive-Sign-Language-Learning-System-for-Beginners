# PIVOT_CHECKLIST.md — Curriculum pivot implementation tracker

> Tracks execution of `SYSTEM_ARCHITECTURE.md` → **Rev 7** (current —
> supersedes Rev 4/5/6, all archived in that file's own history). This
> file is the *what/done-or-not*; that section is the *why*. Check
> items off as they land. **`js/auth.js` is out of scope — teammate
> owns it.**
>
> Compressed 2026-08-22: completed phases collapsed to one line each
> (full reasoning previously here is now redundant with the finished
> code + `AI_MEMORY.md`'s changelog). Only genuinely open items keep
> their detail. Add new work below the `## Open / backlog` section —
> that's the room this compression freed up.

---

## Rev 7 — Omen's uploaded curriculum implemented (2026-08-24) — ✅ done

Implements `updated_fixed_lesson.txt` (Omen's upload — 68 numbered
topics, "already sorted," one ASL-basics topic per line) as the new
`UNITS`/`CATEGORIES` structure in `data.js`. Full 72-row Unit Map is in
`SYSTEM_ARCHITECTURE.md` → Rev 7; this section is the decision log.

- [x] **`UNITS` rewritten 11 → 72 entries**, order 0–71, one topic per
  unit, in the source file's exact order (topic N in the file = unit
  N+1 for topics 1–2, unit N+1 for topics 3–68 — see data.js's UNITS
  header comment for the precise offset table). `kind`/`gated`
  mechanics themselves are UNCHANGED from Rev 6.
- [x] **`CATEGORIES` rewritten** — 90 entries total (68 new-topic
  categories + `alphabet`/`numbers` + `sequence_demo` + 18-category
  Phrasebook + `health`/`amounts`/`money` restored, see below).
- [x] **Two Rev 6 mechanisms kept, not in the source list** (flagged,
  not confirmed by Omen yet):
  - `fingerspell_name` (gated assessment) stays at Unit 2, right after
    the Alphabet — real, working feature; the source list has no
    fingerspelling topic at all, dropping it would have been a
    regression, not an implementation of the new plan.
  - `sequence_demo` ("Basic Phrases," trained) and the 18-category
    intermediate Phrasebook stay, moved to the very end (Units 70/71)
    — the source list is pure vocabulary, no phrase-combination
    content, so there's nowhere in it for these to "belong"; end-
    of-sequence matches the adviser's own "combine what's already
    taught" framing (see Rev 4 §Why in SYSTEM_ARCHITECTURE.md).
- [x] **Every category id with real SIGNS/`dictionary.js` content kept
  its id, unchanged** — `alphabet`, `numbers`, `family`, `places`,
  `time`, `temperature`, `requests`, `essentials_greetings`,
  `essentials_basic_responses`, `essentials_polite_expressions`,
  `sequence_demo`, the 18 Phrasebook ids. Only `unit`/`title`/`words[]`
  changed on these. **`dictionary.js` was not opened this session** —
  zero risk to detection routing. Three got a title change to match
  the new plan's topic name while keeping the old id (`essentials_
  basic_responses` "Basic Responses"→"Questions"; `requests` "Everyday
  Essentials"→"Needs"; `temperature` "Temperature"→"Touch") — the
  `words[]` preview on all three (and on `family`/`places`/`time`/
  `essentials_greetings`/`essentials_polite_expressions`) now shows
  the new plan's fuller topic vocabulary, which is **broader than
  the real placeholder/trained SIGNS set** underneath — flagging this
  explicitly so a future session doesn't assume `words[].length` means
  that many signs are actually playable. Pre-existing pattern (see
  `requests`'s old words/SIGNS mismatch, already documented before
  this session) — just wider now across more categories.
- [x] **Bug caught: `health`/`amounts`/`money` were about to be
  silently dropped.** These 3 legacy categories are `comingSoon: true`
  with **real authored SIGNS entries** (title/description/tips/images
  — 5+4+3 signs respectively) even though they have zero
  `dictionary.js` entries (the AI_MEMORY.md §4 note about these was
  about `SIGN_DICTIONARY`, not about `data.js` SIGNS — easy to
  conflate, and this session initially did). The new plan has no
  matching topic for any of the three. Caught this via a scripted
  orphan-reference check (every `SIGNS[].category` cross-checked
  against the new `CATEGORIES` array) before finalizing, not by
  inspection — **worth running that same check again after any future
  CATEGORIES edit**, it's cheap and would have caught this silently
  otherwise. Restored, not dropped: `health` → Unit 42 (Dressing, 2nd
  category), `amounts` → Unit 16 (Size, 2nd category), `money` → Unit
  43 (Personal Items, 2nd category) — closest-fit placement, not exact
  matches. **`money` in particular has no good home in the new 68-topic
  list at all** — flagged for Omen, a better spot (or a 73rd unit of
  its own) may be wanted.
- [x] **Bug found & fixed: icon maps only covered the old Rev 6 ids.**
  `UNIT_ICONS` (`learn.js`/`lesson.js`/`dashboard.js`) and
  `CATEGORY_ICONS` (`learn.js`/`lesson.js`) keyed off the 11 old unit
  ids / ~34 old category ids. Every one of the 66 new units and ~52
  new categories would have silently rendered through the "generic
  bookmark" fallback — not a crash, but the whole new curriculum would
  have looked unfinished (blank/generic icons everywhere). Extended
  all 5 map copies with matching entries — cosmetic-only, additive,
  no other logic in any of these 3 files touched.
- [x] **Near-collision flagged, not merged:** the source file has two
  "Requests"-flavored topics — #7 "Needs" (mapped onto the pre-existing
  `requests` id/content) and the literal #67 "Requests" (new content,
  no dictionary.js entries). Kept as two separate categories
  (`requests` vs. new `making_requests`) rather than merged, matching
  the source file's own structure — same call already made once before
  for `essentials_polite_expressions` vs. the Phrasebook's
  `polite_expressions` (see the original "New blocker" note, now
  superseded but same reasoning).
- [ ] **Not done, flagged for Omen/adviser confirmation** (same spirit
  as the two unilateral Rev 4/6 decisions already logged in
  `AI_MEMORY.md` §0):
  - Keeping Fingerspell Your Name and Basic Phrases/Phrasebook at all,
    since the source list doesn't mention them.
  - `money`'s placement under Personal Items (no good fit exists).
  - Whether `numbers`'s `comingSoon: false` (despite 0% of digits
    being trained, per the existing Phase A finding) should finally
    flip to `true` to match reality — pre-existing inconsistency,
    untouched this session, just surfaced again here for visibility.
- [ ] **Not done — Phase 7's capture priority list still reflects the
  old unit order**, not the new one. Under Rev 7, Units 3–8/18/22/48/
  53/66 (Numbers, Greetings, Polite Words, Needs, Touch, Family,
  Places, Time, Questions) are the earliest-reached content a learner
  hits, and several already have `dictionary.js` scaffolding (disabled
  placeholders) — recapturing/reprioritizing Phase 7's list to match
  this new front-of-the-line order would unlock progress sooner than
  the old priority order. Not reordered here — a content/capture-
  planning call, not a data-structure one.
- Verified this session (Node-only, no browser): `node --check` on
  `data.js`/`learn.js`/`lesson.js`/`dashboard.js`; a sandboxed VM eval
  of the full `data.js` confirming `UNITS` order is contiguous 0–71 and
  unique, every `CATEGORIES[].unit` resolves to a real `UNITS[].order`,
  every `CATEGORIES` id is unique per level, and — the important one —
  **zero `SIGNS[].category` values point at a category that no longer
  exists** (this is what caught the health/amounts/money bug above).

---

## Rev 8 — Teaching-rhythm pass (2026-08-25) — ✅ done

> **2026-08-26 (personalization removal):** the "Light personalization"
> item below was removed wholesale this session — see
> `Rev8_Personalization_Feature_Checklist.md` and
> `REV8_TEACHING_AUDIT.md`'s updated "Current decision" for the full
> reasoning. Struck through, not deleted, so this section still
> accurately reflects what Rev 8 shipped and what happened to it.
> Everything else in this Rev 8 section (tighter recall cadence,
> picture-identification Quick Check format) is UNCHANGED and still
> live — personalization was the only Rev 8 item touched.

Implements the reference-app *teaching method* (PERSONALIZE → TEACH →
SEE A REAL SIGNER → RECALL → FEEDBACK → OPTIONAL PRACTICE → CONTINUE),
not its branding/UI/bot. Full reasoning: `SYSTEM_ARCHITECTURE.md` →
"Rev 8." Edit surface: `js/lesson.js`, `pages/lesson.html`,
`css/lesson.css` only — `js/data.js`/`js/learn.js`/`js/engine/progress.js`/
`js/auth.js` were read for context, not modified.

- [x] **Tighter recall cadence** — `QUICK_CHECK_CLUSTER_SIZE`: 3 → 1
  (`js/lesson.js`). Quick Check now fires after every sign instead of
  every 3rd. No other logic changed; the `totalSigns <= 1` skip guard
  and the "always show on the last sign" rule both still hold, just
  now trivially (every sign already is a checkpoint at cluster size 1).
- [x] **Recall variety — picture-identification format** —
  `buildQuickCheckQuestion()` extended to alternate (~50/50) between
  the original text-description prompt and a new picture prompt using
  each sign's existing `imageUrl`. Renders via a new `#quick-check-image`
  in `pages/lesson.html`, with an `onerror` fallback to avoid ever
  showing a broken image. **Not implemented this session** (flagged,
  not attempted): word→video matching, phrase completion,
  sign/word-pair matching — D's other bullets. Would extend the same
  function/card again rather than a new mechanism, if picked up later.
- [x] **Light personalization** — new `initPersonalization()` +
  `#personalize-card`/`#personalize-summary` (`pages/lesson.html`).
  Two questions (who you're learning ASL for; how much time per day),
  optional, shown once, collapsible/editable afterward. **Storage:
  `localStorage` only** (`lw_personalize_v1` + `lw_personalize_skipped_v1`)
  — confirmed NOT read by `isCategoryUnlocked()`, `getOrderedLiveCategories()`,
  or any `js/engine/progress.js` function; confirmed it changes no
  `js/data.js` UNITS/CATEGORIES ordering. Collected but not yet
  *applied* anywhere beyond its own summary line — flagged as an open
  follow-up below, not a bug.
- [x] **No new teaching engine, no duplicated quiz/progress/camera
  logic** — verified by inspection: this session added functions,
  never modified `startAssessment()`/`handleAssessmentFrame()`/
  `endAssessment()`/`recordSignPracticed()`/`isCategoryUnlocked()`/
  anything in `quiz.js`, `progress.js`, or the camera/MediaPipe
  pipeline (`cameraUtils.js`, `mediapipe.js`, `classifier.js`,
  `renderer.js`, `dictionary.js` — none of these files were opened for
  editing, only referenced by the pre-existing, untouched `import`
  statements at the top of `lesson.js`).

### Audit fixes — 2026-08-26 (see `REV8_TEACHING_AUDIT.md` for full reasoning)

> **Moot as of the 2026-08-26 personalization-removal session** — the
> feature these fixes patched no longer exists (see the struck-through
> item above). Left in place, unedited, as the historical record of
> what shipped and was fixed before removal — nothing below should be
> read as still-active behavior.

`REV8_TEACHING_AUDIT.md` flagged two concrete bugs in the personalization
feature above; both fixed this session, `js/lesson.js`/`pages/lesson.html`
only, nothing else in this section's scope re-touched:

- [x] **Cross-account leak/suppression, fixed.** `lw_personalize_v1`/
  `lw_personalize_skipped_v1` now store a `uid` and reconcile it against
  the logged-in learner, mirroring `js/engine/progress.js`'s own
  `cached.uid === user.uid` pattern (read for reference, not modified).
  A mismatch — including a pre-fix record with no `uid` field — is
  treated as "not answered," never auto-adopted. Tradeoff, deliberately
  accepted: pre-fix locally-saved prefs need re-answering once (same
  "reset accepted, no migration shim" precedent as Phase 3's
  `lw_progress_v2→v3` above).
- [x] **Permanent chrome / skip-link regression, fixed.** The collapsed
  summary no longer renders on every sign's page load — gated to once
  per browser session via a new `sessionStorage` flag
  (`lw_personalize_summary_shown_v1`), chosen over first-sign-of-category
  gating (rejected: real entry points — Continue Learning, review links,
  `?sign=` deep-links — don't reliably land on signIdx 0). Also
  retargeted the skip-link itself (`id="lesson-content"`/`tabindex="-1"`
  moved from `.lesson-layout` down onto `.lesson-header`) so it lands
  past personalization on *every* page load, not just the ones where the
  session-gate happens to suppress it — closes the gap the session-gate
  alone would have left on the one render-per-session.

**Verification, same rigor as the section above, extended:** `node
--check` clean; HTML tag-balance 0 errors; no duplicate ids; DOM-hook
cross-reference clean (same pre-existing `btn-personalize-edit`
exception); jsdom runtime harness against the real edited HTML/JS — 11
groups / 46 assertions, all passing (uid isolation both directions,
User A's own prefs still load post-fix, session-gating across 3
simulated sign navigations then reopening on a simulated new session,
Edit still reopens/pre-fills, 3 corrupt/legacy-localStorage shapes fail
safe, Quick Check/camera/nav hooks unaffected). Not browser-tested — same
flagged gap as every prior session.

### Verification this session

Differs from prior sessions' Node-syntax-only checks:
- `node --check` on the full edited `lesson.js` — clean.
- HTML tag-balance parse on the edited `lesson.html` (Python
  `html.parser`, matches every open/close tag) — clean, 0 errors.
- Brace-balance check on the edited `lesson.css` — 68/68 matched.
- **DOM hook cross-reference**: every `getElementById()` call in the
  edited `lesson.js` resolves to a real static id in `lesson.html`,
  except `btn-personalize-edit` — confirmed intentional, it's created
  dynamically via `innerHTML` inside `closePersonalizeCard()`, same
  pattern the pre-existing Quick Check option buttons already use.
  Zero duplicate ids introduced (one pre-existing false-positive
  checked: `classifier-warn` appears twice in the file, but the first
  occurrence is inside an HTML *comment*, not a second real element).
- **jsdom runtime harness (new for this session)** — actually executes
  the unmodified new/changed code (the exact DOM-refs-through-
  `initPersonalization()` slice of the real file, extracted verbatim,
  not retyped) against a real DOM built from the real `pages/lesson.html`,
  with `window.LWData` mocked (5 signs, all with `imageUrl`) and real
  `localStorage`. 14 test groups / 25 assertions, **all passing**:
  Quick Check shape/format-variety/option-rendering/click-feedback (7
  assertions), and the full personalization lifecycle — first-visit
  card display, Save-button enable/disable, persistence, no-re-nag on
  repeat "load," Edit pre-fill, Skip path, no-re-nag after skip (18
  assertions). This is real DOM/interaction coverage, closer to an
  integration test than a syntax check — but still not a real browser
  (no actual webcam; the camera/MediaPipe import chain was stubbed out
  since this pass's code never calls into it).
- **Not done**: real-browser check (keyboard tab order, screen reader,
  actual webcam alongside the new personalization card's layout,
  visual regression on the `.quick-check__image` sizing at narrow
  viewports). Same limitation flagged in every prior session's entry.

### What's still open

- D's other recall-variety formats (word/video matching, phrase
  completion, sign/word matching) — not attempted, see above.
- Personalization answers aren't used anywhere beyond their own
  summary line yet (no copy elsewhere adapts to the learner's stated
  audience/practice-time) — a reasonable next step, deliberately out
  of this session's edit surface.
- Real-browser verification, per above.

---

## Phases 1–6 — ✅ all app-code phases done

- [x] **Phase 0 — Planning** (2026-08-17). Adviser feedback → unit map;
  `AI_MEMORY.md` §0 + `SYSTEM_ARCHITECTURE.md` Rev 4 written.
- [x] **Phase 1 — `data.js` restructure** (2026-08-18). `UNITS` array,
  `unit` field on every category, Unit 0 static-text content,
  `sequence_demo` tagged unit 6, Unit 5 comingSoon split (4 trained
  sub-categories shown, 8 untrained hidden).
- [x] **Phase 2 — Fingerspell Your Name drill** (2026-08-18). Extension
  of `lesson.js`, reuses the existing phrase-chaining pipeline with a
  runtime-built letter sequence, zero new training data. Reachable from
  the trail nav as of Phase 4, and directly via
  `lesson.html?level=basic&category=fingerspell_name`.
- [x] **Phase 3 — `progress.js` unlock-chain flattening** (2026-08-18).
  `getOrderedLiveCategories()` walks `UNITS` in one flat cross-level
  chain; storage key bumped `lw_progress_v2`→`v3`, no migration shim
  (reset accepted, per Joshua). Unit 0/Unit 7/Unit 2 structurally
  excluded from gating (not `category-group` kind).
- [x] **Phase 4 — `learn.js`/`dashboard.js` trail-view UI** (2026-08-19).
  Three-tab switcher → single scrollable trail, locked/current/done
  nodes. **Reintroduced real per-category locking** — reverses an old
  Rev 3 "never lock" decision, flagged for a second look (see
  `AI_MEMORY.md` §0). Dashboard: one aggregate card + one row/unit.
- [x] **Phase 5 — signup-time level picker removed** (2026-08-19).
  `index.html`'s level `<select>` gone; `auth.js`'s `register()` no
  longer takes `level` (every account hardcodes `'basic'`).
- [x] **Phase 6 — `quiz.js`/`lesson.js` assessment changes** (2026-08-20).
  "Quick Check" recall MC every ~3 signs; Unit 6 camera round now does
  ordered sign-by-sign phrase detection, not just 4-option MC; both stay
  optional/non-gating. **Level Final Assessment CTA retired** (mechanism
  untouched, still reachable via `quiz.html?final=1`) — a real product
  call made by an AI session, flagged for confirmation.

## Phase 7 — Capture + retrain (content/ML, not app code) — the only open phase

> **Rev 7 note (2026-08-24):** the unit numbers below predate the Rev 7
> reorder — cross-reference against the "Rev 7" section above /
> `SYSTEM_ARCHITECTURE.md`'s new Unit Map for where each word's
> category now lives (ids are unchanged, only unit numbers moved — e.g.
> `requests` is now Unit 8 "Needs", `essentials_basic_responses` is now
> Unit 66 "Questions"). The word list itself and what's actually
> capture-blocked are otherwise unchanged by Rev 7 — this phase is
> still content/ML work, not touched this session. Reprioritizing this
> list to match the new front-of-the-line unit order is flagged as a
> next step in the "Rev 7" section above, not done here.

- [x] **Actions/Hand Actions/Communication (Units 9–11) content pass —
  2026-08-25 (Rev 8).** These 3 categories previously had `words[]`
  previews but were `comingSoon:true` with zero real `data.js` content
  (part of the "66/72 units have zero content" gap this section used
  to describe — now 63/72). All 41 words across the 3 categories now
  have full ASLU-checked SIGNS entries and matching `dictionary.js`
  `disabled:true` placeholders; all 3 flipped to `comingSoon:false`.
  Also closed the standing `people` (Unit 6) `I`/`HE`/`SHE` flag as
  part of the same pass (dropped from `words[]`, not given entries —
  see that category's comment). **Still capture/retrain-blocked, same
  as everything else below** — this was a content/lesson-copy pass
  only, no model work; none of these 41 signs (or the 6 relocated
  ones — `GO`/`COME`/`STOP`/`DRINK`/`SLEEP`/`CRY`) have a trained
  model class. See `AI_MEMORY.md`'s 2026-08-25 session log entry for
  the full relocation/dedup reasoning.
- [ ] Capture + retrain 16 Essential Words: `PLEASE`, `SORRY`, `YES`,
  `NO`, `HELP`, `GOOD`, `BAD`, `WHAT`, `WHERE`, `WHY`, `WATER`, `FOOD`,
  `GO`, `COME`, `BATHROOM` (was tracked as `RESTROOM` — see
  2026-08-23 merge note below), `HUNGRY`. Needs camera capture + Colab
  retrain — not doable in an AI chat session.
  **Correction (2026-08-23, audited for the reorder below): this list
  is NOT one bucket in `data.js`.** Traced each signId:
  `PLEASE`/`HELP`/`WHAT`/`WHERE`/`WHY` live in Unit 4 `requests`;
  `SORRY`/`GOOD`/`BAD` live in Unit 5 `feelings` (**comingSoon: true —
  hidden from the UI today**); `WATER`/`HUNGRY` live in Unit 5 `food`
  (also comingSoon); `GO`/`COME` live in Unit 5 `places` (**not**
  comingSoon — the Unit Map below calls "places" trained & working,
  which is only true for its other ~7 words). `YES`/`NO`/`RESTROOM`/
  `FOOD` (the word) have **no `data.js` SIGNS entry at all** — only the
  disabled `dictionary.js` placeholder, no lesson page to attach a
  retrained label to yet. Same story for `HELLO` (tracked below,
  outside this 16): zero `data.js` content.
  **Update (2026-08-23, implementing the reorder):** all 16 now live in
  `data.js`'s Everyday Essentials/Greetings/Basic Responses/Polite
  Expressions units (see "Unit reorder" section below for the exact new
  category per word) — `HELLO`/`YES`/`NO`/`FOOD` got real content
  written this session (previously zero), and `RESTROOM` turned out to
  already exist under the label `BATHROOM` (Unit 5 `health`) — merged
  rather than duplicated. **Still capture/retrain-blocked** — none of
  the 16 have a trained model class; only their `data.js`/`dictionary.js`
  bookkeeping changed, not their detection status.
  **Update (2026-08-25):** `GO`/`COME` relocated `data.js` category
  (`requests`→`actions`, Unit 9) as part of that session's content
  pass — still the same signIds, same capture-blocked status, just a
  different lesson now owns the content. See Phase 7's new Actions/
  Hand Actions/Communication item above.
- [ ] Capture + retrain 5 phrase placeholders: `NICE TO MEET YOU`,
  `HOW ARE YOU`, `WHERE IS`, `I AM LEARNING`, `WHAT IS YOUR NAME`.
- [ ] Capture + retrain `HELLO`/`THANK YOU` (Unit 4) and `HOT`/`COLD`
  (Unit 5 temperature) — currently `disabled: true` placeholders in
  `dictionary.js` so they fail cleanly instead of silently.
- [ ] **Capture + retrain all 10 digits — Numbers is 0%-trained, not
  mostly-done, on EITHER model.** `asl_static_model/labels.json` (25
  classes, all letters) and `asl_motion_model/labels.json` (33 classes,
  `J`/`Z`/words) both currently have zero digit classes. Routing is
  already decided and implemented (`dictionary.js`'s Numbers block
  comment, 2026-08-20 — **this was NOT actually an open decision**, see
  Phase A below): `0,1,2,3,4,5,7,8` default to `'static'` (plain held
  handshapes, no motion) → capture for `asl_static_model`; `6`/`9`/`10`
  are explicit `detectionType: 'motion'` (`6`/`9` are statically
  identical to `W`/`F`, only disambiguated by a small tap the static
  model can't see; `10` is a genuine twist, never a held pose) → capture
  for `asl_motion_model`. Two separate Colab batches to match the model
  split: 8 static handshapes, 3 motion clips.

---

## Dashboard UX pass — ✅ done (Priority 0–2, 2026-08-21/22)

All 15 items from the 2026-08-21 learner-perspective review are
implemented in `dashboard.html`/`dashboard.js`/`dashboard.css` only —
`auth.js`/`data.js`/`learn.js`/`progress.js` untouched throughout, per
scope. One-line summary of each:

- [x] Continue Learning hero card is now the primary element (was: 9%
  aggregate card dominant).
- [x] "Practice Progress" relabeled, explicit "not a mastery score."
- [x] Unit rows show real per-unit progress, "You are here" state.
- [x] Review entry point added, later upgraded to show 3 recent signs
  (not 1).
- [x] "Signs You've Learned" recap deduped (was showing each sign
  twice).
- [x] `Current Level: Basic` field replaced with `Current Unit`.
- [x] First-viewport layout compacted around the hero card.
- [x] Reduced duplication with `learn.js`'s trail / `lesson.js`'s
  sidebar — wording aligned, unit rows kept as a lighter-weight summary.
- [x] Stats tiles, clearer status vocabulary, accessibility labels,
  responsive breakpoints, error/loading states.

**Still open from this pass:**
- [ ] **First-viewport-without-scrolling** not separately confirmed
  (resize/narrow-width was confirmed good by Joshua in a real browser
  2026-08-22, but that's a different check than "fits above the fold
  on initial load").
- [ ] **Full real-browser verification of locked/current/done row
  states** — blocked on `DEBUG_UNLOCK_ALL` (currently `true`, so no row
  renders locked to check against). Joshua will flip it back himself
  once done testing; not an AI action item.
- [ ] `assets/images/basic/M.png` existence — can't check from a
  text-only export, needs a human filesystem check.
- [ ] Alphabet page "what to do next" instructional gap — needs a
  dedicated `learn.js`-scoped session (out of this pass's scope).

**Reference used by that review, still useful for scoping future
dashboard work:**
- Preferred files: `dashboard.html`, `dashboard.js`, `dashboard.css`.
- Excluded: `auth.js` (teammate), `data.js`/`learn.js`/`progress.js`
  (dashboard should only *consume* their existing exports —
  `getOrderedLiveCategories`, `getCategoryProgress`,
  `isCategoryUnlocked`, `getUnits`, `getCategorySigns`,
  `getAllLearnedSigns` — never add new unlock/ordering logic here).
- Target flow: `Dashboard → Continue Learning → Lesson/Course Player →
  Quick Check → Optional Camera Practice → Category Assessment → Next
  Unit`, and separately `Dashboard → Learning Path → Learn`, and later
  `Dashboard → Review → previously practiced signs`. Full wireframe
  sketch (now realized in code, semantic CSS states instead of literal
  ✓/→/○/🔒 glyphs — flagged as a deliberate, unconfirmed substitution)
  is in git history if needed again.

---

## Bugs observed — 2026-08-22 screenshot review (dashboard → learn → learn?category=numbers)

> Screenshot-based observations from a live local server (`127.0.0.1:5500`),
> same discipline as the earlier §16 review. **Confirmed against the
> actual code and fixed/resolved same day (2026-08-22, later session)** —
> see each item. `auth.js` not implicated in any of these.

- [x] **`learn.html` root trail has no visible locked/current/done
  state.** Root cause confirmed: `learn.js`'s `getUnitState()` marked
  *every* unlocked-and-incomplete category-group unit `'current'`
  independently, instead of picking the one unit that's actually next.
  Normally invisible (sequential unlocking usually leaves only one such
  unit at a time), but `DEBUG_UNLOCK_ALL` unlocks all of them at once, so
  all 8 rows got the identical accent-border/shadow treatment — which
  reads as "nothing is highlighted" rather than "everything is." This is
  also why it disagreed with the dashboard's own mini preview: that page
  already stops at the first unlocked-but-unpassed category
  (`getCurrentDestination()`); `learn.js` didn't have an equivalent
  single-current rule until now. **Fix:** added `findCurrentUnitId()` to
  `learn.js`, mirroring `dashboard.js`'s walk-and-stop-at-first pattern;
  only that one unit gets `status: 'current'` now, every other
  unlocked-incomplete unit renders neutral (`'available'`, no special
  border). Independent of `DEBUG_UNLOCK_ALL` — true either way, but the
  visual difference will be much less obvious until the flag is flipped
  back (only then does the trail normally have just one unlocked+
  incomplete unit to show as current in the first place). `js/learn.js`.
- [x] **"← Back to Trail" wording.** Confirmed literal — all 6 occurrences
  (5 in `learn.js`, 1 static fallback in `learn.html`) said "Trail".
  Changed to "← Back to Learning Path" everywhere, matching the page's
  own H1 and the dashboard's "LEARNING PATH" heading. `js/learn.js`,
  `pages/learn.html`.
- [x] **Dashboard "Continue" doesn't account for "fully practiced, not
  yet assessed."** Confirmed: `getCurrentDestination()`'s `nextSign`
  falls back to `signs[0]` once every sign is practiced (nothing left
  unpracticed to find), and nothing downstream branched on that case —
  so Continue kept pointing at "Alphabet → Letter A" at 26/26. **Fix:**
  added a `readyForAssessment` flag to `getCurrentDestination()`'s
  return value (`practicedCount === signs.length`); `renderContinueCard()`
  now shows a distinct "📝 Take Assessment" state instead of falling
  into the sign-practice branch, `renderContinueButton()` routes its
  href to `quiz.html?level=X&category=Y` instead of `lesson.html?...&
  sign=...`, and the matching unit-row "Next: …" detail (same bug, same
  fallback, second surface) got the same branch so the hero card and the
  unit row can't disagree with each other. `js/dashboard.js`.
- [x] **Undocumented "Open Unit 1 Path" button.** Confirmed real and
  working as designed (`[data-continue-secondary]`, added in the
  Priority 2 §13 session) — not a functional bug. Added to
  `SYSTEM_ARCHITECTURE.md`'s dashboard description so it doesn't get
  flagged as drift again.

**Not re-verified in a real browser this session** (text-only repo
export, same limitation as every prior AI session) — the fixes above are
confirmed against the actual code paths, but Joshua should still eyeball
`learn.html`'s trail and the dashboard hero card once, ideally after
flipping `DEBUG_UNLOCK_ALL` back to `false` per `AI_MEMORY.md` §0, since
that's also when the trail's single-current-unit fix becomes visually
meaningful (today, with the flag on, there's usually nothing else
unlocked+incomplete to contrast the one 'current' unit against).

---

## Unit reorder — Omen's request (2026-08-22) — ✅ mapping + Fingerspell-as-assessment implemented 2026-08-23

Differs from the live Unit Map in `SYSTEM_ARCHITECTURE.md` → **Rev 6**
(supersedes the Rev 4 table). Goal stated by Omen: restructure for
better data collection for the detection engine.

**Target order (original request):**
1. ASL History — new content. Current Unit 0 ("Welcome to ASL") is
   generic background + how-camera-practice-works, not history
   specifically — needs new copy, not just a rename. **✅ Done
   2026-08-23 (later, eighth session).** Added a `brief_history` section
   to `UNIT0_CONTENT` (data.js) — Gallaudet/Clerc/Cogswell, American
   School for the Deaf (1817, Hartford CT), Martha's Vineyard Sign
   Language's contribution — fact-checked against ASLU/lifeprint.com per
   `AI_MEMORY.md` §1. Retitled the unit `'Welcome to ASL'` → `'Welcome
   to ASL: A Brief History'`. Kept short, still links out to
   `intro-to-asl.html`'s own fuller history section rather than
   duplicating it — see "Open / backlog" below, that overlap decision
   is still open. See `AI_MEMORY.md` Session Log for the full note.
2. Letters (= current Unit 1, unchanged) ✅
3. Fingerspell — **as an assessment.** ✅ **Confirmed 2026-08-23
   ("Yes, make it graded") and implemented same day** — see
   `SYSTEM_ARCHITECTURE.md` Rev 6 for the `gated`/`unitAssessments`
   mechanism. Pass condition is lenient (completing the drill once = 
   pass, matching its existing forgiving retry behavior) — flagged as a
   simplification, not re-confirmed separately.
4. Numbers (= current Unit 3, unchanged) ✅ — now also gated behind #3.
5. Everyday Essentials ✅ — narrowed, see mapping below.
6. Greetings and Introduction ✅ — new unit + category.
7. Basic Responses ✅ — new unit + category.
8. Polite Expressions ✅ — new unit + category.
9. Days of the Week — current `time` category (`DAY`/`WEEK`/`MONTH`/
   `YEAR`/`TODAY`) is generic time vocabulary, **not** the 7 weekday
   names (Monday–Sunday). **Not done** — no new content/training data
   was available to build this from; `time` was left alone (still Unit
   8 today, unrenamed).
10. Everything else already in the app — just categorize, no reshuffle
    urgency. ✅ (bumped to units 8/9/10, content unchanged).

**Mapping — confirmed 2026-08-23, then implemented same session:**

| Category (unit) | SignIds | Content status |
|---|---|---|
| Greetings and Introduction (5) | `HELLO` | New `data.js` entry written this session (had zero content before). |
| Basic Responses (6) | `YES`, `NO`, `GOOD`, `BAD`, `WHO`, `WHAT`, `WHERE`, `WHEN`, `WHY`, `HOW` | `YES`/`NO` are new entries; the rest moved in with existing content unchanged. |
| Polite Expressions (7) | `PLEASE`, `THANK YOU`, `EXCUSE`, `SORRY` | All moved in with existing content unchanged. |
| Everyday Essentials (4, narrowed) | `HELP`, `STOP`, `WATER`, `FOOD`, `HUNGRY`, `BATHROOM`, `GO`, `COME` | `FOOD` is a new entry. `BATHROOM` — see merge note below, **not** a new `RESTROOM` entry. |

**Resolved this session — the "RESTROOM" list item was a duplicate,
not a gap.** Traced it against `data.js` before writing new content:
`RESTROOM` (dictionary.js-only, from the original 16-word list) and the
pre-existing `BATHROOM` entry (Unit 5 `health`, still comingSoon,
description: T-hand shake, note already said "also commonly used for
restroom/toilet") are the same physical sign, tracked under two
different labels in two different files that never referenced each
other. Merged: moved `BATHROOM` into Everyday Essentials, renamed
`dictionary.js`'s `RESTROOM` key to `BATHROOM` to match, wrote no new
"RESTROOM" content. Worth a scan for other Phase-7-list-vs-existing-
content collisions like this one if more essential words get added
later — this one wasn't caught by either the original request or last
session's audit.

**Naming collision — resolved.** `data.js`'s `CATEGORIES` already had
Unit-7-Phrasebook (now Unit 10) categories with ids `basic_responses`
and `polite_expressions`. The 2 new basic-level categories use
`essentials_basic_responses`/`essentials_polite_expressions` instead —
no collision, both sets of ids now coexist.

**Not done / open follow-ups:**
- Days-of-the-Week (item 9) content — still needs a dedicated
  content-writing session (no source data for the 7 weekday names yet).
  ASL History (Unit 0) — the other item that used to be listed here —
  is done, see item 1 above.
- `learn.js`'s Fingerspell unit card label updated to reflect gated
  state (was hardcoded "always open" regardless) — **not verified in a
  real browser**, same limitation as every prior session. Worth an
  eyeball once `DEBUG_UNLOCK_ALL` is back to `false`.
- Fingerspell's lenient pass condition (see #3 above) — flag for a
  second look if a stricter assessment mode is wanted later.

---

## Bugs found this session — 2026-08-23 (auditing Phase 7 for the reorder)

- [x] **`dictionary.js` missing 5 disabled placeholders.** Unit 4's
  `requests` category has 11 signIds; only 6 (`PLEASE`/`THANK YOU`/
  `HELP`/`WHERE`/`WHY`/`WHAT`) had a `disabled: true` entry — `EXCUSE`/
  `WHO`/`WHEN`/`HOW`/`STOP` had no entry at all. Functionally near-
  identical today (neither model has any of these 11 labels), but
  `getAllowedLabelsForSign()` returns unrestricted matching (`null`) for
  a missing entry vs. a real Set for a disabled one, and it reads as an
  oversight rather than a decision. **Fixed** — added the 5 missing
  placeholders, same pattern as the existing 6. `js/engine/dictionary.js`.
- [x] **Stale comment in `data.js` claiming `COME`/`GO` are "already
  separately captured/trained."** False — confirmed against
  `asl_motion_model/labels.json` (neither label exists) and
  `dictionary.js` (`disabled: true` on both). They're on the Phase 7
  list like the other Essential Words. **Fixed** — comment corrected so
  a future session doesn't skip them assuming Unit 5's `places` category
  is fully live. `js/data.js` (comment only, no logic change).
- [ ] **`SYSTEM_ARCHITECTURE.md`'s Unit Map row for Unit 5 says
  "family/places/time trained & working" without qualification** — true
  for ~7 of `places`' words, not for `COME`/`GO`. Corrected in that file
  this session (see its own note).

---

## Design pass — quiz.html / quiz.css — 2026-08-23 (later, seventh session) — ✅ implemented

Extends the item below to `quiz.html`/`quiz.css`, closing the one gap
its own "still wasn't in scope" note left open. Same 4 patterns,
scoped to what quiz.html actually has:

- [x] **Skip link** — added, jumps to `#question-card` (the page's one
  real interactive area; nothing in `.quiz-header`/`.progress-bar`
  above it is a tab stop, so this is a plain navbar-only skip, same as
  dashboard.html/learn.html — no course-sidebar-sized tab-order problem
  here to justify skipping further). `#question-card` got
  `tabindex="-1"` to receive the jump.
- [x] **`:focus-visible` ring** — added to `.quiz-option` (the MC/
  Identification answer buttons) in `quiz.css`. Nothing else on this
  page needed one: every other clickable element is a shared `.btn`,
  which none of the other design-pass pages touched either — kept
  consistent with that scope line instead of expanding it.
- [x] **Loading-state shimmer** — `#q-prompt`'s existing static
  "Loading…" text now carries `.loading-pulse`. `js/quiz.js` already
  overwrites it on first render, so no extra cleanup code was needed —
  same free-parity fix as the other two pages.
- [x] **Error/fallback state** — new `js/quiz.js` function
  `showQuizUnavailable()`, wired into `boot()`: a `!window.LWData`
  guard (previously absent — a missing LWData silently fell into
  `showEmptyState()`'s "no trained content" message, which means
  something different and real — see `AI_MEMORY.md` §4) plus a
  belt-and-suspenders `try/catch` around the rest of `boot()`, same
  shape as `js/learn.js`'s own. Renders a real `.alert--error` fallback
  (`.quiz-fallback-alert`, new in `quiz.css`) inside `#question-card`
  instead of leaving a stuck "Loading…" card.

**Scope note, same spirit as `js/learn.js`'s/`js/lesson.js`'s "narrower
on purpose":** only `window.LWData` and an unexpected `boot()` throw
are guarded. `window.LWProgress` calls reached from the boot path
(`PASS_THRESHOLD`, `liveCategoriesFor()`) already use `?.`. **Not
guarded, flagged not fixed:** `buildActionButtons()`'s two
`window.LWProgress.LEVEL_ORDER`/`.getOrderedLiveCategories()` calls
(no `?.`) — but those only run after a completed, passed assessment,
well outside this design pass's boot-time scope.

**Bug found and fixed along the way (not part of the design pass
itself):** `js/quiz.js`'s DOMContentLoaded bootstrap was
`document.addEventListener('DOMContentLoaded', boot); if
(document.readyState !== 'loading') boot();` — unlike `js/lesson.js`'s
already-fixed "BUG 3" version of this exact idiom, this calls `boot()`
**twice** in the normal case (a `type="module"` script typically runs
at `readyState === 'interactive'`, so the immediate check fires AND
the listener fires again moments later). Silently rebuilt both rounds
and re-rendered the first question a second time — harmless-looking in
practice, but a real double-execution, and would have double-fired
`showQuizUnavailable()`'s `console.error` on a genuine load failure.
Switched to `js/lesson.js`'s mutually-exclusive `if (readyState ===
'loading') { addEventListener(...) } else { boot() }` form.

**Excluded from this session, per request:** `js/auth.js` — untouched,
teammate's per scope (same as every session).

**Verified Node-only this session** (`node --check js/quiz.js`, a
brace-balance pass on `quiz.css`/`style.css`, a Python HTML-parse pass
on `quiz.html`) — all clean. **Not yet verified in a real browser**
(keyboard tab order into `#question-card`, screen reader, and actually
triggering `showQuizUnavailable()` by simulating a `data.js` load
failure) — same limitation as every prior design-pass session.

---

## Design pass — learn.html / lesson.html sidebar not yet matching dashboard — 2026-08-23 (✅ implemented, this session — see follow-up note below)

Omen's observation, confirmed by code read: `learn.css`/`lesson.css` share the
same design tokens as `dashboard.css` (no color/font drift), so this isn't a
token problem — it's that the 2026-08-21/22 Dashboard UX pass (Priority 0–2)
shipped several polish items to `dashboard.html`/`.css` only, and they were
never extended to `learn.html`, the "back to trail"/`#learn-back-link`
flow, the category views inside `learn.js`, or `lesson.html`'s course
sidebar. Concretely, dashboard had and the other three didn't:

- [x] **Skip link** (`.skip-link`) — accessibility, keyboard users on
  learn/lesson previously tabbed through the whole navbar first. Added to
  `learn.html` (jumps to `#lesson-grid`) and `lesson.html` (jumps to
  `#lesson-content`, i.e. skips the ENTIRE course-outline sidebar — a
  bigger tab-order cost than dashboard's navbar, since the sidebar can be
  dozens of links deep). Both target elements got `tabindex="-1"` so a
  plain `<div>` can actually receive focus on jump.
- [x] **`:focus-visible` states** on interactive cards — added to
  `learn.css` (`.lesson-card`, `.trail-node`) and `lesson.css`
  (`.course-sidebar__unit--flat`, `.course-sidebar__unit-head`,
  `.course-sidebar__cat-head`, `.course-sidebar__sign`). Same
  outline:none + box-shadow-ring substitution dashboard.css uses, minus
  the `inset` (neither page clips overflow the way dashboard's
  `.unit-progress-list` does).
- [x] **Loading-state shimmer** — `#lesson-grid` (learn.html) and
  `#course-sidebar` (lesson.html) now start with a static
  "Loading…" placeholder using `.loading-pulse`, naturally overwritten
  the first time `js/learn.js`/`js/lesson.js` render (both already do a
  full `innerHTML =` replace, so no extra cleanup code was needed).
- [x] **Error/fallback state** — `js/learn.js` (`showLearnUnavailable()`)
  and `js/lesson.js` (`showSidebarUnavailable()`, inside
  `renderCourseSidebar()`) now show a real `.alert--error` fallback
  (with a working link back to Dashboard/Learn) instead of leaving a
  blank or stuck-loading grid/sidebar if `window.LWData` never loads or
  a render call throws. **Narrower than dashboard's version on
  purpose:** only `window.LWData` is treated as a hard requirement —
  every `window.LWProgress` call in both files already goes through
  `?.` + `?? default`, so a missing/slow `LWProgress` degrades
  gracefully (unlocked-state defaults) rather than needing its own
  fallback path, unlike dashboard.js which required both.

`quiz.html`/`quiz.css` had the identical gap (checked while auditing this)
but wasn't named in the request at the time — **done in a later session,
same day, see the "Design pass — quiz.html / quiz.css" entry above this
one.**

**Implementation note vs. the prior session's suggested approach:** the
`.skip-link`/loading-pulse rules were made "generic and reusable" by
*adding* page-agnostic copies to `css/style.css` (new §16 —
`.skip-link`, `.loading-pulse`) rather than by moving/renaming
`dashboard.css`'s existing `.skip-link`/`.dash-loading-pulse` — moving
them would've meant editing an already-shipped, working page for a
rename with zero visual benefit to it. `dashboard.css` still has its own
identical copies untouched (harmless duplication — `dashboard.css` loads
after `style.css` on `dashboard.html`, so its rule still wins there at
equal specificity); new pages should reach for the `css/style.css`
versions going forward. `SYSTEM_ARCHITECTURE.md`'s "Dashboard design
principles" section has the fuller writeup.

**Not verified in a real browser this session** (Node-only: `node --check`
on both touched `.js` files, brace-balance check on all 3 touched `.css`
files, a Python HTML parse pass on both touched `.html` files — all
clean). Worth a real-browser keyboard-tab-order + screen-reader pass
before calling this fully done.

---

## Bugs found this session — 2026-08-23 (later, code-read audit — no fixes applied)

> Full-repo read, not just a screenshot review. Organized into short,
> independent phases so a future chat only needs to paste the ONE phase
> being worked, not this whole file — each phase stands alone. `auth.js`
> internals not audited beyond what's needed to explain a progress.js/
> dashboard.js-visible symptom, per scope (teammate owns it). None of the
> below fixed — analysis only, this was an explicit request this session.

### Phase A — Model/label alignment (read this before any camera capture)

- [ ] **CRITICAL (still open — needs a human + camera + Colab) — Numbers
  `0,1,2,3,4,5,7,8` (7 of 10 digits) cannot be detected at all today, not
  just "not yet captured."** Confirmed by reading the actual model
  files, not just the docs: `asl_static_model/labels.json` has 25 classes
  and every one is a letter (`A`–`Y` minus `J`/`Z`, +`NONE`) — zero digit
  classes exist. `classifier.js`'s `classifyGesture()` returns `rawLabel`
  straight from that file, and `lesson.js`'s practice/assessment handlers
  do a direct `result.label !== expectedStep` string compare against the
  digit signId (e.g. `'0'`). A digit signId can never equal a letter
  string, so this fails 100% of the time — not probabilistically,
  structurally. This directly contradicted `AI_MEMORY.md` §0 /
  `SYSTEM_ARCHITECTURE.md`'s own Unit Map, which said Unit 3's "static
  0–9 trained" — **that row was already corrected 2026-08-23** (Unit Map
  now correctly says 0 trained, all 10 digits are Phase 7 work).
  **Not a wrong-guess bug, just a dead one** — traced
  `getAllowedLabelsForSign()` + `classifyGesture()`'s candidate
  restriction (this session, no code changed): a digit's `allowedLabels`
  set never intersects the static model's letters-only output classes,
  so `candidateIdxs` is always empty and the result is a clean
  `{label:null, matched:false}`, same as a `disabled:true` entry — not a
  confusing wrong-letter readout. Learner-facing symptom is "camera never
  detects it," not "detects the wrong sign." Same logic applies to
  `6`/`9`/`10` against the (also digit-less) motion model.
  ✅ **RESOLVED this session — the "decide static vs. motion" framing
  below was wrong, there was nothing to decide:** `dictionary.js`'s own
  Numbers block comment (written 2026-08-20, Phase 7 — this audit just
  hadn't cross-checked it) already settled and implemented the split:
  `0,1,2,3,4,5,7,8` default to `'static'` (plain held handshapes) →
  `asl_static_model`; `6`/`9`/`10` are explicit
  `detectionType: 'motion'` → `asl_motion_model`. Nothing to decide, only
  needed reconciling across docs — done this session, see the merged
  Phase 7 digit item above and the (already-corrected) Unit Map row.
  ~~Worth deciding before a capture session: do 0–5/7/8 get folded into
  the `asl_static_model` retrain (new digit classes there) or moved to
  `asl_motion_model` alongside 6/9/10 for consistency?~~ — moot, see
  above. **Only thing still actually open here is the camera capture
  itself**, tracked in Phase 7.

### Phase B — Auth/session hygiene (cross-file; coordinate with teammate before touching `auth.js` itself)

- [ ] **Confirmed reachable — `logout()` leaves stale progress in
  `localStorage` on 2 pages.** `js/auth.js`'s `logout()` does
  `localStorage.removeItem(window.LWProgress?.STORE_KEY)`. `feedback.html`
  and `intro-to-asl.html` both render a working "Log out" link
  (`[data-logout]`, wired by `main.js`) but neither loads `progress.js` —
  so `window.LWProgress` is `undefined` there, the optional chain resolves
  to `undefined`, and `removeItem(undefined)` clears a key literally named
  `"undefined"` instead of `lw_progress_v3`. On a shared/public computer,
  logging out from either of those two pages leaves the previous learner's
  progress in place for whoever logs in next. Fix is one line
  (`localStorage.removeItem('lw_progress_v3')`, hardcoded, not derived
  from a maybe-missing global) but it's inside `auth.js` — flagging for
  the teammate rather than touching it.
- [ ] **Pointer, not new — already visible from `dashboard.js`'s own
  comments (Priority 2 §15):** `js/auth.js`'s `onAuthStateChanged`
  callback awaits `getDoc(userRef)` with no `try/catch`. If that call
  rejects (offline, ad-blocker on `gstatic.com`, Firestore rule error),
  the callback throws before reaching `authReady = true` /
  `dispatchEvent('lwauth-ready')` — so `whenAuthReady()` **and**
  `requireAuth()` never resolve on ANY guarded page, not just the
  progress-hydration hang dashboard.js already found and worked around
  locally. `dashboard.js`'s fix is a dashboard-only timeout net around
  `whenProgressReady()`; it does not (and can't, from outside `auth.js`)
  fix `requireAuth()` itself, which has no timeout anywhere. Confirmed by
  reading `auth.js`'s `requireAuth()`/`whenAuthReady()` directly — both
  wait on the `'lwauth-ready'` event with no fallback path. Root fix is a
  `try/catch/finally` around the `getDoc` call in `auth.js`, teammate's
  call on timing/priority.

### Phase C — Page lifecycle & camera hygiene — ✅ done 2026-08-23 (later, sixth session)

- [x] `js/quiz.js` had no `visibilitychange` handler — added one, mirrors
  `js/lesson.js`'s existing `document.hidden` → `stopCamera()` pattern
  exactly. `stopCamera()` is a safe no-op when no stream is active, so no
  extra "is the camera round running" check was needed. `js/quiz.js`.
- [x] `js/camera/cameraUtils.js`'s `startCamera()` assumed `canvasElement`
  (and `videoElement`) were always passed and non-null — added an early
  guard that fails the same way every other startup problem here does
  (`showCameraError()` + a caught `throw`) instead of a raw TypeError
  from deep inside the `onReady()`/resolve path. Still latent today
  (every real call site passes both elements) — this just makes the
  assumption explicit and safe. `js/camera/cameraUtils.js`.
- [x] `js/engine/classifier.js`'s `classifyGesture()`/`runMotionInference()`
  (the shared path behind `classifyMotion()`/`finalizeMotionWindow()`)
  each allocated `input = tf.tensor2d/tensor3d(...)` OUTSIDE `tf.tidy()`
  and disposed it with a plain call placed after the tidy block — skipped,
  leaking the tensor in WebGL memory, if `predict()`/`.dataSync()` ever
  threw inside the callback. Wrapped both in `try { tf.tidy(...) } finally
  { input.dispose(); }` so disposal happens on the thrown path too, no
  behavior change on the normal path. `js/engine/classifier.js`.

Verified Node-only this session (`node --check` on all 3 touched files) —
**not yet verified in a real browser** (visibility-toggle + WebGL memory
trace), same limitation as every prior session. `auth.js`/Phase B
untouched, left for the teammate per scope, per this session's explicit
request.

### Phase D — Reconciling `CLAUDE_TASKS.md` (a second, un-merged audit already sitting in the repo)

`CLAUDE_TASKS.md` (repo root) is a separate 16-item QA audit, not
referenced by any entry in this file's Session Log or `AI_MEMORY.md` —
looks like output from a different AI/tool session that was never folded
in. Re-checked its claims against the actual current code this session so
a future session doesn't re-verify or re-fix things that are already
done:

- **Already fixed, claim is stale:** progress.js/auth.js hydration
  destructure crash → dashboard.js already has a documented workaround
  (see Phase B above for the part that's still genuinely open); quiz.js
  legacy `isLevelFinalUnlocked`/level-partition routing in
  `buildActionButtons()` → already rewritten to walk
  `getOrderedLiveCategories()` (see the `REV 4 PHASE 6` block comment in
  `quiz.js`); `dictionary.js` missing `EXCUSE`/`WHO`/`WHEN`/`HOW`/`STOP`
  placeholders → all 5 present (added in the 08-23 session, see this
  file's own entry above); dashboard's "Current Level: Basic" → already
  renamed to "Current Unit" (Priority 1 §8).
- **Checked, not actually a bug:** `pages/intro-to-asl.html`'s
  `learn.html?level=basic` link — `learn.js`'s `boot()` still explicitly
  reads a legacy `?level=` param and scrolls to the right unit
  (`scrollToLevel()`), documented as deliberate backward-compat in
  `pages/learn.html`'s own header comment. Works today; just an older URL
  shape, not broken.
- **Still open, not yet verified against current code this session (low
  priority, no evidence either way):** lesson.js phrase-step cooldown
  timer overlap (partially mitigated already — `startPhraseStep()` now
  clears `motionCountdownTimer` and force-sets `cooldown = true` at its
  top — but `enterCooldown()`'s own internal timer isn't itself
  cancelable, so a narrow one-tick race may still exist between two
  back-to-back `setTimeout` firings; much smaller window than originally
  described, not confirmed either way with a real timer trace);
  `handleAssessmentFrame()`'s debounce-frame `lastDetected` tracking for
  static signs; quiz.js camera-round countdown/buffering UI; button text
  mismatch (`'🎥 Start Assessment'` vs spec's "optional" wording).
- **Confirmed still open, already tracked elsewhere — not new:**
  `js/feedback.js` (`AI_MEMORY.md` §4's existing TODO — no Firestore
  write, no `?level=` read, no validation).
- **Not re-checked this session:** the file's "Optimization & Edge Cases"
  section (TF.js memory beyond what Phase C above independently found,
  MediaPipe background-tab throttling, canvas retina scaling, offline/PWA
  caching) — plausible, not verified against current code either way.

**Suggested next step, not done here:** either delete `CLAUDE_TASKS.md` (its
still-valid items are now folded into Phases A–C above) or add one line at
its top pointing here, so it stops being a second, contradictory source of
truth. Left as-is this session — deleting another file felt outside "just
find bugs."

---

## Open / backlog (suggested, not adviser-required — low priority)

- [ ] Review/Trainer mode — spaced-repetition-style camera drill over
  already-passed signs.
- [ ] Optional placement/skip test for learners who already know some
  ASL.
- [ ] Sign-variation callouts (e.g. "HOW" has two accepted forms).
- [ ] `pages/intro-to-asl.html` vs. Unit 0's `UNIT0_CONTENT` overlap —
  needs a decision (merge, or keep both cross-linked as-is). Slightly
  more overlap now that Unit 0 has its own `brief_history` section
  (2026-08-23) — still not resolved, decision deliberately left to
  Joshua/Omen rather than made unilaterally here.
- [ ] Later dashboard stat tiles: current streak, review due, best
  assessment score.
- [x] **Content queue continuation (2026-08-25):** after Actions/Hand
  Actions/Communication (Units 9–11, done that session), the next
  `comingSoon:true` category in unit order was `body` (Unit 12) — done
  2026-08-26 (16 SIGNS entries, ASLU-checked; see the 2026-08-26 session
  log entry in `AI_MEMORY.md`). `personal_information` (Unit 13) also
  done 2026-08-26 (later session) — 6 new SIGNS entries (the other 9
  words[] reuse existing family/people/places coverage instead of
  duplicating it; see that session's `AI_MEMORY.md` log entry). Next
  up: `colors` (Unit 14) — not started. `classroom_actions` (Unit 31)
  is also flagged as needing a pass despite already being
  `comingSoon:false` — see the 2026-08-25 session log entry in
  `AI_MEMORY.md` for why (zero real signs despite being live, `words[]`
  overlaps this session's new Actions/Communication content).

*(Add new session's tasks here.)*