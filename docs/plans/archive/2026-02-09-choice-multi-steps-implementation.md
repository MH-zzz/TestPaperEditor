# Listening Choice Multi-Step Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add multi-step flow for listening choice questions, including an intro step, per-step audio, and a post-audio preparation countdown, plus a step bar in preview/exam.

**Architecture:** Extend `ListeningChoiceQuestion` with `steps` referencing subquestion IDs. Renderer controls step state and audio+countdown display. Editor allows configuring steps (intro + sections) and assignment of subquestions per step. Preview shows a horizontal step bar.

**Tech Stack:** Vue 3 + uni-app, TypeScript.

---

### Task 1: Types & Template

**Files:**
- Modify: `types/question.ts`
- Modify: `templates/index.ts`

**Step 1: Add step types**
- Define `ChoiceStep` with `type: 'intro' | 'section'`, `title`, `instruction`, `audio`, `prepCountdown`, `subQuestionIds`.
- Add `steps: ChoiceStep[]` to `ListeningChoiceQuestion`.

**Step 2: Update template**
- Create default steps: intro + one section referencing existing subquestions.

### Task 2: Editor – Step Configuration

**Files:**
- Modify: `components/editor/ListeningChoiceEditor.vue`

**Step 1: Add steps panel**
- Step list with add/remove/reorder (basic add/remove is enough).
- For intro step: fields for title/instruction/audio/countdown.
- For section step: fields for title/instruction/audio/countdown + multi-select subquestion assignment.

**Step 2: Keep subQuestions list**
- Ensure subquestion IDs are stable and referenced by steps.

### Task 3: Renderer – Step Flow

**Files:**
- Modify: `components/renderer/ListeningChoiceRenderer.vue`
- Modify: `components/renderer/QuestionRenderer.vue` (if step index passthrough needed)

**Step 1: Step state**
- Maintain current step index, render step content only.
- Show horizontal step bar (clickable).

**Step 2: Audio + Countdown bar**
- When audio playing, show bottom status bar ("播放 00:xx").
- After audio ends, start countdown if configured ("答题准备 00:xx").
- Countdown does not hide questions.

### Task 4: Preview Integration

**Files:**
- Modify: `components/views/EditorWorkspace.vue`
- Modify: `pages/preview/index.vue`

**Step 1: Pass step index**
- Keep step index in parent if needed and allow step bar to change it.

### Task 5: Manual Verification

**Step 1:** Intro step shows audio + countdown.
**Step 2:** Section steps show assigned subquestions.
**Step 3:** Step bar jumps correctly.

**Note:** Automated tests are skipped per user request.
