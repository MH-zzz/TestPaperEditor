# Tag Tree Design (2026-02-09)

## Goal
Replace the flat tag system with a unified tree-based tag library. Use it for tag/knowledge-point selection in question editing via a modal selector, and manage the tree in the existing Tags Manager entry.

## Data Model
- Replace `Tag`/`TagCategory` with `TagNode`.
- Store a tree in local storage (single source of truth).
- Questions store `metadata.tags: string[]` of node IDs.

## Initialization
- On first load, if storage is empty, initialize from bundled `*.tree.json` (e.g. `知识点标签.tree.json`, `题型标签.tree.json`, `其他标签.tree.json`).
- Subsequent loads use stored tree without overwriting.

## Tags Manager (Global)
- Replace category cards with a tree manager.
- Support add/rename/delete/move nodes.
- Keep a right-side detail panel (name, optional note).

## Question Editor UX
- Add a "标签/知识点" button to open a modal selector.
- Selector shows tree and a search filter; selected tags show as removable pills.
- Allow selecting any node (leaf-only can be added later if needed).

## Display
- For selected tags, display human-readable paths (e.g. `知识点/语法/时态`) computed from the tree.

## Compatibility
- Old flat tags are no longer used; migration can be handled by a one-time mapping if needed, or discarded for new data.
