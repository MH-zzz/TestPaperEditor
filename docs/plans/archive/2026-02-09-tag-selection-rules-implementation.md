# Tag Selection Rules Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add tree-based tag selection with single/multi-select rules, a modal selector in the sidebar, and initialize required top-level categories and items.

**Architecture:** Extend the tag tree store to ensure required categories exist on load and build an index that maps nodes to their top-level category. Replace the sidebar "预设标签" with a selector modal that enforces selection rules and stores tag IDs in `metadata.tags`, while `metadata.source` is a text field.

**Tech Stack:** Vue 3 + uni-app, TypeScript, local storage via `uni.getStorageSync`/`uni.setStorageSync`.

---

### Task 1: Tag Rule Definitions and Tree Augmentation

**Files:**
- Modify: `stores/tag.ts`
- Modify: `stores/tagTree.ts`

**Step 1: Define required categories and defaults**
- Add a constant map for required top-level categories and their default children:
  - 教材版本: 人教社/外研社/新华社
  - 学期: 上学期/下学期
  - 年级: 1-12 年级
  - 年份: 2024/2025/2026
  - 难度: 简单/中等/困难
  - 知识点: (空或占位节点)
  - 地区: (空或占位节点)
  - 场景: (空或占位节点)
  - 来源: (文本输入，不进树可选，作为 metadata.source)

**Step 2: Ensure categories exist on load**
- In tag store load, after tree load, insert missing top-level categories with defaults.
- Save if the tree was augmented.

**Step 3: Build root mapping**
- Extend index builder to compute `rootById` (node ID -> top-level category title), used for selection rules.

### Task 2: Tag Selector Modal Component

**Files:**
- Create: `components/editor/TagTreeSelector.vue`

**Step 1: Modal UI**
- Tree browser with expand/collapse.
- Search filter (title/path).
- Selected list (pills).

**Step 2: Selection rules**
- Single-select categories: 教材版本/学期/年级/年份/难度
- Multi-select: 知识点/地区/场景
- Enforce by replacing within same category.

**Step 3: Source input**
- Add text input for `来源` and emit `update:source`.

### Task 3: Sidebar Integration

**Files:**
- Modify: `components/layout/SideNavigation.vue`
- Modify: `pages/editor/index.vue` (if needed for data flow)
- Modify: `components/views/EditorWorkspace.vue` (if used for question editing)

**Step 1: Replace old TagSelector**
- Show selected tags grouped by category.
- Add button to open TagTreeSelector modal.

**Step 2: Wire metadata**
- Store selected tag IDs in `metadata.tags`.
- Store source input in `metadata.source`.

### Task 4: Display Helpers

**Files:**
- Modify: `stores/tag.ts`

**Step 1: Path resolution**
- Add helper `getPath(id)` and `getRootCategory(id)`.
- Use these in sidebar to display category headers and paths.

### Task 5: Manual Verification

**Step 1: Verify categories**
- Ensure all required top-level categories appear.

**Step 2: Verify rules**
- Single-select categories replace previous selection.
- Multi-select categories allow multiple.

**Step 3: Verify persistence**
- Save question and reopen; tags and source persist.

**Note:** Automated tests are skipped per user request and lack of test framework.
