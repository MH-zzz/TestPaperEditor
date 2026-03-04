# Flow Visual: Loop Node MVP

## 1. Summary

- Change title: add controlled loop node MVP with iteration guard.
- Date: 2026-03-04
- Scope: flow-visual compiler + generic runtime + plugin config field type.
- Owner: Domain + Engine + Tests + Docs

## 2. Change

- Compiler:
  - add `compileFlowVisualGraphToLoopMvpSteps`.
  - support `loopNode` with `loopMaxIterations`.
  - compile loop metadata: `maxIterations`, `continueStepId`, `exitStepId`, `defaultStepId`.
  - add loop-specific validation:
    - non-loop node multi-out blocked (`loop_node_required`);
    - loop node out-degree must be 2 (`loop_out_degree_invalid`);
    - `maxIterations` must be positive integer (`loop_max_iterations_invalid`);
    - cycle without loop node blocked (`cycle_without_loop`).
- Runtime:
  - add `reduceFlowRuntimeStateWithLoop`.
  - runtime state adds optional `loopCounters`.
  - when entering `loopNode`, reducer increments per-node loop counter and exits automatically after reaching `maxIterations`.
  - when continue target is invalid, reducer falls back to loop default/exit path.
- Plugin schema:
  - `FlowStepConfigField` adds `maxIterations` key for future loop-node config panel support.

## 3. Compatibility

- Existing APIs remain available and behavior-compatible:
  - `compileFlowVisualGraphToLinearSteps`
  - `compileFlowVisualGraphToBranchMvpSteps`
  - `reduceFlowRuntimeState`
  - `reduceFlowRuntimeStateWithBranch`
- Loop feature is opt-in via new loop compiler/runtime APIs.

## 4. Verification

- `node --test tests/flow-visual-loop-mvp.test.mjs tests/runtime-loop-mvp.test.mjs`
- `node --test tests/flow-visual-branch-mvp.test.mjs tests/runtime-branch-mvp.test.mjs tests/flow-visual-compiler.test.mjs tests/flow-engine.test.mjs tests/runtime-unified-entry.test.mjs`
- `npm run test` (197/197 pass)
