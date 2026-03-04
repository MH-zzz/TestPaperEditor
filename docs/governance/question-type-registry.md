# Question Type Registry

This file is the single source of truth for:

- question type ownership;
- flow completion status and UI completion status;
- where the runtime and renderer live;
- which spec explains the “why”.

## Status Meaning

- `Done`: shipped and accepted for current target.
- `In Progress`: implementation started but not accepted.
- `Pending`: not started.
- `Partial`: only part of required capability exists.

## Standards Link

- Shared spec: `docs/governance/flow-ui-standards.md`
- This spec must explain:
  - flow semantics;
  - UI acceptance standard;
  - why a behavior exists.

## Types

| Type ID | Business Name | UI Owner | Engine Owner | Docs Owner | Main UI Entry | Engine Entry | Flow Status | UI Status | Why/Spec | UI Baseline |
|---|---|---|---|---|---|---|---|---|---|
| `listening_choice` | 听后选择 | UI | Engine | Docs | `components/renderer/ListeningChoiceRenderer.vue` | `engine/flow/listening-choice/*` | Done | Done | `docs/governance/flow-ui-standards.md` | `docs/question-types/listening-choice-ui-baseline.md` |
| `speaking_hear_answer` | 听后回答 | UI | Engine | Docs | `components/renderer/SpeakingHearAnswerRenderer.vue` | reuses listening-choice flow + variant routing | Done | Pending | `docs/governance/flow-ui-standards.md` | Pending |
| `speaking_steps` | 听后转述 | UI | Engine | Docs | `components/renderer/SpeakingStepsRenderer.vue` | `engine/flow/speaking-steps/runtime.ts` | Partial | In Progress | `docs/governance/flow-ui-standards.md` | Pending |
| `listening_fill` | 听力填空 | UI | Engine | Docs | `components/renderer/ListeningFillRenderer.vue` | no dedicated unified flow runtime yet | Partial | Partial | `docs/governance/flow-ui-standards.md` | Pending |
| `listening_match` | 听力匹配 | UI | Engine | Docs | `components/renderer/ListeningMatchRenderer.vue` | no dedicated unified flow runtime yet | Partial | Partial | `docs/governance/flow-ui-standards.md` | Pending |

## Current Decision Snapshot (2026-03-03)

- `listening_choice`:
  - flow accepted;
  - UI accepted.
- `speaking_hear_answer`:
  - flow accepted;
  - UI not started as dedicated style implementation.

## Required Update Points For Any Type Change

When a type is changed, all lines below must be reviewed:

- `types/question.ts`
- renderer entry in `components/renderer/QuestionRenderer.vue`
- related page/workspace adapters (`pages/`, `components/views/`)
- flow compile/runtime (if flow-related)
- tests under `tests/`
- this registry row
- `docs/governance/flow-ui-standards.md` (if behavior meaning changes)

## Change Checklist (Quick)

- [ ] Type schema changed?
- [ ] Renderer behavior changed?
- [ ] Flow compile/runtime changed?
- [ ] Export/import JSON compatibility checked?
- [ ] Tests updated?
- [ ] Registry status updated?
- [ ] Flow/UI standards updated if “why” changed?
- [ ] Per-type UI baseline updated (alignment/font/spacing)?
- [ ] Change record added under `docs/governance/changes/`?
