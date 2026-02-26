# Choice Answer Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a global single/multiple answer mode for listening choice questions and store all answers as arrays.

**Architecture:** Extend `ListeningChoiceQuestion` with `answerMode`. Editor toggles this mode and updates answer selection behavior. Renderer reads answers as arrays for both single and multiple. No legacy compatibility required.

**Tech Stack:** Vue 3 + uni-app, TypeScript.

---

### Task 1: Update Types and Templates

**Files:**
- Modify: `types/question.ts`
- Modify: `templates/index.ts`

**Step 1: Add answerMode to ListeningChoiceQuestion**
- Add `answerMode: 'single' | 'multiple'`.
- Update `SubQuestion.answer` to be `string[]` (array-only).

**Step 2: Update template defaults**
- Set `answerMode: 'single'` in choice template.
- Ensure all `answer` fields are arrays (single => `[key]`).

### Task 2: Update Editor Behavior

**Files:**
- Modify: `components/editor/ListeningChoiceEditor.vue`

**Step 1: Add mode toggle UI**
- Provide Single/Multiple toggle at the top.

**Step 2: Update selection logic**
- Single: replace with `[optionKey]`.
- Multiple: toggle in array.

### Task 3: Update Renderer and Preview Selection

**Files:**
- Modify: `components/renderer/ListeningChoiceRenderer.vue`
- Modify: `components/views/EditorWorkspace.vue`
- Modify: `pages/editor/index.vue`
- Modify: `pages/preview/index.vue`

**Step 1: Render selection from array**
- Ensure checked state uses `answers[subId]` as `string[]`.

**Step 2: Update preview/exam selection**
- Use `answerMode` to decide single vs multiple behavior when user selects.

### Task 4: Manual Verification

**Step 1:** Create a listening choice question, switch between single/multiple, ensure selection behavior changes.
**Step 2:** Save and reload; answers remain arrays.

**Note:** Automated tests are skipped per user request.
