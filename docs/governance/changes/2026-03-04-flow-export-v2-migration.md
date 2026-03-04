# Flow Export: V2 Migration and Compatibility Closure

## 1. Summary

- Change title: add flow export package schema v2 with migration compatibility.
- Date: 2026-03-04
- Scope: export payload builder + import migrator + local learning ingestion + docs.
- Owner: Repository + Stores + Tests + Docs

## 2. Change

- New repository module:
  - `infra/repository/flowExportPackage.ts`
  - provides:
    - `buildFlowExportPackageV2`
    - `migrateFlowExportPayloadToV2`
- Export side:
  - `QuestionLibrary` now exports flows via `buildFlowExportPackageV2`.
  - package now contains:
    - `schemaVersion: 2`
    - `exportCapabilities`
    - `migrationReport`
- Import side:
  - `stores/localLearning.ts` now migrates incoming flow payload to V2 before applying.
  - legacy keys are supported:
    - `modules -> listeningChoiceModules`
    - `profiles -> flowProfiles`
    - `logs -> publishLogs`
  - import migration trace is persisted in local state:
    - `flowImportSchemaVersion`
    - `flowImportMigrated`
    - `flowImportChangeCount`
    - `flowImportCapabilities`
- Local sample data:
  - `static/local-learning/flows.json` moved to `schemaVersion: 2`.
  - README updated with v2 fields.

## 3. Compatibility

- V1 flow export payloads remain readable through migration.
- V2 payloads remain stable and do not produce extra migration mutations.
- Existing module/profile normalization logic remains unchanged and still applies after migration.

## 4. Verification

- `node --test tests/flow-export-migration.test.mjs`
- `node --test tests/preview-mode.test.mjs tests/mobile-learning-local-page.test.mjs`
- `npm run test` (201/201 pass)
