# Listening Choice Flow Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `listening_choice` with a new `content + flow` data model and ship a visual editor + guided preview runner (one-step-per-screen, semi-auto advance).

**Architecture:** Store immutable-ish exam content in `content` (groups, audio, questions). Store an editable guided experience in `flow.steps` that references content by `groupId` and/or `questionIds`. The renderer runs the flow; the editor edits content + flow side-by-side and drives the renderer preview via `stepIndex`.

**Tech Stack:** Vue 3, uni-app, TypeScript types in `types/`, shared renderers in `components/renderer/`, editors in `components/editor/`.

---

### Task 1: Define New Data Types

**Files:**
- Modify: `types/question.ts`

**Steps:**
1. Replace `ListeningChoiceQuestion` fields with:
   - `content.intro.text/audio/countdown`
   - `content.groups[].{id,title,prompt,audio,subQuestions[]}`
   - `flow.steps[]` with step kinds: `intro`, `groupPrompt`, `countdown`, `playAudio`, `answerChoice`, `finish`
2. Add unions for `FlowAutoNext` and effect `playSfx`.
3. Keep `subQuestions[].id` globally unique (timestamp-based) to support `questionIds`.

**Manual Check:**
- `rg -n "ListeningChoiceQuestion" -S` should show only updated usage expectations.

---

### Task 2: Update Templates For New Model

**Files:**
- Modify: `templates/index.ts`

**Steps:**
1. Update `createListeningChoiceTemplate()` to output the new structure.
2. Ensure default `flow.steps` matches semi-auto behavior:
   - intro (plays intro audio/countdown), then each group prompt -> countdown(beep) -> playAudio -> answerChoice(timeLimit) -> finish.

**Manual Check:**
- The app can create a new listening choice question from the side navigation.

---

### Task 3: Implement Guided Flow Renderer (Preview/Exam)

**Files:**
- Modify: `components/renderer/ListeningChoiceRenderer.vue`
- Modify: `components/renderer/QuestionRenderer.vue`
- Modify: `components/views/EditorWorkspace.vue` (to pass `stepIndex` and receive `stepChange` for listening choice)

**Steps:**
1. Replace old step-bar based renderer with a `FlowRunner`:
   - One step per screen.
   - `playAudio`: play group audio `playCount` times, auto-next on ended.
   - `countdown`: show countdown, optional `endBeepUrl`, auto-next on zero.
   - `answerChoice`: render the question list resolved by `questionIds` or `groupId`, start timer on enter, auto-next on timeout, allow early next if enabled.
2. Add `stepIndex` optional prop to allow editor-driven preview, and emit `stepChange` when auto-advancing or when user taps next/back.
3. Ensure `@select` continues to work with existing `EditorWorkspace` answer state (`answers: Record<subQuestionId, string|string[]>`).

**Manual Check:**
- In preview, step auto-advances after countdown and audio ends.
- Answer selection still toggles like before.

---

### Task 4: Implement Visual Editor For `content + flow`

**Files:**
- Modify: `components/editor/ListeningChoiceEditor.vue`
- Modify: `components/editor/QuestionEditor.vue` (optional, if adding step selection events)

**Steps:**
1. Content editor:
   - Intro: rich text + audio url + playCount + countdown seconds/label/endBeepUrl.
   - Groups: add/remove groups, edit title/prompt/audio, manage subQuestions.
   - SubQuestion editor: stem/options/answer and answerMode (single/multiple).
2. Flow editor:
   - List steps with add/remove/reorder.
   - Step forms per kind.
   - `answerChoice` supports either `questionIds[]` selection or `groupId`.
3. Preview sync:
   - When selecting a step card, emit `stepExpand(stepIndex)` so `EditorWorkspace` preview jumps to that step.

**Manual Check:**
- Editing updates preview in real time.
- Adding a new step or moving steps updates preview order immediately.

---

### Task 5: Update Or Remove Now-Dead Old Listening Choice Fields

**Files:**
- Modify: `components/views/QuestionLibrary.vue` (plain text extraction if needed)

**Steps:**
1. Update any code reading `question.stem` for listening choice to read `content.intro.text` or first group prompt.

**Manual Check:**
- Library list still renders a reasonable title snippet for listening choice.

---

### Verification

Because this repo runs via HBuilderX, verification is manual:
1. Run H5 in HBuilderX.
2. Create a `listening_choice` question.
3. Edit intro, add groups and questions, edit flow, and confirm preview runs.

