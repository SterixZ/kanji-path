# REF selection and adaptation

Selected source: **Team 10 — Nookstep**, from the user's REF chat library. All 18 archive summaries/manifests were inspected; Nookstep was selected for its learner-facing study workspace and Supabase persistence patterns. Inventory, delivery and financial-operation schemas were not a fit for the Kanji Path learning model.

Archive: `Team-10-main.zip`
SHA-256 recorded in the library manifest: `FE9981E751FF70D6CF58B372D4B1F99AF910343962BBB2FE9CFB5C3EC96ACF7C`

Reference files inspected: `src/components/study/workspace.tsx`, `src/app/globals.css`, `src/lib/study/model.ts`, `src/lib/study/data.ts`, `src/lib/auth/policy.ts`, `src/lib/supabase/config.ts`, and the initial Supabase schema/read-access migration.

The interface adapts the warm cream/sage surfaces, serif study headings, primary study-entry panel, separate next-step panel and personal study-space composition. Kanji Path's phone bottom tabs, desktop sidebar, library and full learning/practice tools remain connected to their existing routes. The character panel is functional: it opens the real bundled character explorer. Counts and collection progress come from the current learner rather than sample reference data.

Storage decision: the user chose **interface only; no database needed**. Only Nookstep's presentation and study-workspace composition are adapted. Kanji Path retains its existing on-device progress and export/import backups; the reference's accounts, cloud database, authentication, room assets and economy are not included.

All project files remain under `D:\Project\kanji-path`. Screenshots and exports stay in its `artifacts/` subfolders. No reference ZIP, reference account credentials or new backend dependencies are included in the application or source exports.
