# Listening Match UI Baseline

## Purpose

Define the accepted baseline for `listening_match` across runtime protocol, mapping interaction, and mobile presentation.

## Current Status

- Type: `listening_match`
- Flow status: `Done`
- UI status: `Done`
- Baseline state: accepted for current release line.

## Scope

- Runtime:
  - `engine/flow/listening-match/runtime.ts`
  - `app/usecases/runQuestionFlow.ts`
- Renderer:
  - `components/renderer/ListeningMatchRenderer.vue`
- Preview selection integration:
  - `components/views/EditorWorkspace.vue`
  - `pages/preview/index.vue`

## 1. Layout Baseline

- Main structure:
  - header (stem + optional audio above/below)
  - two-column match board + center line layer.
- Match items:
  - active/connected states are visually distinct;
  - left/right dots are center-aligned with item block.

## 2. Typography and Spacing Baseline

| Area | Selector/Meaning | Value |
|---|---|---|
| Stem text | `.listening-match__stem` | `$font-size-lg`, `font-weight: 500` |
| Match item text | `.match-content` | `14px` |
| Item min height | `.match-item` | `48px` |
| Dot size | `.match-dot` | `10px` |

| Area | Selector | Value |
|---|---|---|
| Inner padding | `.listening-match__inner` | `$spacing-md` |
| Header spacing | `.listening-match__header` | `$spacing-lg` |
| Column gap | `.match-column` | `16px` |
| Board min height | `.match-container` | `200px` |

## 3. Interaction Baseline

- Pair normalization:
  - scalar/array answers map to normalized pair list deterministically.
- Selection behavior:
  - one-to-one mode enforces unique right target globally;
  - one-to-many mode supports toggle per left key.
- Runtime entry:
  - unified single-step protocol via `runQuestionFlow`.

## 4. Acceptance Checklist

- [x] pair normalization supports scalar + array answer values.
- [x] one-to-one uniqueness behavior covered by tests.
- [x] one-to-many toggle behavior covered by tests.
- [x] preview/editor selection handlers use shared helper.
- [x] governance status and change records are synchronized.

Related automated checks:

- `tests/listening-match-runtime.test.mjs`
- `tests/runtime-unified-entry.test.mjs`
- `tests/flow-center-maintainability.test.mjs`

## 5. Acceptance Verdict

`listening_match` baseline is accepted for current release scope (`Flow = Done`, `UI = Done`).
