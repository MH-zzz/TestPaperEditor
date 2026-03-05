# Speaking Steps UI Baseline

## Purpose

Define the accepted UI baseline for `speaking_steps` so subsequent renderer/runtime changes can be evaluated against stable interaction and layout criteria.

## Current Status

- Type: `speaking_steps`
- Flow status: `Done`
- UI status: `Done`
- Baseline state: accepted for current release line.

## Scope

- Runtime + expansion:
  - `engine/flow/speaking-steps/runtime.ts`
  - `engine/flow/speaking-steps/expand.ts`
  - `app/usecases/runQuestionFlow.ts`
- Renderer:
  - `components/renderer/SpeakingStepsRenderer.vue`
  - `components/editor/speaking/StepPreview.vue`

## 1. Layout Baseline

### 1.1 Page Structure

- Container: `.speaking-steps` uses full-height flex column.
- Main area:
  - `.speaking-steps__main` scroll container.
  - `.speaking-steps__main-inner` padded card host.
- Footer:
  - `.speaking-steps__footer` fixed in flow at bottom.
  - contains control strip + previous/next navigation.

### 1.2 Step Card

- Card container: `.speaking-steps__content` (white card + rounded corners).
- Header:
  - left: step index (`第 N 步`);
  - right: step type badge.

## 2. Typography and Spacing Baseline

| Area | Selector/Meaning | Value |
|---|---|---|
| Question title text | `.question-title__text` | `14px`, `font-weight: 700` |
| Control play button icon | `.control-play-btn` | `14px` |
| Footer time text | `.control-time` | `11px` |
| Countdown / record icon | `.countdown-icon` / `.record-icon` | `18px` |
| Step header title | `.step-header .step-title` | `$font-size-base`, `font-weight: 500` |
| Step header badge | `.step-header .step-type` | `$font-size-xs`, pill style |

| Area | Selector | Value |
|---|---|---|
| Main inner padding | `.speaking-steps__main-inner` | `$spacing-sm` |
| Card padding | `.speaking-steps__content` | `$spacing-sm` |
| Footer padding | `.speaking-steps__footer` | `$spacing-xs $spacing-sm` |
| Footer control gap | `.footer-control` | `$spacing-sm` |
| Navigation gap | `.footer-nav` | `$spacing-md` |

## 3. Interaction Baseline

- Unified runtime navigation:
  - `prev` / `next` / `goToStep` handled by speaking-steps runtime reducer.
- Deterministic loop expansion:
  - `loop-sub-questions` expands by sub-question order with stable generated IDs.
- Footer control mode mapping:
  - `play-audio` => audio control strip;
  - `countdown` => countdown strip;
  - `record` => recording strip;
  - others => no control strip.

## 4. Acceptance Checklist

- [x] step navigation keeps runtime index stable.
- [x] loop expansion is deterministic and does not skip steps.
- [x] footer mode switches correctly across `play-audio` / `countdown` / `record`.
- [x] parent preview step count and renderer-expanded step count are aligned.
- [x] governance status and change records are synchronized.

Related automated checks:

- `tests/speaking-steps-runtime.test.mjs`
- `tests/runtime-unified-entry.test.mjs`
- `tests/flow-center-maintainability.test.mjs`

## 5. Acceptance Verdict

`Speaking_steps` baseline is accepted for current release scope (`Flow = Done`, `UI = Done`).
