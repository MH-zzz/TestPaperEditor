# Flow/UI Standardization and Type Status Sync

## 1. Summary

- Change title: Sync listening-choice / hear-answer status and add flow/UI standard doc
- Date: 2026-03-03
- Type IDs involved: `listening_choice`, `speaking_hear_answer`
- Owner: Docs

## 2. Problem

- Existing docs did not clearly explain:
  - what flow semantics mean;
  - what UI acceptance standard means;
  - why current behavior choices exist.

## 3. Scope

- Included:
  - status sync in question type registry;
  - new flow + UI standards document;
  - governance links update.
- Not included:
  - runtime code behavior changes.

## 4. Key Decisions

- `listening_choice`: Flow = Done, UI = Done.
- `speaking_hear_answer`: Flow = Done, UI = Pending.
- replay gap countdown should be treated as replay pacing semantics, not answer preparation semantics.

## 5. Validation

- Documentation consistency review:
  - registry row + standards link + team-split DoD alignment.

## 6. Follow-up

- When `speaking_hear_answer` UI implementation starts:
  - update registry UI status;
  - add a new change record using template.

