# Listening Match Mode Design (2026-02-09)

## Goal
Add a per-question match mode for Listening Match items so the editor and renderer can enforce either one-to-many (current behavior) or one-to-one connections.

## Data Model
- Add `matchMode: 'one-to-one' | 'one-to-many'` to `ListeningMatchQuestion`.
- Default to `one-to-many` for backward compatibility when the field is missing.

## Editor UX
- Add a mode toggle ("一对多" / "一对一") in the "正确答案" section header.
- One-to-many: keep existing multi-select behavior.
- One-to-one: enforce unique connections on both sides.
- When selecting a new link in one-to-one, replace conflicting links (latest wins) and show a toast.
- When switching from one-to-many to one-to-one, auto-clean conflicts immediately and show a toast.

## Renderer/Preview Behavior
- In preview/exam mode, enforce `matchMode` during user selection.
- One-to-one: selecting a new pair replaces any existing pair for the same left or right.
- showAnswer mode remains read-only and renders `data.answers`.

## Migration & Compatibility
- Existing data without `matchMode` should behave as one-to-many.
- Templates should initialize `matchMode` to `one-to-many` for new questions.
