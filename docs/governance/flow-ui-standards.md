# Flow Meaning and UI Standard

## Purpose

This file answers:

- flow means what;
- UI acceptance means what;
- why current behavior is designed like this.

Without this file, future type expansion will drift.

## 1. Flow Meaning (Runtime Semantics)

### 1.1 Core Terms

- `step`: smallest runtime transition unit.
- `autoNext`: transition trigger of a step.
- `group`: question group scope for listening-type flows.
- `replay gap`: countdown between repeated content audio plays.

### 1.2 AutoNext Contract

- `audioEnded`: move after current audio playback ends.
- `countdownEnded`: move after countdown reaches zero.
- `timeEnded`: move after answer/record time is exhausted.
- `tapNext`: move only by user action (or external forced navigation).

### 1.3 Listening Choice Canonical Loop

For group content audio with `playCount = N`:

- runtime must behave as `N` concrete play steps;
- replay gap countdown is inserted between plays for content audio;
- replay gap is not merged into answer step.

For `playCount = 2`, canonical sequence is:

- first play;
- replay gap countdown;
- second play.

### 1.4 Replay Gap Rule

- replay gap countdown is a distinct transition step;
- its purpose is replay pacing, not answer preparation;
- therefore bottom dock text should not show preparation wording for replay gap.

### 1.5 JSON Compatibility Rule

- old `questions.json` / `flows.json` must stay readable;
- if runtime semantics change, compatibility note is mandatory in change record;
- export/import must keep step meaning stable.

### 1.6 Hear-Answer Canonical Recording Loop

For `speaking_hear_answer` (or `questionVariant = hear_answer`) per-question recording stage:

- optional `recordGuide` step (show recording instruction text + play guide audio);
- prompt tone before recording starts;
- recording answer step;
- prompt tone after recording ends.

Current default prompt-tone audio:

- start recording: `/static/audio/开始录音.mp3`
- stop recording: `/static/audio/停止录音.mp3`

### 1.7 V2 Screen Strategy Contract

- `screenStrategy = replaceBody`:
  - current step owns the main white content area;
  - suitable for intro/countdown/record guide pages that require dedicated content.
- `screenStrategy = reusePrevious`:
  - keep previous step body and only change bottom dock/audio state;
  - suitable for tiny transition steps (for example prompt tones).
- `recordGuide` is configurable per step:
  - supports both `replaceBody` and `reusePrevious`;
  - this is the base mechanism for future multi-step/multi-screen-per-step variations.

## 2. UI Standard (Mobile Learning)

### 2.1 Layout Standard

- learning path uses real pages:
  - unit list;
  - unit overview;
  - practice.
- practice view is full screen; no simulated phone frame.
- bottom control dock is fixed to screen bottom in practice.

### 2.2 Typography and Spacing

- question content baseline size follows current accepted scale (`36rpx` for main body/option text context where agreed).
- title/body/option left edges must align consistently inside content card.
- no per-step layout jump when switching between “play audio” and “answer prepare”.
- detailed numeric baseline must be maintained in per-type baseline docs.

### 2.3 Bottom Dock Rules

- playing content audio: label shows `听语音`.
- in listening-choice answer stage: label shows `请选择`.
- replay gap countdown: show only time, no text label.
- pause/resume control must keep state consistent between audio and countdown.

### 2.4 Option Selection Visual Rule

- selected radio indicator and option text use the same selected color: `#FD6F27`.
- option key and option content should behave as one visual unit.
- wrapped lines must keep label+text readability as a single option block.

### 2.5 Per-Type Numeric Baselines

- `listening_choice`:
  - `docs/question-types/listening-choice-ui-baseline.md`
- `speaking_hear_answer`:
  - baseline doc pending (must be added before UI acceptance).

## 3. Acceptance Baseline By Type (Current)

- `listening_choice`:
  - flow: accepted;
  - UI: accepted (current baseline).
- `speaking_hear_answer`:
  - flow: accepted;
  - UI: pending.

## 4. When To Update This File

Must update when any of below changes:

- step transition meaning;
- autoNext trigger logic;
- bottom dock wording/state meaning;
- global typography/spacing acceptance baseline;
- selection/answer visual semantics.
- baseline-document governance rules.
