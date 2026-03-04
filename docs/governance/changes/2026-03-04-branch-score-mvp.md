# Flow Visual: Branch Score MVP

## 1. Summary

- Change title: add controlled score-threshold branch node MVP.
- Date: 2026-03-04
- Scope: flow-visual compiler + generic runtime.
- Owner: Domain + Engine + Tests + Docs

## 2. Change

- Compiler:
  - add `compileFlowVisualGraphToBranchMvpSteps`.
  - support `branchScore` node with `branchScoreThreshold`.
  - compile branch metadata: `condition(score_gte)`, `passStepId`, `failStepId`, `defaultStepId`.
  - add branch-specific validation:
    - non-branch node multi-out blocked (`branch_node_required`);
    - branch node out-degree must be 2 (`branch_out_degree_invalid`);
    - threshold required (`branch_threshold_invalid`).
- Runtime:
  - add `reduceFlowRuntimeStateWithBranch`.
  - when active step has `branch` metadata, runtime resolves target path by score context (`totalScore`) and jumps to target step.

## 3. Compatibility

- Existing linear compile/runtime entry remains unchanged:
  - `compileFlowVisualGraphToLinearSteps` behavior not changed.
  - `reduceFlowRuntimeState` behavior not changed.
- New branch capability is opt-in by using new compiler/runtime API.

## 4. Verification

- `node --test tests/flow-visual-branch-mvp.test.mjs tests/runtime-branch-mvp.test.mjs`
- `node --test tests/flow-visual-compiler.test.mjs tests/flow-engine.test.mjs tests/runtime-unified-entry.test.mjs`
- `npm run test` (190/190 pass)
