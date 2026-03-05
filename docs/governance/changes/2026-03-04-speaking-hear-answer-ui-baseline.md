# Speaking Hear-Answer UI Baseline

## 1. Summary

- Change title: Add numeric UI baseline for `speaking_hear_answer` and mark registry UI status as accepted.
- Date: 2026-03-04
- Type IDs involved: `speaking_hear_answer`
- Owner: Docs

## 2. Problem

- `speaking_hear_answer` had flow acceptance but no dedicated UI baseline document.
- Alignment/font/spacing and recording-stage semantics could not be validated with a stable checklist.

## 3. Scope

- Included:
  - baseline doc with numeric values and hear-answer specific QA checks;
  - governance status sync in registry + standards.
- Not included:
  - runtime behavior changes;
  - renderer CSS code changes.

## 4. Key Output

- Added:
  - `docs/question-types/speaking-hear-answer-ui-baseline.md`
- Updated:
  - `docs/governance/question-type-registry.md`
  - `docs/governance/flow-ui-standards.md`
  - `README.md`

## 5. Validation

- Confirmed current renderer behavior already matches the documented baseline:
  - `promptTone` reuses previous screen body;
  - `recordGuide` and recording-state answer stage are visible and test-covered.

## 6. Follow-up

- Keep baseline synced when hear-answer recording UI semantics change.
- `speaking_steps` / `listening_fill` / `listening_match` acceptance has been completed on 2026-03-04 (see related accepted change records).
