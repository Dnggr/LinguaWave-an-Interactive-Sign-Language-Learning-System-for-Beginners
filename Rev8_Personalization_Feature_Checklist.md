# Rev 8 Personalization Feature Checklist

> Scope: Rev 8 learner-context personalization.
> This checklist covers the current personalization feature and its
> planned follow-up. It does NOT change curriculum ordering, unlocks,
> progress architecture, or assessment architecture.

---

## Phase 1 — Audit ✅

- [x] Audit current `#personalize-card` implementation.
- [x] Trace `initPersonalization()` in `js/lesson.js`.
- [x] Confirm personalization is currently owned by `lesson.html` / `lesson.js`.
- [x] Confirm preferences are stored in `localStorage`.
- [x] Confirm personalization does not touch `LWProgress`.
- [x] Confirm personalization does not affect curriculum ordering.
- [x] Confirm personalization does not affect unlock logic.
- [x] Confirm personalization does not affect graded assessment.
- [x] Confirm Quick Check remains a separate formative interaction.
- [x] Compare Dashboard / Learn / Lesson / Quiz responsibility boundaries.
- [x] Determine that Dashboard is the better eventual owner.
- [x] Decide NOT to move personalization to Dashboard yet.
- [x] Create `REV8_TEACHING_AUDIT.md`.
- [x] Create `Rev8_Personalization_Feature_Checklist.md`.


---

## Phase 2 — Immediate Bug Fixes ✅ done 2026-08-26

### 2.1 UID-scope personalization storage

- [x] Inspect `js/engine/progress.js`'s existing UID-scoping pattern.
      (Read via `REV8_TEACHING_AUDIT.md`/`SYSTEM_ARCHITECTURE.md`'s
      description — `progress.js` itself untouched, per scope —
      `cached.uid === user.uid` reconciled in `hydrateStore()`.)
- [x] Apply the same pattern to `lw_personalize_v1`.
- [x] Apply the same pattern to `lw_personalize_skipped_v1`.
- [x] Ensure User A's preferences cannot be reused by User B on the
      same browser/device. (jsdom harness, Group 4.)
- [x] Ensure malformed/corrupt localStorage still fails safely. (jsdom
      harness, Group 10 — malformed JSON, pre-fix no-uid record,
      pre-fix plain-string skip flag, all 3 fail safe.)
- [x] Ensure existing saved preferences continue loading correctly
      after the change. (jsdom harness, Group 5 — confirmed for the
      SAME uid across a simulated new session. Caveat: a record saved
      before this fix shipped, with no `uid` field, is treated as
      unanswered rather than auto-adopted — see `REV8_TEACHING_AUDIT.md`
      §11 for the reasoning. That's a deliberate one-time re-ask, not a
      loading bug.)
- [x] Ensure logout/login does not accidentally carry another user's
      personalization state. (jsdom harness, Groups 4 and 9 — different
      mocked `uid`s simulate different logged-in accounts on the same
      browser.)

### 2.2 Stop repeated personalization summary

- [x] Confirm why `initPersonalization()` runs on every lesson page load.
      (Confirmed: each sign is its own full page load, `boot()` reruns
      `initPersonalization()` every time — not an SPA route.)
- [x] Confirm the full personalization card does not reopen unexpectedly.
      (jsdom harness, Group 6 — card stays closed across 3 simulated
      sign navigations once already answered.)
- [x] Prevent `#personalize-summary` from rendering on every sign.
      (jsdom harness, Group 6.)
- [x] Choose and document the intended summary behavior:
      first sign / once per session / another explicit product rule.
      **Chosen: once per browser session** (`sessionStorage`), rejected
      first-sign-of-category because real entry points (Continue
      Learning, review links, `?sign=` deep-links) don't reliably land
      on signIdx 0. Documented in `js/lesson.js`'s own comments,
      `REV8_TEACHING_AUDIT.md` §11, and `PIVOT_CHECKLIST.md`.
- [x] Verify the summary still supports Edit/Personalize when intended.
      (jsdom harness, Group 8 — Edit reopens the card and pre-fills the
      previously saved audience.)
- [x] Verify the skip state still behaves correctly. (jsdom harness,
      Group 9.)
- [x] Verify the lesson skip-link no longer forces unnecessary
      personalization chrome before teaching content. (jsdom harness,
      Group 1 — confirms `#lesson-content` now sits on `.lesson-header`
      and `#personalize-card` is not inside it. This confirms DOM
      structure/`tabindex` placement, not actual screen-reader/keyboard
      behavior — no real-browser accessibility pass has been done for
      this feature, before or after this fix.)

---

## Phase 3 — Regression Verification ✅ done 2026-08-26 (jsdom-level; not browser-tested)

### Personalization

- [x] First-time learner with no preferences sees the personalization
      card at the intended point. (Group 2.)
- [x] Selecting audience works. (Group 3.)
- [x] Selecting practice time works. (Group 3.)
- [x] Saving preferences works. (Group 3.)
- [x] Skipping works. (Group 9.)
- [x] Saved preferences reload correctly. (Group 5.)
- [x] Editing preferences works. (Group 8.)
- [x] Preferences persist across lesson navigation as intended. (Groups
      5–7 simulate saved storage carried across full-page navigations.)
- [x] Preferences are isolated per logged-in user. (Group 4.)
- [x] Corrupt localStorage does not break the lesson. (Group 10.)

### Lesson flow

- [x] Sign header still renders. — unmodified by this session's diff;
      `.lesson-header` gained an `id`/`tabindex` attribute only, no
      content/logic change.
- [x] Sign image still renders/falls back correctly. — unmodified.
- [x] Sign description still renders. — unmodified.
- [x] Sign tips still render. — unmodified.
- [x] Signer/reference video still renders. — unmodified.
- [x] Quick Check still appears correctly. — zero lines of Quick Check
      logic touched this session (confirmed via diff); jsdom harness
      Group 11 confirms every Quick Check DOM hook (`#quick-check-card`,
      `#quick-check-prompt`, `#quick-check-image`, `#quick-check-options`,
      `#quick-check-feedback`, `#btn-quick-check-skip`) is still present
      and unrenamed. The deeper click-through/format-variety behavior
      itself was exercised by the *previous* session's own 14-group
      harness (see `PIVOT_CHECKLIST.md`'s Rev 8 section) and wasn't
      re-run here since nothing in that code path changed.
- [x] Quick Check feedback still works. — see above; logic untouched.
- [x] Previous / Next still works. — zero navigation logic touched;
      hook presence confirmed (Group 11, `#btn-prev`/`#btn-next`).
- [x] Course sidebar still works. — zero sidebar logic touched; hook
      presence confirmed (Group 11, `#course-sidebar`).
- [x] Optional camera practice still works. — zero camera/MediaPipe
      code touched; hook presence confirmed (Group 11, `#lw-webcam`,
      `#lw-canvas`, `#btn-try-practice`, `#motion-status-label`).
- [x] Camera practice remains optional. — unchanged, not gated by
      anything this session touched.
- [x] Camera practice remains non-gating. — unchanged.
- [x] Final sign still routes to the graded assessment. — unmodified;
      this session never touched sign-index/routing logic.

### Architecture

- [x] No changes to unit ordering.
- [x] No changes to unlock logic.
- [x] No changes to progress algorithms.
- [x] No duplicate progress/order/unlock logic introduced.
- [x] No changes to `auth.js`.
- [x] No changes to `data.js` unless independently required. (Not
      touched — not independently required.)
- [x] No changes to `learn.js` unless independently required. (Not
      touched — not independently required.)
- [x] No changes to quiz architecture.

---

## Phase 4 — Efficiency Review ✅ done 2026-08-26

- [x] Confirm only the minimum necessary files were changed. Two:
      `js/lesson.js`, `pages/lesson.html`. The second one was scope
      creep relative to `REV8_TEACHING_AUDIT.md`'s own original
      prediction (JS-only) — justified and documented in that file's
      §9/§11 (the session-gate alone left one page load per session
      where the skip-link still landed on personalization chrome).
- [x] Confirm existing personalization functions were reused.
      `loadPersonalization()`/`savePersonalization()`/
      `markPersonalizationSkipped()`/`wasPersonalizationSkipped()`/
      `initPersonalization()` all extended in place, none replaced.
- [x] Confirm no new personalization subsystem was created.
- [x] Confirm no new Firestore schema was introduced. Still
      `localStorage`-only.
- [x] Confirm no new progress state was introduced.
- [x] Confirm no duplicate storage logic was created unnecessarily.
      One genuinely new, minimal piece of state was added — a
      `sessionStorage` flag (`lw_personalize_summary_shown_v1`) — which
      is new state, not duplicate logic; it's the smallest primitive
      that could express "once per session."
- [x] Confirm no duplicate lesson-navigation logic was created.
- [x] Confirm no duplicate Quick Check logic was introduced.
- [x] Confirm implementation remains easy to remove/move later. Still
      additive, still isolated to the same 2 files, still a single
      well-commented block — a future Dashboard move remains mechanical
      per `REV8_TEACHING_AUDIT.md` §6/§9.

---

## Phase 5 — Documentation ✅ done 2026-08-26

### `REV8_TEACHING_AUDIT.md`

- [x] Record the UID-scoping fix. (§11.)
- [x] Record the repeated-summary fix. (§11.)
- [x] Record verification results. (§11.)
- [x] Record any newly discovered risks. (§11 — the residual skip-link
      gap the session-gate alone would have left, and why it was
      closed too.)
- [x] Update open questions. (§7 — one resolved, two still genuinely
      open product calls, left open.)
- [x] Re-evaluate whether Dashboard ownership should change. (Reaffirmed
      no change — header + §6 unchanged.)

### `AI_MEMORY.md`

- [x] Add one concise session-log entry.
- [x] Record changed files.
- [x] Record any remaining issue. (Not browser-tested, flagged.)

### `PIVOT_CHECKLIST.md`

- [x] Update only directly relevant Rev 8 items. (New "Audit fixes"
      sub-section under the existing Rev 8 section; "What's still
      open" list updated to reflect the two resolved items.)
- [x] Do not mark unrelated curriculum work complete.

### `SYSTEM_ARCHITECTURE.md`

- [x] Update only if the implementation changes the documented
      architecture. **Reviewed, not updated** — this session's fixes
      (uid-scoping, session-gating, skip-link retarget) are bug fixes
      to the existing documented feature, not an architecture change,
      so nothing here needed editing per this session's own scope
      instruction. Note for a future pass: Rev 8's section (line ~462)
      still says the summary is "shown at most once... collapsing to a
      one-line editable summary afterward," which was already subtly
      inaccurate before this session (per `REV8_TEACHING_AUDIT.md` §1)
      and is now further out of date (behavior is "once per session,"
      not "once ever") — flagged, not fixed, since this file wasn't in
      this session's edit scope.
- [x] Preserve Rev 7 as the authoritative curriculum architecture.
      (Untouched.)
- [x] Keep the Rev 8 teaching layer clearly additive. (Untouched —
      no architecture-level change made.)

---

## Phase 6 — Future Decision: Dashboard Ownership 🔲

> Do NOT implement this phase yet.

- [ ] Determine whether personalization answers will actually affect
      learner experience.
- [ ] Determine whether Dashboard will use the preferences for its
      "What should I do next?" responsibility.
- [ ] Re-evaluate Lesson vs Dashboard ownership.
- [ ] If Dashboard becomes the owner, identify exact migration files.
- [ ] Preserve the same preference semantics during migration.
- [ ] Avoid creating a second preference-storage system.
- [ ] Remove Lesson personalization only after Dashboard replacement
      is verified.
- [ ] Re-test first-load, navigation, logout/login, and accessibility.

---

## Definition of Done

- [x] Personalization is isolated to learner context.
- [x] User preferences are correctly UID-scoped.
- [x] Personalization does not appear as unwanted repeated chrome.
- [x] Lesson teaching remains the primary focus.
- [x] Accessibility behavior remains correct. **Caveat:** verified at
      the DOM-structure level (skip-link target moved outside the
      personalization subtree, confirmed via jsdom) — not verified with
      a real screen reader or keyboard-only pass. No real-browser
      accessibility check has ever been done for this feature, before
      or after this session.
- [x] Quick Check remains intact. (Zero-diff + hook-presence evidence,
      see Phase 3 above — not re-exercised at the click-through level
      this session since nothing in that code path changed.)
- [x] Camera practice remains optional/non-gating. (Same basis as
      above.)
- [x] Quiz/assessment flow remains intact. (`quiz.js`/quiz architecture
      untouched, confirmed via diff.)
- [x] No curriculum/order/unlock/progress architecture changed.
- [x] Documentation is updated.
- [x] Runtime behavior has been tested beyond syntax checking. (jsdom
      runtime harness, 11 groups / 46 assertions, real DOM + real
      `localStorage`/`sessionStorage` + simulated clicks against the
      real edited files.)