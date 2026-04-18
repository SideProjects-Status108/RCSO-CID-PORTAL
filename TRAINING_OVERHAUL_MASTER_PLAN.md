# Training Overhaul Master Plan

Master plan for the full 14-prompt Detective-in-Training (DIT) renovation of the CID Portal training module.

The source prompts live in [CURSOR_PROMPTS_TRAINING_BUILD.md](CURSOR_PROMPTS_TRAINING_BUILD.md). This document is the execution spine: it locks shared foundations upfront so later segments don't have to re-decide them, and it maps every existing training file to an **absorb / retire / keep** decision so drift stays low across the ~18-session build.

> Status: Segment A shipped. Segment A.1 role-model patch shipped (`is_training_supervisor` flag). Binder-derived + VARK + PTO-hybrid decisions locked below. Segment B ready to build. Update the **Status** column of [Segment index](#3-segment-index) as each segment ships.

---

## 1. Guiding decisions (locked)

These apply across all 14 prompts. Change them only with a master-plan update.

- **Shell.** Keep the global `NavRail`; add a training-specific sub-nav. Sub-nav items: Dashboard, DIT Files, Schedule, Resources, Settings.
- **Route group.** Everything stays under `src/app/(dashboard)/training/*`.
- **Eval model.** Keep `weekly_training_sessions` + `weekly_competency_scores` (20-competency weekly flow). **Retire** the legacy `evaluations` table + `TrainingEvaluationModal` at the end of Segment C.
- **Signatures.** Build the core signature system **early** (Segment B foundation), so Weekly Eval / Deficiency / Certificate all consume a mature shared API. iPad UX polish + PDF watermarking ship in Segment C where they're first exercised.
- **Legacy re-export routes** (`/training/{onboarding,dit-records,dit-evaluations,fto-schedule}`) are repurposed as we absorb their concepts; orphans deleted in the Segment C cleanup sweep.
- **Role model (locked in Segment A.1).** Training writers = `admin | supervision_admin | fto_coordinator | is_training_supervisor=true`. The `is_training_supervisor` boolean on `profiles` is additive to `role`; at most one profile carries it at a time (partial unique index). Generic `supervision` is **read + sign-only** in Training. `detective` is **read-only scoped to DITs they're actively paired with**. Initial Training Supervisor: Sgt. Amanda McPherson (assigned via the DIT Files page header widget). When the Training Supervisor seat is vacant, Supervision Admin is the fallback signer at that step.
- **Survey / VARK (Path B).** Custom scenario-based questions authored in-house; scored for Visual / Aural / Read-write / Kinesthetic. Results visible to writers only; DIT sees a thank-you screen.
- **PTO hybrid (Route 1).** Adopt PBLE scenarios, journal-as-CTR-adjacent, and Board Review elements without replacing `weekly_training_sessions`. Six seed PBLEs: 1 Crime Scene + 2 Subpoena + 3 Search Warrant.
- **Quiz model.** Non-gating diagnostic knowledge quizzes replace the binder's "topic coverage" 3-investigator-signoff grid. Score thresholds: >=80% green (no alert), 79-61% amber (notify FTO Coordinator), <=60% red (notify FTO Coordinator **and** Training Supervisor).
- **Journal.** Required daily. Day-2 missed: gentle in-app nudge to DIT. Day-3+: notification to paired FTO. All flags bypassed while DIT is in `suspended` status; counter resets on return. Write-days = any day the DIT is on active duty (weekday baseline; adjust per `fto_pairings` + call-outs).
- **Remedial extensions.** First remedial adds 14 days to `expected_graduation_date`. Each subsequent remedial adds 7 days. LT or Capt may override the extension value at sign time (0-60 range, stored with `extension_override_by`).
- **Absence / suspended (new workflow).** New `dit_records.status` value `suspended`. New table `dit_absence_records` with kinds `illness | oji | bereavement | personal | sick` (where `sick` = single-day call-out, `illness` = extended/doctor-ordered). FTO documents; FTO Coordinator and Training Supervisor acknowledge (signature chain is acknowledgment-only, no reject path). While suspended: quiz deadlines pause, overlapping weekly evals auto-N/A, journal flags bypass, schedule grid renders paused. On close, `days_missed` auto-extends `expected_graduation_date` (audited separately from remedials).
- **Program config.** Tunable numbers (extension days, quiz thresholds, journal flag windows, survey expiry) live in `training_program_config` (single-row). Editable by training writers only.
- **Conventions** (set in Segment A, reused everywhere):
  - Server actions for form submit flows. Route handlers under `src/app/api/training/*` for fetches and signer endpoints.
  - Typed action errors: `{ ok: false, code: 'PROFILE_NOT_FOUND' | 'DUPLICATE_BADGE' | ..., message }`.
  - RLS per table: read-scope by role via `src/lib/training/api-auth.ts` helpers; writes via server actions (service role) where elevated. Write gates use `isTrainingWriter(profile)`.
  - Client UI: shadcn/ui + existing design tokens (`bg-bg-app`, `text-text-primary`, `border-border-subtle`). No new color system.
  - Emails: keep `logTrainingEmailPreview` stub across Segments A-D; wire a real provider in Segment E.

---

## 2. Data model (full target)

```mermaid
flowchart LR
  profiles --> dit_records
  dit_records --> dit_surveys
  dit_records --> dit_milestones
  dit_records --> fto_pairings
  fto_pairings --> weekly_training_sessions
  weekly_training_sessions --> weekly_competency_scores
  weekly_training_sessions --> unobserved_competencies
  weekly_training_sessions --> deficiency_forms
  deficiency_forms --> deficiency_form_actions
  fto_pairings --> training_activity_exposures
  training_activity_templates --> training_activity_exposures
  dit_records --> case_assignments
  dit_records --> call_out_logs
  document_signatures --> signature_events
  weekly_training_sessions --> document_signatures
  deficiency_forms --> document_signatures
  equipment_checkoffs --> document_signatures
  completion_certificates --> document_signatures
  fto_feedback_surveys --> document_signatures
  training_documents --- training_document_categories
```

### New tables (by segment introduced)

| Segment | New tables / infra |
|---|---|
| A | `dit_surveys` (token, status, `expires_at`, `learning_style jsonb`, `scores jsonb`, `narrative text`) |
| A.1 | `profiles.is_training_supervisor` column + partial unique index + `is_training_writer()` RPC |
| B | `document_signatures` (polymorphic: `doc_type`, `doc_id`, `routing_order text[]`, `current_step`, `current_signer_role`, `status`), `signature_events` (per-signer: image base64, timestamp, ip, device, biometric method), `dit_absence_records`, `dit_records.status += 'suspended'`, `dit_records.expected_graduation_date`, `training_program_config` (single-row), `dit_survey_questions` + `dit_survey_options` + `dit_survey_responses` (VARK) |
| C | `case_assignments`, `call_out_logs`, `equipment_checkoffs`, `training_quizzes` + `training_quiz_questions` + `training_quiz_options` + `training_quiz_attempts` + `training_quiz_attempt_answers`, `dit_journal_entries` + `dit_journal_reviews`, `fto_ctr_entries`, `deficiency_forms.extension_days` + `extension_override_by` |
| D | `training_documents`, `training_document_categories`, `training_resources`; Supabase storage bucket `training-documents`; `pto_pbles` + `pto_pble_artifacts`; `pto_board_reviews` + `pto_board_review_votes` |
| E | `completion_certificates`, `fto_feedback_surveys`, `fto_feedback_responses` |

### Retirements

- **Segment C:** drop `evaluations` + `evaluation_private_notes` after an audit pass. Preserve a read-only SQL view `v_legacy_evaluations` for ~30 days before final drop.

---

## 3. Segment index

| Segment | Prompts | Ship goal | Status |
|---|---|---|---|
| A | 1, 2 | Shell + onboarding (profile + survey stub) | Shipped |
| A.1 | — | Role model patch: `is_training_supervisor` flag + access helper rewrite | Shipped |
| B | 3, 4, 4b, 12 (foundation only) | Active DITs grid + DIT file detail + signature core + absence/suspended workflow + VARK survey delivery | Not started |
| C | 5, 10, 10b, 11 | Weekly Eval (chain adds LT) + Deficiency (tiered extensions) + Quizzes (tiered alerts) + Journal + FTO CTR + legacy retirement | Not started |
| D | 6, 7, 8, 9 | Activity, Cases/Call-Outs, Schedule grid, Documents/Resources, PBLEs (6 seeds), Board Review | Not started |
| E | 13, 14 + cleanup | Graduation cert (chain: FTO Coord -> Training Sup -> LT -> Capt) + FTO feedback + Training Settings (McPherson assignment widget) + delete orphans | Not started |

Prompt 12 is deliberately split: foundation in B, UX polish + PDF in C.

---

## 4. Segment A — Shell + Onboarding (Prompts 1-2)

**Goal:** replace `/training` with a new 5-section landing; build the Onboarding section (Create Profile real, Survey + Meeting Brief as shell).

Files to add:

- `src/app/(dashboard)/training/layout.tsx` - training sub-nav chrome.
- `src/app/(dashboard)/training/page.tsx` - new 5-section landing (Onboarding, Active DIT Files, Documents, Schedule, Resources). Replaces legacy hub re-export.
- `src/app/(dashboard)/training/{dit-files,schedule,resources,settings}/page.tsx` - placeholder pages rendering section-card shells.
- `src/components/training/shell/{training-subnav.tsx,section-card.tsx}`.
- `src/components/training/onboarding/{create-profile-modal.tsx,survey-status-card.tsx,meeting-brief-card.tsx,onboarding-panel.tsx}`.
- `src/app/(dashboard)/training/actions.ts` - add `createDitOnboardingAction(input)`.
- `supabase/migrations/<ts>_dit_surveys.sql` - `dit_surveys` + RLS.
- API stubs:
  - `POST /api/training/dit-records`
  - `GET /api/training/dit-records/[id]/survey-status`
  - `POST /api/training/dit-records/[id]/resend-survey`
- `src/components/dashboard/nav-config.ts` - update training flyout children to new routes.

Deferred from Segment A:

- Public `/survey/[token]` page and full survey question set.
- Real email sending (stays on `logTrainingEmailPreview`).
- Auth-user provisioning from Create Profile; must already exist as a profile (error `PROFILE_NOT_FOUND` otherwise).

Access for Onboarding panel: `isTrainingWriter(profile)` from `src/lib/training/access.ts` (admin / supervision_admin / fto_coordinator / Training Supervisor). Generic `supervision` is **not** a writer after Segment A.1.

Detailed sub-plan of record: `.cursor/plans/training_overhaul_prompts_1-2_019f5d5d.plan.md`.

---

## 4.1 Segment A.1 — Role model patch (shipped)

Small follow-up to Segment A that splits the training supervision tier before Segment B starts building on it.

- Migration `20260425140000_training_supervisor_flag.sql`:
  - `ALTER TABLE profiles ADD COLUMN is_training_supervisor boolean NOT NULL DEFAULT false`.
  - Partial unique index `WHERE is_training_supervisor = true` (at most one).
  - `is_training_writer()` SQL helper for later RLS.
- `src/types/profile.ts` gains `is_training_supervisor: boolean`.
- `src/lib/training/access.ts` rewritten:
  - `isTrainingWriter(profile)` — new profile-aware write gate.
  - `canManageOnboarding(profile)`, `canToggleDitStatus(profile)`, `canEditProgramConfig(profile)` — profile-aware.
  - `canSignAsTrainingSupervisor(profile)` — true if flagged or `supervision_admin` (fallback).
  - `trainingFullRead(role)` and `supervisionPlus(role)` retained for legacy read-only callsites.
- Segment A callsites migrated to profile-aware helpers.

Initial assignment of Sgt. Amanda McPherson as Training Supervisor is done via the DIT Files page header widget built in Segment B (not seeded in the migration, because her profile row may not exist at migration time across environments).

---

## 5. Segment B — DIT roster, detail, signature core, absence workflow (Prompts 3, 4, 4b, 12-foundation)

### Prompt 3 - Active DIT Files grid

- Page: `src/app/(dashboard)/training/dit-files/page.tsx` (replaces Segment-A placeholder).
- `src/components/training/files/dit-grid.tsx` - server-side fetch via new `fetchDitFilesOverview()` in `src/lib/training/queries.ts`. Computes status (green/amber/red/gray) from `avg_score`, coaching flag, and `unobserved_competencies` counts.
- `src/components/training/files/dit-tile.tsx` - tile + FTO contact tooltip. Tiles for DITs in `suspended` status render with a distinct paused treatment.
- Page header includes `src/components/training/files/training-supervisor-widget.tsx` — shows current Training Supervisor name (or "Vacant"); admins / supervision admins / fto_coordinator / current Training Supervisor can reassign via a dropdown of eligible `supervision` profiles. Calls a server action that flips `profiles.is_training_supervisor` (partial unique index enforces singleton).

### Prompt 4 - DIT file detail + Overview tab

- Routes: `src/app/(dashboard)/training/dit-files/[id]/page.tsx` and `layout.tsx` (tab chrome).
- Tabs driven by `?tab=overview|weekly|activity|cases|call-outs|notes|absences`.
- Overview tab reads `weekly_competency_scores`, `unobserved_competencies`, `deficiency_forms`, `dit_milestones`, `expected_graduation_date`.
- Status banner shows current `dit_records.status` (active / suspended / on_hold / graduated / separated) with a "Document absence" / "Suspend" action visible only to training writers.
- `src/lib/training/scoring.ts` - trend arrow, trajectory, on-track-for-graduation helpers (pure functions).

### Prompt 4b - Absence / Suspended Status workflow (new)

- Migration: `dit_absence_records` (id, dit_record_id FK, start_date, end_date nullable, kind enum `illness|oji|bereavement|personal|sick`, description text, status `draft|submitted|acknowledged|closed`, originated_by, timestamps). Adds `'suspended'` to `dit_records.status` check constraint. Adds `dit_records.expected_graduation_date date`.
- Signature routing: `FTO -> FTO Coordinator -> Training Supervisor` (acknowledgment, not approval — no reject path).
- UX on DIT file detail `?tab=absences`:
  - List of absences with status, kind, date range, days counted.
  - "Document absence" modal — FTO or writer. Kind, start/end (end optional), short description. On submit: creates record, pre-signs FTO step, queues Coordinator + Training Supervisor.
  - Coordinator acknowledgment screen includes an inline "Also suspend DIT" checkbox (optional).
  - "Close absence" action: writers or originating FTO. Sets `end_date` if null, status `closed`, computes `days_missed`, extends `expected_graduation_date` by that count, and (if DIT was suspended) flips status back to `active`.
- Downstream effects:
  - Weekly eval tab auto-marks sessions overlapping an acknowledged/closed absence as "N/A — DIT absent"; those sessions don't count in score history.
  - Quiz deadlines shift by absence duration (computed at read time, not stored).
  - Journal missed-day counter suppresses during suspension, resets on return.
  - Schedule grid (Segment D) renders suspended weeks in a desaturated paused treatment.

### Prompt 12 foundation (signatures)

- Migration: `document_signatures` + `signature_events` + RLS.
- `src/components/training/signatures/signature-pad.tsx` - HTML5 Canvas client component. Add `signature_pad.js` only if stroke smoothness is insufficient; don't pull it preemptively.
- `src/lib/training/signatures.ts` - `routingRules`, `createSignatureRoute(docType, docId, context)`, `recordSignature(...)`, `advanceRouting(...)`.
- API routes:
  - `POST /api/training/signatures/[id]/sign`
  - `GET /api/training/signatures/queue`
  - `GET /api/training/signatures/[id]/audit-trail`
- `src/components/training/signatures/signature-queue.tsx` - shown on `/training/settings` as "My signature inbox"; surfaced via `NotificationBell` in Segment C.

Explicitly deferred from Segment B to Segment C cap: biometric gate (Face ID / Touch ID / badge PIN prompt) and PDF watermark generation.

### Prompt 2b - VARK survey (delivered in Segment B alongside signature core)

- Public `/survey/[token]` page (no auth; token gates access). Scenario-based questions with up to 4 weighted options per question (one per V/A/R/K). Submit computes per-style scores and optional short narrative.
- Tables: `dit_survey_questions`, `dit_survey_options`, `dit_survey_responses`. Extend `dit_surveys` with `scores jsonb` and `narrative text`.
- Results visible to training writers only on the Onboarding / DIT file screens; DIT sees a thank-you page on submit.
- Seed ~12 questions authored in-house (content deliverable tracked separately).

---

## 6. Segment C — Weekly Eval, Deficiency, legacy retirement (Prompts 5, 10, 11)

### Prompt 10 - Weekly Evaluation form + signature

- Absorb `src/components/training/weekly-evaluation-form.tsx` into `src/components/training/weekly/eval-form.tsx`. Keep draft/submit endpoints at `/api/training/sessions/[id]/save` and `/submit`, then chain into signature core.
- Signature chain: `FTO -> FTO Coordinator -> Training Supervisor -> LT` (final at LT — binder requirement).
- Absence-aware: if any calendar day in the eval week falls inside an acknowledged `dit_absence_records` window, the eval is auto-flagged "N/A — DIT absent" and excluded from score history.
- `src/lib/training/validation.ts` - 20-competency rules (all scored or not-observed; 1/2/5 require <=300 char explanation).

### Prompt 10b - Diagnostic Quizzes (non-gating) + Journal (new)

- Quiz tables: `training_quizzes`, `training_quiz_questions`, `training_quiz_options`, `training_quiz_attempts`, `training_quiz_attempt_answers`. Writers author; DIT attempts; score computed on submit.
- Thresholds: >=80% green; 79-61% amber -> notification to FTO Coordinator; <=60% red -> notification to **both** FTO Coordinator and Training Supervisor. Quizzes are **non-gating** (score never blocks progression; it's a diagnostic signal).
- Replaces the binder's "topic coverage" 3-senior-investigator-signoff grid.
- Journal tables: `dit_journal_entries` (dit_record_id, entry_date, body, created_at) + `dit_journal_reviews` (entry_id, reviewer_id, notes, created_at). FTO Coordinator reviews (binder had Sgt; FTO Coordinator now owns).
- Missed-day logic (runs on schedule tick / on page load):
  - 2 consecutive missed write-days -> in-app nudge on DIT's own dashboard.
  - 3+ missed write-days -> notification to paired FTO.
  - Suspended status bypasses both; counter resets on return.
- FTO CTR: `fto_ctr_entries` captures FTO's own daily coaching notes (distinct from the DIT journal). Visible to FTO, FTO Coordinator, Training Supervisor.

### Prompt 5 - Weekly Eval tab (history)

- Tab inside DIT file detail; reads `weekly_training_sessions` by `dit_record_id`.
- Signature chain display reads `document_signatures` + `signature_events`.
- Thin wrappers at `/api/training/weekly-evals/*` for external doc parity over the existing `sessions/*` API.

### Prompt 11 - Deficiency form + escalation

- Absorb `src/components/training/deficiency-form.tsx` + `deficiency-coordinator-view.tsx` into `src/components/training/deficiency/*`.
- Signature routing (`FTO -> FTO Coordinator -> Training Supervisor -> LT`) via Segment B core.
- Extension tiering: add `deficiency_forms.extension_days integer NOT NULL DEFAULT 14` and `extension_override_by uuid REFERENCES auth.users(id)`. At LT sign-time UI: default is 14 for DIT's first remedial, 7 for subsequent; LT or Capt may override via an "Override" affordance (0-60 range, server-validated). On LT sign, apply `extension_days` to `dit_records.expected_graduation_date` additively. Audit trail preserves each remedial's `extension_days` independently.
- Escalation uses existing `/api/training/deficiency-forms/[id]/{actions,escalate,schedule-meeting}`.

### Legacy retirement (end of Segment C)

- Delete: `src/components/training/training-view.tsx`, `training-evaluation-modal.tsx`; drop `evaluations` and `evaluation_private_notes` tables (after view-preserve step); keep `training-stamps.tsx` (reusable).
- Delete the legacy hub re-export routes.
- Update `src/lib/admin/mock-data-service.ts` to stop seeding legacy `evaluations`.

---

## 7. Segment D — Activity / Cases / Schedule / Docs (Prompts 6-9)

### Prompt 6 - Activity Sheet tab

- Reads `training_activity_exposures` + `training_activity_templates`.
- `src/lib/training/activity-progress.ts` for exposure math.
- `GET /api/training/dit-records/[id]/activity-exposures` and `/activity-progress`.

### Prompt 7 - Case List + Call-Out tabs

- New tables `case_assignments`, `call_out_logs` (minimal: `dit_record_id`, refs/metadata, timestamps, off-duty flag). Stats computed server-side; off-duty flag surfaces comp-time eligibility.

### Prompt 8 - 10-Week Schedule grid

- Reads `fto_pairings` + `weekly_training_sessions`.
- **Decision to confirm at segment kickoff:** FTO color stored on `profiles.fto_color` (column add) vs hashed from FTO id client-side. Pick one and stick.
- Surfaces at `/training/schedule` (global) and `/training/dit-files/[id]?tab=schedule` (per DIT).

### Prompt 9 - Documents & Resources

- New tables + Supabase storage bucket `training-documents` with RLS and signed-URL downloads.
- `/training/resources` renders both sections. PDF viewer via `react-pdf`; fallback to "Open in new tab" if integration is heavy — pick per-PR.

### PTO hybrid additions (PBLEs + Board Review)

- `pto_pbles` (id, dit_record_id, phase, scenario_kind `crime_scene|subpoena|search_warrant`, title, rubric jsonb, assigned_at, due_at, status) + `pto_pble_artifacts` (file uploads via `training-documents` bucket).
- Six seed PBLE scenarios: 1 Crime Scene + 2 Subpoena + 3 Search Warrant. Rubric content authored in-house.
- `pto_board_reviews` + `pto_board_review_votes` for phase-end panel reviews (optional Segment D ship; may defer to E if scope presses).

---

## 8. Segment E — Graduation, feedback, cleanup (Prompts 13-14)

### Prompt 13 - Graduation trigger + certificate

- `completion_certificates` table.
- PDF generation server-side via `pdf-lib` using signature images from `signature_events`.
- Routing: `FTO Coordinator -> Training Supervisor -> LT -> Capt` through signature core (final at Capt).
- Equipment Check-Off routing also lives here as a related document: `FTO Coordinator -> Training Supervisor -> LT` (final at LT).
- Auto-trigger hook on week-10 session submit; missing competencies branch to deficiency form instead.
- Expected graduation date respects accumulated remedial extensions + absence extensions recorded on `dit_records.expected_graduation_date`.

### Prompt 14 - FTO Feedback survey

- `fto_feedback_surveys` + `fto_feedback_responses`.
- DIT-facing form; Coordinator/Sgt dashboard with aggregates; FTO-facing anonymized view (no DIT names or raw comments).

### Training Settings page

- `/training/settings` (writers only).
- Training Supervisor assignment (mirrors the DIT Files header widget but with history/audit).
- `training_program_config` editor: extension default days (14 / 7), quiz thresholds (80 / 60), journal flag windows (2 / 3), survey expiry (7).
- Email template preview links.
- Signature inbox entry point.

### Final cleanup

- Delete any remaining dead re-export routes, orphaned components, and unused email templates.
- Audit `src/components/dashboard/nav-config.ts` so the Training flyout reflects only the new routes.
- Decide fate of `src/app/(dashboard)/training/dit-dashboard/page.tsx`: absorb into `/training/dit-files/[id]` or keep as DIT-role landing.
- Wire a real email provider for the training notification stub.

---

## 9. Absorb / Retire / Keep (existing training files)

| File | Decision | Segment |
|---|---|---|
| `src/app/(dashboard)/training/training-hub-page.tsx` | Retire | C cleanup |
| `src/app/(dashboard)/training/{onboarding,dit-records,dit-evaluations,fto-schedule}/page.tsx` | Retire (routes repurposed) | C cleanup |
| `src/app/(dashboard)/training/dit-dashboard/page.tsx` | Keep or absorb | E (decide) |
| `src/app/(dashboard)/training/actions.ts` | Absorb (extend; rename some exports) | A-E |
| `src/components/training/training-view.tsx` | Retire | C cleanup |
| `src/components/training/training-enroll-modals.tsx` | Retire (replaced by create-profile-modal) | A |
| `src/components/training/training-evaluation-modal.tsx` | Retire (legacy evals going away) | C cleanup |
| `src/components/training/training-dit-drawer.tsx` | Retire (DIT file detail page replaces) | B |
| `src/components/training/training-pairing-drawer.tsx` | Absorb into pairing edit page | D |
| `src/components/training/weekly-evaluation-form.tsx` | Absorb -> `weekly/eval-form.tsx` | C |
| `src/components/training/deficiency-form.tsx` | Absorb -> `deficiency/form.tsx` | C |
| `src/components/training/deficiency-coordinator-view.tsx` | Absorb -> `deficiency/coordinator-inbox.tsx` | C |
| `src/components/training/activity-logger.tsx` | Absorb -> `activity/logger.tsx` | D |
| `src/components/training/activity-list-summary.tsx` | Absorb -> `activity/list-summary.tsx` | D |
| `src/components/training/dit-dashboard-view.tsx` | Absorb into DIT file detail tabs | B/D |
| `src/components/training/training-stamps.tsx` | Keep (rename to `shared/stamps.tsx`) | A |
| `src/lib/training/queries.ts` | Keep + extend | A-E |
| `src/lib/training/api-auth.ts` | Keep (extend with signer-role checks) | B |
| `src/lib/email/templates/training/*` | Keep; add certificate / graduation / fto-feedback templates | E |
| `src/lib/email/training-notifications.ts` | Keep stub; wire real provider | E |
| `src/types/training.ts` | Keep; extend per segment | A-E |
| `src/app/api/training/sessions/*` | Keep (weekly eval pipeline) | C |
| `src/app/api/training/activities/*`, `activity-templates`, `competency-masters` | Keep | D |
| `src/app/api/training/deficiency-forms/*` | Keep | C |

---

## 10. Segment gates (done-when criteria)

Each segment merges to `main` only when:

- All new migrations applied locally + RLS tested against the 7 roles (`admin`, `supervision_admin`, `supervision`, `fto_coordinator`, `fto`, `detective`, `dit`).
- New routes return non-404 for authorized roles and 403 for unauthorized.
- Lint + typecheck clean.
- No references remain to files marked **Retire (this segment)** in the table above.
- This document is updated with any scope drift discovered during the segment.

---

## 11. Signature routing reference (master)

`sgt` as a routing step name is **retired** — replaced by `training_supervisor` throughout. Other Sergeants are read + sign-only and are not a routing step.

| Document | Route | Final signer |
|---|---|---|
| Weekly Eval | FTO -> FTO Coordinator -> Training Supervisor -> LT | LT |
| Equipment Check-Off | FTO Coordinator -> Training Supervisor -> LT | LT |
| Deficiency / Remedial | FTO -> FTO Coordinator -> Training Supervisor -> LT | LT |
| Completion Certificate | FTO Coordinator -> Training Supervisor -> LT -> CPT | CPT |
| FTO Feedback Survey | DIT (self) -> FTO Coordinator -> Training Supervisor | Training Supervisor (review) |
| DIT Absence Record | FTO -> FTO Coordinator -> Training Supervisor | Training Supervisor (acknowledgment) |

`canSignAsTrainingSupervisor(profile)` resolves the Training Supervisor step: `is_training_supervisor=true` OR `supervision_admin` (fallback when seat is vacant). All others fail the gate at that step.

Implemented in `src/lib/training/signatures.ts` (Segment B) as `routingRules[doc_type] -> string[]`; `document_signatures.routing_order` is the per-row snapshot so rule changes don't retroactively alter in-flight documents.
