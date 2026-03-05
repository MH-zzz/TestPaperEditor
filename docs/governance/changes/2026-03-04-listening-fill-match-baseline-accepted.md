# Listening Fill + Match Baseline Accepted

## 1. Summary

- Change title: Promote `listening_fill` and `listening_match` baselines from draft to accepted.
- Date: 2026-03-04
- Type IDs involved: `listening_fill`, `listening_match`
- Owner: UI + Engine + Docs

## 2. Problem

- Previous state was `Flow Partial / UI Partial`.
- Runtime and interaction logic had duplicated implementations across renderer and preview pages.

## 3. Scope

- Included:
  - add shared runtime helpers for fill template parsing / answer checking / word-bank resolution;
  - add shared runtime helpers for match pair normalization / selection state transitions;
  - align `runQuestionFlow` to use fill/match runtime helper entries;
  - align renderer + preview/editor selection handlers to shared helpers;
  - promote governance status to `Done/Done`.
- Not included:
  - redesign of fill/match UI visual style;
  - addition of new question schema fields.

## 4. Key Output

- Added:
  - `engine/flow/listening-fill/runtime.ts`
  - `engine/flow/listening-match/runtime.ts`
  - `tests/listening-fill-runtime.test.mjs`
  - `tests/listening-match-runtime.test.mjs`
- Updated:
  - `app/usecases/runQuestionFlow.ts`
  - `components/renderer/ListeningFillRenderer.vue`
  - `components/renderer/ListeningMatchRenderer.vue`
  - `components/views/EditorWorkspace.vue`
  - `pages/preview/index.vue`
  - governance docs and per-type baseline docs.

## 5. Acceptance Evidence

- Fill runtime behavior:
  - `tests/listening-fill-runtime.test.mjs`
- Match runtime behavior:
  - `tests/listening-match-runtime.test.mjs`
- Unified entry + governance consistency:
  - `tests/runtime-unified-entry.test.mjs`
  - `tests/flow-center-maintainability.test.mjs`

## 6. Status Clarification

- `listening_fill` is now marked: `Flow = Done`, `UI = Done`.
- `listening_match` is now marked: `Flow = Done`, `UI = Done`.
- This acceptance applies to current release scope; future behavior changes require baseline + change record updates.
