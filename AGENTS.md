# Repository Guidelines

## Project Structure & Module Organization
- `App.vue` and `main.js` are the application entry points.
- `pages/` contains top-level views: `pages/index/`, `pages/editor/`, `pages/preview/` (configured in `pages.json`).
- `components/` is split by responsibility:
  - `components/editor/` for editing UI (data entry, toolbars).
  - `components/renderer/` for read-only rendering used by both preview and exam views.
  - `components/views/` for higher-level view containers.
  - `components/layout/` for shared layout pieces.
- `types/` holds TypeScript data models (question types, tags, rich text).
- `stores/` contains state management.
- `styles/` and `uni.scss` define shared SCSS variables and global styles.
- `static/` stores images and other static assets.

## Build, Test, and Development Commands
Development supports both npm CLI and **HBuilderX**:
- Install dependencies: `npm install`
- Run H5 (CLI): `npm run dev:h5`
- Build H5 (CLI): `npm run build:h5`
- Preview H5 build: `npm run preview:h5`
- Run all regression tests: `npm run test`

HBuilderX remains available:
- Run H5: HBuilderX → Run → Run to Browser.
- Run App: HBuilderX → Run → Run to Device/Emulator.
- Build: HBuilderX build tooling.

## Coding Style & Naming Conventions
- Follow existing Vue/uni-app conventions in the codebase.
- SCSS variables live in `styles/variables.scss` and are imported via `uni.scss`.
- CSS naming uses BEM (example: `.component__element--modifier`).
- Use path aliases starting with `/` (example: `/types`, `/components`).
- Editor components: `QuestionTypeEditor.vue`. Renderer components: `QuestionTypeRenderer.vue`.

## Testing Guidelines
- Minimal regression tests live in `tests/` and use Node's built-in test runner.
- Run: `node --test`

## Commit & Pull Request Guidelines
- Git history is not available in this workspace, so no established convention can be verified.
- Use short, imperative commit messages that describe the change (example: `add listening match renderer`).
- PRs should include a concise summary, linked issues (if any), and screenshots or recordings for UI changes.

## Architecture Notes
- Renderer reuse is a core rule: update `components/renderer/` to change both preview and exam views.
- Rich text is stored as structured JSON, not HTML; avoid introducing HTML editors.
