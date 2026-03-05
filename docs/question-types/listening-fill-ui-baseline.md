# Listening Fill UI Baseline

## Purpose

Define the accepted baseline for `listening_fill` across runtime protocol, renderer behavior, and mobile readability.

## Current Status

- Type: `listening_fill`
- Flow status: `Done`
- UI status: `Done`
- Baseline state: accepted for current release line.

## Scope

- Runtime:
  - `engine/flow/listening-fill/runtime.ts`
  - `app/usecases/runQuestionFlow.ts`
- Renderer:
  - `components/renderer/ListeningFillRenderer.vue`

## 1. Layout Baseline

- Main structure:
  - header (audio + stem)
  - template text with inline blanks
  - optional word bank area (`select` mode)
  - optional reference answers area (`showAnswer`).
- Fill blanks keep index + input/selection as one visual unit.

## 2. Typography and Spacing Baseline

| Area | Selector/Meaning | Value |
|---|---|---|
| Stem text | `.listening-fill__stem` | `16px`, `font-weight: 500` |
| Template body text | `.fill-content` | `16px`, `line-height: 2.4` |
| Blank index | `.blank-index` | `10px` |
| Word bank item text | `.word-item` | `14px` |
| Answer row text | `.answer-item` | `14px` |

| Area | Selector | Value |
|---|---|---|
| Inner padding | `.listening-fill__inner` | `$spacing-md` |
| Header bottom spacing | `.listening-fill__header` | `24px` |
| Word bank top spacing | `.word-bank` | `24px` |
| Answer section top spacing | `.answer-section` | `24px` |

## 3. Interaction Baseline

- Template parsing:
  - `{{n}}` placeholder parsing is deterministic.
- Answer check:
  - supports strict vs variant mode (`acceptVariants`).
- Word bank behavior:
  - deterministic seeded shuffle;
  - fallback to first answer of each blank when no explicit word bank.
- Runtime entry:
  - unified single-step protocol via `runQuestionFlow`.

## 4. Acceptance Checklist

- [x] template parsing deterministic.
- [x] correctness checking supports strict and variant modes.
- [x] seeded word-bank ordering deterministic and non-mutating.
- [x] renderer uses shared runtime helpers.
- [x] governance status and change records are synchronized.

Related automated checks:

- `tests/listening-fill-runtime.test.mjs`
- `tests/runtime-unified-entry.test.mjs`
- `tests/flow-center-maintainability.test.mjs`

## 5. Acceptance Verdict

`listening_fill` baseline is accepted for current release scope (`Flow = Done`, `UI = Done`).
