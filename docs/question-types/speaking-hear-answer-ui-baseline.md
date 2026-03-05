# Speaking Hear-Answer UI Baseline

## Purpose

Freeze accepted UI baseline for `speaking_hear_answer`, so flow and renderer changes can be verified against explicit numbers and behaviors.

## Scope

- Runtime renderer in learning/practice view.
- Source of truth:
  - `components/renderer/SpeakingHearAnswerRenderer.vue`
  - `components/renderer/ListeningChoiceRenderer.vue`
  - `components/renderer/listening-choice/ListeningChoiceRecordGuideBody.vue`
  - `components/renderer/listening-choice/ListeningChoiceAnswerChoiceBody.vue`
  - `components/renderer/listening-choice/ListeningChoiceQuestionList.vue`

## 1. Layout and Screen Semantics

### 1.1 Base Layout

- Reuse `listening_choice` full-screen practice layout:
  - no simulated device frame;
  - fixed bottom dock.
- Text baseline and left-edge alignment remain identical to `listening_choice`.

### 1.2 Hear-Answer Specific Screen Rules

- `promptTone` must reuse previous screen body; no standalone prompt-tone page.
- `recordGuide` is a first-class screen:
  - can render guide text;
  - can render per-question stems with question number.
- `answerChoice` must show:
  - question number + stem;
  - recording status card (`录音预览` in preview, recording countdown in exam).

## 2. Typography and Spacing Baseline

| Area | Selector/Meaning | Size | Line Height | Color |
|---|---|---|---|---|
| Record guide text | `.lc-record-guide :deep(.rich-text-renderer)` | `36rpx` | `1.5` | `#333` |
| Record guide question number | `.lc-record-guide__question-number` | `36rpx` | `1.4` | `#333` |
| Answer question number | `.lc-question__number` | `36rpx` | `1.35` | `#333` |
| Answer stem/option text | `.lc-question__stem` / `.lc-option__text` | `36rpx` | `1.35` | `#333` |
| Selected option text | option selected state | `36rpx` | `1.35` | `#FD6F27` |

| Area | Value |
|---|---|
| Record-guide context spacing | `24rpx` (`.lc-step__context` bottom margin) |
| Record-guide question list top margin | `24rpx` |
| Record-guide question gap | `20rpx` |
| Answer question block gap | `36rpx` |
| Option list gap | `24rpx` |

## 3. Bottom Dock and Recording Baseline

- Audio stage label:
  - content audio: `听语音`;
  - other playable stages: `放音`.
- Replay-gap countdown:
  - display time only (label empty).
- Hear-answer countdown mapping:
  - `录音准备倒计时` -> `录音准备`;
  - `录音倒计时` -> `录音中`;
  - fallback answer countdown in hear-answer context -> `答题中`.
- Preview mode must show static recording indicator style (`录音预览`), without auto-timer simulation.

## 4. QA Checklist (Must Pass Before Release)

- [ ] `promptTone` keeps previous screen body (no standalone prompt page).
- [ ] `recordGuide` can show guide text and per-question stems with number.
- [ ] answer stage shows recording status card in preview and exam mode.
- [ ] question number/stem/option keep `36rpx` baseline.
- [ ] selected option uses `#FD6F27` consistently for radio + text.
- [ ] replay-gap countdown in bottom dock shows time only.
- [ ] full practice page keeps fixed bottom dock and no layout jump between `recordGuide -> promptTone -> answerChoice`.

## 5. Change Control

If any value in this document changes:

- update this file;
- update `docs/governance/flow-ui-standards.md` if behavior meaning changes;
- add a record in `docs/governance/changes/`.
