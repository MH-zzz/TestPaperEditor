# Listening Choice UI Baseline

## Purpose

Freeze accepted UI baseline for `listening_choice`, so future changes can be verified against numbers instead of repeated discussion.

## Scope

- Runtime renderer in learning/practice view.
- Source of truth:
  - `components/renderer/ListeningChoiceRenderer.vue`
  - `components/renderer/listening-choice/ListeningChoiceStepContext.vue`
  - `components/renderer/listening-choice/ListeningChoiceIntroBody.vue`
  - `components/renderer/listening-choice/ListeningChoiceQuestionList.vue`

## 1. Layout and Alignment Standard

### 1.1 Container Insets

- Screen background: `#f3f5f7`.
- Top container horizontal inset: `32rpx`.
- Body container horizontal inset: `32rpx`.
- Body inner horizontal inset: `32rpx`.

Result: title text and body text share one vertical alignment line (effective left text line is consistent).

### 1.2 Intro and Description Alignment

- Intro rich text must have:
  - `margin-left: 0`
  - `padding-left: 0`
  - `text-indent: 0`
- No first-line indentation is allowed.

### 1.3 Bottom Dock

- Bottom control dock is fixed to screen bottom in practice mode.
- Replay-gap countdown displays time only (no label text).

## 2. Typography Standard (Accepted Values)

| Area | Selector/Meaning | Size | Weight | Line Height | Color |
|---|---|---|---|---|---|
| Step title | `lc-flow__title` | `36rpx` | `600` | `1.35` | `#1a1a1a` |
| Step context title/group | `lc-step__context-title/group` | `36rpx` | `700/normal` | default/`1.5` rich text | `$text-primary/$text-secondary` |
| Intro/body rich text | intro/context rich text | `36rpx` | normal | `1.5` | `#1a1a1a` or `#333` |
| Question number | `lc-question__number` | `36rpx` | `400` | `1.35` | `#333` |
| Question stem | stem rich text | `36rpx` | normal | `1.35` | `#333` |
| Option text | `lc-option__text` + content | `36rpx` | normal | `1.35` | `#333` |
| Selected option text | selected option | `36rpx` | inherit | `1.35` | `#FD6F27` |
| Bottom label | `lc-bottom__countdown-label` | `36rpx` | `400` | `1.2` | `#1a1a1a` |
| Bottom timer | `lc-bottom__countdown-number` | `40rpx` | `700` | `1` | `#1a1a1a` |

## 3. Spacing Standard (Accepted Values)

| Area | Value |
|---|---|
| Question block vertical gap (`.lc-questions`) | `36rpx` |
| Stem to options gap | `20rpx` |
| Option list vertical gap | `24rpx` |
| Option row internal gap (radio to text) | `16rpx` |
| Radio top offset | `4rpx` |
| Context block to next content | `24rpx` |
| Bottom dock icon size | `120rpx` |
| Bottom dock main padding | `20rpx 32rpx 16rpx` |

## 4. Selection Visual Standard

- Radio + option text use same selected color semantics:
  - selected accent color: `#FD6F27`.
- Option key and answer content are rendered as one text flow (`A. xxx`) to keep wrap behavior consistent.
- Multi-line options must wrap as one block, not split key and content into visually disconnected lines.

## 5. QA Checklist (Must Pass Before UI Acceptance)

- [ ] Title and body left edge visually aligned.
- [ ] Intro description has no unexpected first-line indentation.
- [ ] Question number and stem are in same baseline style (`36rpx`).
- [ ] Option text is `36rpx`, selected option text is `#FD6F27`.
- [ ] Replay-gap countdown in bottom dock shows time only, no label.
- [ ] Bottom dock is fixed and does not drift with content scroll.
- [ ] Step switch (play/prepare/answer) does not cause noticeable vertical jump.
- [ ] Practice page remains full-screen (no simulated device frame).

## 6. Change Control

If any value in this document changes:

- update this file;
- update `docs/governance/flow-ui-standards.md` if behavior meaning changed;
- add a record in `docs/governance/changes/`.

