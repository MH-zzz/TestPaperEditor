# Mobile Learning: 3-Page Split

## 1. Summary

- Change title: Split local learning from single-page-state to 3 real pages
- Date: 2026-03-03
- Type IDs involved: `listening_choice`, `speaking_hear_answer`, `speaking_steps` (runtime render)
- Owner: UI + Engine + Docs

## 2. Problem

- Current behavior: one page used three internal states, making back navigation unclear.
- Expected behavior: real route stack: unit list -> unit overview -> practice.
- User impact: app top-left back now naturally returns to previous learning page.

## 3. Scope

- Included:
  - new pages: `unit-list`, `unit-overview`, `practice`;
  - shared local-learning store for data load + runtime state.
- Not included:
  - multi-question progress persistence per unit;
  - remote sync.

## 4. UI Changes

- Pages/components touched:
  - `pages/mobile-learning/unit-list.vue`
  - `pages/mobile-learning/unit-overview.vue`
  - `pages/mobile-learning/practice.vue`
- Interaction changes:
  - use `navigateTo`/`navigateBack` route stack instead of internal screen state.
- Visual changes:
  - kept existing learning layout style.

## 5. Flow Engine Changes

- Compiler/runtime changes: none.
- Runtime usage change:
  - practice page reads resolved runtime question from shared store and keeps swipe step navigation.

## 6. Data Compatibility

- `questions.json` compatibility: unchanged.
- `flows.json` compatibility: unchanged.
- Migration required: no.

## 7. Test Plan

- Updated:
  - `tests/mobile-learning-local-page.test.mjs`
- Regression:
  - `node --test`

## 8. Risk and Rollback

- Main risk:
  - route stack edge cases when entering page directly.
- Rollback method:
  - switch App launch target back to old entry and restore single-page state file.

## 9. Documentation Updates

- [x] `docs/governance/question-type-registry.md` reviewed
- [x] change record created
- [x] README governance links updated

