# Listening Choice UI Baseline (Alignment + Font + Spacing)

## 1. Summary

- Change title: Add numeric UI baseline for listening-choice to reduce repeated visual verification.
- Date: 2026-03-03
- Type IDs involved: `listening_choice`
- Owner: Docs

## 2. Problem

- UI discussions repeatedly revisited the same topics:
  - left alignment consistency;
  - font-size consistency;
  - spacing consistency.

## 3. Scope

- Included:
  - baseline doc with numeric values (`rpx`);
  - QA checklist for acceptance.
- Not included:
  - runtime behavior changes;
  - CSS code modifications.

## 4. Key Output

- Added:
  - `docs/question-types/listening-choice-ui-baseline.md`
- Updated:
  - `docs/governance/flow-ui-standards.md`
  - `docs/governance/question-type-registry.md`
  - `docs/templates/question-type-change-template.md`
  - `README.md`

## 5. Follow-up

- When `speaking_hear_answer` UI starts:
  - create `docs/question-types/speaking-hear-answer-ui-baseline.md`;
  - mark UI baseline status in registry from `Pending` to `Done`.

