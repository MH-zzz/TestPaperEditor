# Flow Module Library (Listening Choice) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Introduce a “standard flow module + flow library” system for `listening_choice` so most questions reuse a shared standard flow, while structural custom flows are saved/deduped into a reusable local library.

**Architecture:** Add `flow.source` to `ListeningChoiceFlow`:
- `standard`: references a single standard module id and stores only whitelisted per-step parameter overrides (not structural changes).
- `library`: references a saved template in a local Flow Library (deduped by hash of normalized template steps).
`flow.steps` remains as a derived/materialized cache for rendering + editing, regenerated on load from `flow.source`.

**Tech Stack:** Vue 3 + uni-app, TypeScript models in `types/`, local persistence via `uni.setStorageSync`, Node built-in test runner (`node --test`) for pure flow-module logic.

---

### Task 1: Define Types For Flow Sources + Library Modules

**Files:**
- Modify: `types/question.ts`

**Step 1: Write the failing test**
- Test: `tests/flow-modules.test.mjs`
- Add an import smoke-test for the new module file and assert expected exported constants/functions exist.

**Step 2: Run test to verify it fails**
- Run: `node --test`
- Expected: FAIL because the module/types do not exist yet.

**Step 3: Write minimal implementation**
- Add `ListeningChoiceFlowSource` and `flow.source` into `ListeningChoiceFlow`.

**Step 4: Run test to verify it passes**
- Run: `node --test`
- Expected: PASS (or move to next failing assertion).

---

### Task 2: Implement Standard Flow Module + Template Materialization

**Files:**
- Create: `flows/listeningChoiceFlowModules.ts`
- Test: `tests/flow-modules.test.mjs`

**Steps:**
1. Add pure functions (no uni-app imports):
   - materialize standard steps (with stable per-step keys + override application)
   - detect if current steps match standard structure
   - compute overrides from current steps vs standard defaults
   - convert concrete steps -> template steps (groupIndex/questionOrders)
   - materialize template steps -> concrete steps
   - stable stringify + hash for dedupe
2. Keep “完成页/finish” out of standard flow.
3. Treat `groupPrompt` as structural (never in standard).

---

### Task 3: Add Flow Library Store (Local Persistence)

**Files:**
- Create: `stores/flowLibrary.ts`

**Steps:**
1. Store modules in `uni.setStorageSync('editor_flow_library_v1', ...)`.
2. Provide `ensureModule(type, templateSteps)` which returns module id, deduping by template hash.
3. Provide `getById(id)` for load-time materialization.

---

### Task 4: Wire “Use Default Flow” + New Question Template To Standard Source

**Files:**
- Modify: `templates/index.ts`
- Modify: `components/editor/ListeningChoiceFlowPanel.vue`

**Steps:**
1. `createListeningChoiceTemplate()` sets `flow.source.kind='standard'` and `flow.steps` generated from standard module.
2. Flow panel “使用默认流程” sets `flow.source` back to standard (clears overrides) and regenerates steps from the module.

---

### Task 5: Save-Time Normalization (Standard Overrides vs Library Module)

**Files:**
- Modify: `components/views/EditorWorkspace.vue`
- Modify: `pages/editor/index.vue`

**Steps:**
1. On “保存题目”, for `listening_choice`:
   - If current flow matches standard structure: set `source=standard` and persist only whitelisted overrides.
   - Else: convert to template, `ensureModule(...)`, set `source=library`.
2. After deciding source, materialize steps from the source before saving.

---

### Task 6: Load-Time Resolution (Regenerate Derived Steps)

**Files:**
- Modify: `components/views/EditorWorkspace.vue`
- Modify: `pages/editor/index.vue`
- Modify: `pages/preview/index.vue`

**Steps:**
1. After existing migrations, if `flow.source` exists:
   - resolve `flow.steps` from standard/library and persist back to storage if changed.

---

### Task 7: Intro Countdown Sync (Avoid Dual Sources Of Truth)

**Files:**
- Modify: `components/editor/ListeningChoiceEditor.vue`
- Modify: `components/editor/ListeningChoiceFlowPanel.vue`

**Steps:**
1. When editing `content.intro.countdown`, sync the intro countdown step (immediately after `intro`) in `flow.steps`:
   - insert/remove based on seconds
   - keep seconds/label/beep aligned
2. In flow panel, disable editing controls for that intro countdown step and show a hint to edit it in “内容: 说明”.

---

### Verification

1. Run tests: `node --test`
2. Manual smoke in HBuilderX (H5):
   - Create a `listening_choice` question, click “使用默认流程”
   - Modify group countdown seconds and save: confirm `flow.source.kind==='standard'` and overrides persist
   - Add a `groupPrompt` step and save: confirm a library module is created and referenced
   - Reload editor: confirm steps regenerate from standard/library and preview still works

