# Team Split: UI / Flow Engine / Docs

## Goal
Keep multi-question-type iteration stable by separating responsibility lines:

- `UI Track`: screen/component behavior, visual consistency, interaction details.
- `Flow Engine Track`: step compilation/runtime, flow config compatibility, routing/binding.
- `Docs Track`: rules, decision records, type registry, release checklists.

## Responsibility Boundary

### UI Track
- Owns: `pages/`, `components/renderer/`, `components/views/`, visual specs.
- Must not: change flow compile/runtime semantics without Engine review.
- Delivery output:
  - UI diff screenshots/videos.
  - Interaction notes (gesture, countdown text, nav behavior).
  - Renderer behavior mapping for changed question types.

### Flow Engine Track
- Owns: `engine/flow/`, `flows/`, `domain/flow-*`, flow stores, flow types.
- Must not: ship behavior change without updating docs + tests.
- Delivery output:
  - Step sequence before/after.
  - Compatibility statement for old `questions.json` / `flows.json`.
  - Runtime trace sample for one full loop.

### Docs Track
- Owns: `docs/governance/`, `docs/templates/`, type-level docs.
- Must not: accept feature complete without doc alignment.
- Delivery output:
  - Updated type registry.
  - Updated flow/UI standards (`docs/governance/flow-ui-standards.md`) when behavior meaning changes.
  - Updated change record (template-based).
  - Updated acceptance checklist.

## Handoff Contract

### UI -> Engine
- Provide:
  - exact expected step labels and timing labels;
  - which step should auto-next and which should wait user action;
  - edge cases (pause/resume, replay gap, first/last step swipe).

### Engine -> UI
- Provide:
  - concrete generated step list;
  - per-step fields consumed by renderer (`kind`, `groupId`, `autoNext`, timing);
  - compatibility notes and migration impact.

### UI/Engine -> Docs
- Provide:
  - what changed;
  - why changed;
  - how to verify;
  - rollback strategy.

## Definition Of Done (Per Change)

- Code:
  - relevant renderer/engine files updated.
  - related tests added/updated.
- Docs:
  - `docs/governance/question-type-registry.md` updated.
  - `docs/governance/flow-ui-standards.md` reviewed/updated when needed.
  - one change record created from template.
- Validation:
  - `node --test` passes.
  - mobile path manually verified (at least one full question loop).

## Branch/Commit Convention (Lightweight)

- Branch suggestion:
  - `ui/<topic>`
  - `engine/<topic>`
  - `docs/<topic>`
- Commit prefixes:
  - `ui: ...`
  - `engine: ...`
  - `docs: ...`
