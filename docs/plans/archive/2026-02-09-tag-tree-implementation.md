# Tag Tree Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace flat tags with a unified tree-based tag library, initialize from existing `*.tree.json` files, and provide a modal selector for questions plus a tree manager in the tags module.

**Architecture:** Store a `TagTree` in local storage; provide tree utilities to build an index and paths. The Tags Manager edits the tree. Question editing uses a modal selector that reads the same tree and stores selected node IDs in `metadata.tags`.

**Tech Stack:** Vue 3 + uni-app, TypeScript, localStorage via `uni.getStorageSync`/`uni.setStorageSync`.

---

### Task 1: Define Tag Tree Types and Utilities

**Files:**
- Modify: `types/tag.ts`
- Create: `stores/tagTree.ts`

**Step 1: Replace flat tag types**
- Define `TagNode` with `id`, `title`, optional `children`.
- Define `TagTree` as root array.
- Define helper types for index/path maps.

**Step 2: Add tree utilities**
- Implement `buildTagIndex(tree)` returning `{ byId, pathById }`.
- Implement `findNodeById` and `updateNode` helpers.

### Task 2: Load Tree from JSON on First Run

**Files:**
- Modify: `stores/tag.ts` (or rename to `stores/tagTree.ts` and update imports)
- Add: `static/tag-trees/` (optional) or load from local `.tree.json` copied into a TS constant

**Step 1: Create initial tree source**
- Use existing `题型标签.tree.json`, `知识点标签.tree.json`, `其他标签.tree.json` as initial sheets.
- Merge into one `TagTree` with top-level sections for each sheet title.

**Step 2: Initialize storage**
- On store load: if storage empty, set tree to initial tree and save.
- Otherwise load from storage.

### Task 3: Update Tags Manager to Tree UI

**Files:**
- Modify: `components/views/TagsManager.vue`

**Step 1: Replace category cards**
- Render a tree list (indentation + expand/collapse).
- Add actions per node: add child, rename, delete.

**Step 2: Persist edits**
- Mutate tree through store methods and save.

### Task 4: Add Tag Selector Modal for Question Editing

**Files:**
- Create: `components/editor/TagTreeSelector.vue`
- Modify: `components/editor/TagSelector.vue` (or replace usage)
- Modify: `components/editor/QuestionEditor.vue` (or relevant editor container)

**Step 1: Modal UI**
- Left: tree browser with search filter.
- Right: selected tags list with remove buttons.

**Step 2: Selection logic**
- Support multi-select by node ID.
- Emit `update:modelValue` with selected IDs.

### Task 5: Wire Selector into Question Metadata

**Files:**
- Modify: `pages/editor/index.vue`
- Modify: `components/views/EditorWorkspace.vue` (if it uses TagSelector)

**Step 1: Replace old selector**
- Swap `TagSelector` with `TagTreeSelector` in the editor UI.

**Step 2: Display paths**
- Use `pathById` for pill labels (e.g. `知识点/语法/时态`).

### Task 6: Clean Up and Verify

**Files:**
- Remove or update old flat tag usage in `types/tag.ts`, `stores/tag.ts`, and related imports.

**Step 1: Manual verification**
- Open tags manager, expand tree, add/rename/delete nodes.
- Open question editor, select tags via modal, confirm pills show correct paths.

**Note:** Tests are skipped per user request.
