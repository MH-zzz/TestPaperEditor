# Question Type Change Record Template

Copy this file to:

- `docs/governance/changes/<YYYY-MM-DD>-<topic>.md`

Then fill all sections.

---

## 1. Summary

- Change title:
- Date:
- Type IDs involved:
- Owner:

## 2. Problem

- Current behavior:
- Expected behavior:
- User impact:

## 3. Scope

- Included:
- Not included:

## 4. UI Changes

- Pages/components touched:
- Interaction changes:
- Visual changes:
- Alignment/font/spacing baseline impacted:
  - baseline doc path:
  - updated values:

## 5. Flow Engine Changes

- Compiler/runtime changes:
- Step sequence before:
- Step sequence after:
- Auto-next/timeout/replay changes:

## 6. Data Compatibility

- `questions.json` compatibility:
- `flows.json` compatibility:
- Any migration required:

## 7. Test Plan

- Unit tests:
- Integration tests:
- Manual test path (mobile):

## 8. Risk and Rollback

- Main risks:
- Rollback method:

## 9. Documentation Updates

- [ ] `docs/governance/question-type-registry.md` updated
- [ ] Architecture/flow docs updated if needed
- [ ] Per-type UI baseline doc updated (`docs/question-types/*.md`)
- [ ] This record linked in PR/commit note
