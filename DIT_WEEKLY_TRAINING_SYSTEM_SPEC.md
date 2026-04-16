# DIT Weekly Training System Specification

**Project:** RCSO CID Portal - Detective in Training (DIT) Weekly Evaluation & Activity Tracking  
**Version:** 1.0  
**Date:** April 15, 2025  
**Status:** Ready for Implementation

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Key Principles](#key-principles)
3. [Data Models & Database Schema](#data-models--database-schema)
4. [User Roles & Permissions](#user-roles--permissions)
5. [Feature Flows](#feature-flows)
6. [UI/UX Specifications](#uiux-specifications)
7. [Implementation Notes](#implementation-notes)
8. [Cursor Build Prompts](#cursor-build-prompts)

---

## System Overview

### Purpose

Replace the physical weekly evaluation form with a unified digital system that:

- Tracks DIT activity exposures with real-time metadata (FTO, date, case/complaint number)
- Records competency scores (1-5) with mandatory explanations for extreme values
- Automatically identifies unobserved competencies and notifies DITs
- Provides optional deficiency escalation forms for coaching/intervention
- Maintains transparent audit trail for supervisory oversight

### Current Limitations (Being Addressed)

- **Activity Checklist:** Shows "2 exposures required" but no evidence of WHO, WHEN, or WHAT CASE
- **Weekly Evaluation:** 20 competency ratings with vague narrative fields (Strong Points/Improvements) that don't correlate to specific scores
- **N.O. & S.M.R. flags:** Repeated because no other place to document them
- **No trending:** Can't see week-to-week progress
- **Paper-based sign-offs:** Not scalable, no version control, lost documentation

### New System Features

✅ **Activity Exposure Logging** — Real-time entry with FTO, date, case/complaint #, role (observer/assistant/lead)  
✅ **Per-Competency Explanations** — All 1/2/5 scores require brief explanation  
✅ **Unobserved Auto-Alert** — Auto-message to DIT listing competencies not observed  
✅ **Live Progress Dashboard** — DIT sees weekly snapshot + trends  
✅ **Optional Deficiency Escalation** — FTO generates form only if coaching needed  
✅ **Calendar Integration** — Coordinator schedules meetings; escalation creates attendee invites  
✅ **Audit Trail** — All actions timestamped, versioned, searchable  

---

## Key Principles

1. **Score = Observation** — Ratings reflect only what was observed. Unobserved competencies are not rated.
2. **Explanation Required for Extremes** — Scores of 1, 2, or 5 MUST include brief explanation.
3. **Context Matters** — A score of 1 in week 2 is normal; a score of 1 in week 8 is a concern.
4. **Escalation is Optional** — FTO completes evaluation, then optionally generates deficiency form.
5. **Positive Recognition** — Scores of 5 auto-generate recognition notification to leadership.
6. **Transparent Coaching** — DIT sees when coaching is initiated; knows the plan.
7. **Supervisor Intelligence** — FTO Coordinator sees all 1s/2s/5s to spot patterns.

---

## Data Models & Database Schema

### 1. Training Activity Template

**Purpose:** Define which activities require how many exposures per phase.

```sql
CREATE TABLE training_activity_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,  -- e.g., "Scene Management", "Witness/Victim"
  required_exposures_phase_1 INT DEFAULT 0,
  required_exposures_phase_2 INT DEFAULT 0,
  required_exposures_phase_3 INT DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed data:
-- Death, Scene Sketch, Subpoena, Search Warrant, Scene Photos, Interview, 
-- Evidence Collection, Domestic Violence, Sexual Assault, DCS Referral,
-- Forensic Interview, Financial Crime, After Hours Call Out, Property Crimes,
-- Arrest, Phone Exam (2 exposures each, Phase 1)
-- Autopsy, Line Up, Child Death Review Board, CPIT, VAPIT Meeting, SART Meeting,
-- Emergency Request, Preservation Request (1 exposure each, Phase 1)
```

### 2. Training Activity Exposures

**Purpose:** Log each time a DIT is exposed to an activity.

```sql
CREATE TABLE training_activity_exposures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dit_record_id UUID NOT NULL REFERENCES dit_records (id) ON DELETE CASCADE,
  activity_template_id UUID NOT NULL REFERENCES training_activity_templates (id) ON DELETE RESTRICT,
  fto_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  exposure_date DATE NOT NULL,
  case_complaint_number TEXT,  -- Case # or complaint #
  role TEXT NOT NULL CHECK (role IN ('observer', 'assistant', 'lead')),
  duration_minutes INT,
  fto_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX training_activity_exposures_dit_record_id_idx 
  ON training_activity_exposures (dit_record_id);
CREATE INDEX training_activity_exposures_activity_template_id_idx 
  ON training_activity_exposures (activity_template_id);
CREATE INDEX training_activity_exposures_exposure_date_idx 
  ON training_activity_exposures (exposure_date);
```

### 3. Weekly Training Session

**Purpose:** Container for a week's work (evaluations, activity logs, etc.).

```sql
CREATE TABLE weekly_training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pairing_id UUID NOT NULL REFERENCES fto_pairings (id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'submitted', 'approved')
  ),
  submitted_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_pairing_week UNIQUE (pairing_id, week_start_date)
);

CREATE INDEX weekly_training_sessions_pairing_id_idx 
  ON weekly_training_sessions (pairing_id);
CREATE INDEX weekly_training_sessions_status_idx 
  ON weekly_training_sessions (status);
```

### 4. Weekly Competency Scores

**Purpose:** FTO's rating of each competency for the week (only if observed).

```sql
CREATE TABLE weekly_competency_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES weekly_training_sessions (id) ON DELETE CASCADE,
  competency_key TEXT NOT NULL,
  competency_label TEXT NOT NULL,
  category TEXT NOT NULL,
  score INT NOT NULL CHECK (score BETWEEN 1 AND 5),
  explanation TEXT,
  explanation_required BOOLEAN NOT NULL DEFAULT false,  -- True if score is 1, 2, or 5
  prior_week_score INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_session_competency UNIQUE (session_id, competency_key)
);

CREATE INDEX weekly_competency_scores_session_id_idx 
  ON weekly_competency_scores (session_id);
CREATE INDEX weekly_competency_scores_score_idx 
  ON weekly_competency_scores (score);
```

### 5. Competency Master (Reference)

**Purpose:** Static reference for all 20 competencies with grouping.

```sql
CREATE TABLE competency_masters (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  sort_order INT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed data (20 competencies grouped into 5 categories):
-- PROFESSIONALISM & DEMEANOR
-- KNOWLEDGE & PROCEDURES
-- INVESTIGATIVE CORE SKILLS
-- OPERATIONAL MANAGEMENT
-- INTERPERSONAL & SAFETY
```

### 6. Deficiency Forms

**Purpose:** Optional escalation form for coaching/intervention.

```sql
CREATE TABLE deficiency_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pairing_id UUID NOT NULL REFERENCES fto_pairings (id) ON DELETE CASCADE,
  weekly_session_id UUID NOT NULL REFERENCES weekly_training_sessions (id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,  -- FTO
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    status IN ('submitted', 'coordinator_reviewing', 'coaching_active', 'escalated_to_sgt', 'escalated_to_lt', 'resolved')
  ),
  priority_level TEXT NOT NULL DEFAULT 'routine' CHECK (
    priority_level IN ('routine', 'urgent')
  ),
  competencies_flagged JSONB NOT NULL,  -- Array of {competency_key, score, fto_recommendation}
  additional_notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX deficiency_forms_pairing_id_idx ON deficiency_forms (pairing_id);
CREATE INDEX deficiency_forms_status_idx ON deficiency_forms (status);

-- Example JSONB structure:
-- [
--   {
--     "competency_key": "knowledge_of_laws",
--     "competency_label": "Knowledge of Laws/Criminal Procedures",
--     "score": 2,
--     "fto_recommendation": "DIT needs structured review of warrantless arrest exceptions. Recommend 1-on-1 session with case law examples."
--   },
--   {
--     "competency_key": "time_management",
--     "competency_label": "Time Management",
--     "score": 2,
--     "fto_recommendation": "Struggled with case prioritization. Recommend practice with ongoing cases."
--   }
-- ]
```

### 7. Deficiency Form Actions (Escalation Trail)

**Purpose:** Track coaching/escalation progress.

```sql
CREATE TABLE deficiency_form_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deficiency_form_id UUID NOT NULL REFERENCES deficiency_forms (id) ON DELETE CASCADE,
  action_level TEXT NOT NULL CHECK (
    action_level IN ('coordinator', 'fto_sgt', 'lt')
  ),
  actor_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  action_type TEXT NOT NULL CHECK (
    action_type IN ('coordinator_review', 'scheduled_meeting', 'escalate_to_sgt', 'escalate_to_lt', 'resolve')
  ),
  action_notes TEXT,
  calendar_meeting_id TEXT,  -- External calendar event ID
  meeting_date DATE,
  meeting_attendees TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX deficiency_form_actions_deficiency_form_id_idx 
  ON deficiency_form_actions (deficiency_form_id);
```

### 8. Excellence Recognition Notifications

**Purpose:** Auto-generated when score of 5 is recorded.

```sql
CREATE TABLE excellence_recognitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES weekly_training_sessions (id) ON DELETE CASCADE,
  competency_key TEXT NOT NULL,
  competency_label TEXT NOT NULL,
  dit_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  fto_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  explanation TEXT NOT NULL,
  sent_to_recipients TEXT[] NOT NULL,  -- FTO Coordinator, FTO Sgt, Lt
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX excellence_recognitions_dit_user_id_idx 
  ON excellence_recognitions (dit_user_id);
```

### 9. Unobserved Competency Tracking

**Purpose:** Track competencies not observed this week; auto-alert DIT.

```sql
CREATE TABLE unobserved_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES weekly_training_sessions (id) ON DELETE CASCADE,
  competency_key TEXT NOT NULL,
  competency_label TEXT NOT NULL,
  days_since_last_observed INT,
  dit_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_session_competency_unobs UNIQUE (session_id, competency_key)
);

CREATE INDEX unobserved_competencies_session_id_idx 
  ON unobserved_competencies (session_id);
```

---

## User Roles & Permissions

### Existing Roles (Extended)

- `**dit**` — Detectives in Training. Can view own training record, activities, scores, coaching status.
- `**fto**` — Field Training Officers. Can log activities, submit weekly evaluations, generate deficiency forms.
- `**fto_coordinator**` — Oversees all DIT training. Reviews deficiency forms, schedules meetings, escalates.
- `**fto_sergeant**` — NEW ROLE (add to profiles). Receives escalations; reviews coaching effectiveness.
- `**supervision**` / `**supervision_admin**` — Can view all training records; approves weekly evals.
- `**admin**` — Full access.

### RLS Policies (To Implement)

```sql
-- training_activity_exposures
-- SELECT: DIT (own), FTO (assigned pairing), coordination+ (all)
-- INSERT: FTO (assigned pairing), coordination+
-- UPDATE: FTO (own week), coordination+

-- weekly_training_sessions
-- SELECT: DIT (own), FTO (assigned), coordination+ (all)
-- UPDATE: FTO (draft status), coordination+ (any)

-- weekly_competency_scores
-- SELECT: DIT (own), FTO (assigned), coordination+ (all)
-- INSERT/UPDATE: FTO (own week), coordination+ (any)

-- deficiency_forms
-- SELECT: DIT (own), FTO (own), coordination+ (all)
-- INSERT: FTO (own pairing)
-- UPDATE: FTO (draft), coordinator+

-- deficiency_form_actions
-- SELECT: Relevant level + (coordinator+)
-- INSERT: Coordinator+
```

---

## Feature Flows

### Flow 1: Activity Logging (Throughout Week)

**Who:** FTO or DIT (FTO primary)  
**When:** As activities happen or at end of day  
**Where:** Training Hub → Activity Log section

```
1. FTO clicks [+ LOG ACTIVITY]
2. Form opens:
   - Activity Type (dropdown from template)
   - Date (default: today)
   - FTO Name (auto-filled, can change if co-observing)
   - Case/Complaint # (free-form text)
   - Role: Observer / Assistant / Lead
   - Duration (optional)
   - Notes (optional)
3. FTO clicks [SAVE]
4. Activity logged; appears in week's activity list
5. System updates competency progress (e.g., "Interview skills: 1 of 2 exposures")
```

**Display:** Shows "Death Investigation: ✓ 2/2 complete (Smith 3/15, Jones 3/18)"

---

### Flow 2: Weekly Competency Evaluation

**Who:** FTO  
**When:** End of week (Friday)  
**Where:** Training Hub → Weekly Evaluation section

```
1. FTO clicks [START WEEKLY EVALUATION] for DIT
2. Form opens, grouped by competency category
3. For each competency:
   - Select score 1-5 OR leave blank (not observed)
   - If score is 1, 2, or 5:
     - Explanation field appears (red border, required)
     - FTO types brief explanation
   - If score is blank:
     - System marks as "not observed"
     - Competency skipped
4. FTO reviews unobserved list at bottom:
   - Auto-generated list of competencies not rated
5. FTO clicks [SAVE DRAFT] to save progress
6. FTO clicks [SUBMIT EVALUATION] when complete
7. Evaluation submitted; form locked
8. Bottom of form shows:
   - [GENERATE DEFICIENCY FORM] button (always visible)
   - FTO can click later if needed
```

**Display (Score 2 Example):**

```
Knowledge of Laws/Criminal Procedures: [2] (Required)
Explanation: "DIT struggled with search warrant exigent circumstances 
doctrine during 3/14 exercise. Misunderstood when exigent circumstances 
override warrant requirement. Will review with supervisor."
```

---

### Flow 3: Unobserved Competencies Auto-Alert

**Who:** System  
**When:** After weekly evaluation submitted  
**To:** DIT email + in-app notification

```
Subject: "Unobserved Training Activities — Week of 3/15/2025"

Hi Michael,

The following competencies were not observed during the week of 3/15-3/21. 
These should be prioritized for the upcoming week:

□ Interview Skills
  Required exposures: 2 total | 1 completed
  Last observed: 3/8/2025 with Smith
  [Log new exposure]

□ Crime Scene Management
  Required exposures: 2 total | 1 completed
  Last observed: 3/1/2025 with Jones
  [Log new exposure]

□ Self-Initiated Investigative Skills
  Required exposures: 1 total | 0 completed
  Last observed: Never
  [Log new exposure]

Discuss with your FTO (Smith, John) to schedule these exposures 
for next week.

---

System also tracks: "Days since last observed" in DIT's profile.
If competency not observed for 2+ weeks, coordinator gets alert.
```

---

### Flow 4: Optional Deficiency Form Generation

**Who:** FTO  
**When:** After evaluation submitted (optional)  
**Where:** Weekly Evaluation → [GENERATE DEFICIENCY FORM] button

```
1. FTO submits evaluation
2. FTO can optionally click [GENERATE DEFICIENCY FORM]
3. Modal opens: "Create Deficiency Form"
4. System shows: "Scores of 1, 2, or 5 recorded this week"
5. Form shows checkboxes for each flagged competency:
   ☐ Knowledge of Laws (Score: 2)
   ☐ Time Management (Score: 2)
   ☐ Interview Skills (Score: 5) — optional to include 5s
6. FTO selects which competencies need coaching
7. For each selected competency:
   - System pre-fills score + FTO's explanation
   - FTO can add/edit coaching recommendation:
     "DIT needs structured review of warrantless arrest exceptions. 
      Recommend 1-on-1 session with case law examples. Monitor next 2 weeks."
8. FTO sets priority: Routine / Urgent
9. FTO can add overall notes (optional)
10. FTO clicks [SUBMIT TO FTO COORDINATOR]
11. Form locked; sent to coordinator
12. FTO receives confirmation: "Deficiency form submitted"
```

---

### Flow 5: FTO Coordinator Review & Meeting Scheduling

**Who:** FTO Coordinator  
**When:** Receives form; reviews within 2 business days  
**Where:** Training Hub → Deficiency Forms queue

```
1. Coordinator sees: "New deficiency form: Anderson, M. - Week 3/15"
2. Coordinator clicks to open form
3. Coordinator reviews:
   - DIT name, FTO name, week
   - Competencies flagged (Knowledge of Laws 2, Time Management 2)
   - FTO's explanations + coaching recommendations
4. Coordinator types notes:
   "Reviewed activity log. Both deficiencies stem from early-stage 
    learning. Coaching is appropriate. Will meet with FTO to confirm plan 
    and discuss support for DIT."
5. Coordinator clicks [SCHEDULE MEETING WITH FTO]
6. Calendar integration opens:
   - Meeting type: "DIT Coaching Coordination"
   - Attendees: Coordinator, FTO (Smith, John)
   - Duration: 30 min
   - Proposed date/time: 3/24/2025, 10:00 AM
7. System creates calendar invite; sends to FTO's email
8. Coordinator sets status: [COACHING IN PROGRESS]
9. Coordinator sets target resolution date: 4/4/2025
10. Form saved; coordinator can edit if needed
```

---

### Flow 6: Escalation to FTO Sergeant

**Who:** FTO Coordinator  
**When:** After 2-3 weeks; deficiency not resolved  
**Where:** Deficiency Form → [ESCALATE TO FTO SGT] button

```
1. Coordinator reviews DIT's competency progress after 2 weeks
2. If no improvement: Coordinator prepares escalation
3. Coordinator adds escalation notes:
   "Coached 3/24 & 3/31. DIT showed improvement in Time Management 
    (now 3) but Knowledge of Laws still at 2. Recommend additional 
    structured review or consider FTO pairing adjustment."
4. Coordinator clicks [ESCALATE TO FTO SGT]
5. Coordinator selects FTO Sgt from dropdown
6. Coordinator proposes meeting:
   - Attendees: FTO Sgt, Coordinator, FTO, DIT
   - Duration: 1 hour
   - Topic: "DIT Competency Coaching Review"
7. System creates calendar invite; sends to all 4 attendees
8. Form status: [ESCALATED TO FTO SGT]
9. Escalation record created with coordinator's notes + meeting details
```

---

### Flow 7: FTO Sergeant Review & Final Decision

**Who:** FTO Sergeant  
**When:** After meeting with all parties  
**Where:** Deficiency Form → Escalation Details

```
1. FTO Sgt receives meeting invite + form summary
2. FTO Sgt attends meeting with Coordinator, FTO, DIT
3. Post-meeting, FTO Sgt documents decision:
   - Continue coaching (monitor)
   - Assign different FTO for this competency
   - Formal meeting required (document reasons)
   - Consider DIT removal or extended training
4. FTO Sgt records decision in system:
   - Action: [Selected from above]
   - Notes: [Required explanation]
5. Form status: [RESOLVED] or [ESCALATED TO LT] (if needed)
6. DIT is notified of decision via in-app message
```

---

## UI/UX Specifications

### Training Hub Landing Page

```
┌─ TRAINING HUB ─────────────────────────────────┐
│                                                 │
│ Welcome, Smith, John (FTO)                      │
│ Your DITs this week:                            │
│                                                 │
│ ┌─ Anderson, Michael (Week 4) ──────────────┐ │
│ │ Status: Weekly eval in progress            │ │
│ │ Activities logged: 6 of 8 planned          │ │
│ │ [CONTINUE EVAL]  [VIEW ACTIVITIES]         │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─ Brown, Jennifer (Week 2) ──────────────┐   │
│ │ Status: Awaiting weekly eval              │ │
│ │ Activities logged: 4 of 6 planned         │ │
│ │ [START EVAL]  [VIEW ACTIVITIES]           │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Activity Logging Interface

```
┌─ LOG ACTIVITY ─────────────────────────────────┐
│                                                 │
│ Activity Type: [Death Investigation ▼]         │
│ Progress: 1 of 2 exposures                     │
│                                                 │
│ Date: [3/21/2025]                              │
│ FTO Name: [Smith, John ▼] (auto-filled)        │
│ Case/Complaint #: [2024-0847]                  │
│ Role: ○ Observer  ○ Assistant  ○ Lead         │
│ Duration (min): [120]                          │
│                                                 │
│ Notes (optional):                              │
│ ┌───────────────────────────────────────────┐ │
│ │ First exposure. Observed scene management │ │
│ │ and evidence collection procedures.       │ │
│ └───────────────────────────────────────────┘ │
│                                                 │
│ [CANCEL]  [SAVE ACTIVITY]                      │
└─────────────────────────────────────────────────┘
```

### Weekly Evaluation Competency Card

```
┌─ PROFESSIONALISM & DEMEANOR ───────────────────┐
│                                                 │
│ General Appearance                              │
│ Score: [4]  |  Prior week: 4  |  Trend: →    │
│                                                 │
│ Attitude Toward Investigations                  │
│ Score: [3]  |  Prior week: 2  |  Trend: ↗    │
│                                                 │
│ Work Ethic                                      │
│ Score: [5]  |  Prior week: 4  |  Trend: ↗    │
│ Explanation (Required): ___________________    │
│                                                 │
│ Time Management                                 │
│ Score: [2]  |  Prior week: 3  |  Trend: ↘    │
│ Explanation (Required): ___________________    │
│ └─ "Struggled with case prioritization during │
│     Search Warrant (3/14). Improved by end     │
│     of week. Recommend continued practice."   │
│                                                 │
│ Relationships within CID/Department            │
│ Score: [ ]  (Not observed this week)           │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Evaluation Submission & Deficiency Form Option

```
┌─ WEEKLY EVALUATION SUMMARY ────────────────────┐
│                                                 │
│ DIT: Anderson, Michael | Week: 3/15-3/21      │
│ Competencies Rated: 18 of 20                   │
│ Not Observed: 2 (Interview Skills, Crime Scene)
│                                                 │
│ Scores of 1, 2, or 5: 4                        │
│ • Time Management: 2                           │
│ • Knowledge of Laws: 2                         │
│ • Work Ethic: 5                                │
│ • General Appearance: 5                        │
│                                                 │
│ ────────────────────────────────────────────  │
│ [SAVE DRAFT]  [SUBMIT EVALUATION]              │
│              [GENERATE DEFICIENCY FORM]        │
│                                                 │
│ ← [GENERATE DEFICIENCY FORM] always visible   │
└─────────────────────────────────────────────────┘
```

### Deficiency Form Creation

```
┌─ CREATE DEFICIENCY FORM ───────────────────────┐
│                                                 │
│ DIT: Anderson, Michael                         │
│ FTO: Smith, John                               │
│ Week: 3/15-3/21, 2025                          │
│                                                 │
│ SELECT COMPETENCIES REQUIRING FOLLOW-UP:       │
│ (From scores of 1, 2, or 5 this week)          │
│                                                 │
│ [✓] Knowledge of Laws (Score: 2)               │
│ [✓] Time Management (Score: 2)                 │
│ [ ] Work Ethic (Score: 5)                      │
│ [ ] General Appearance (Score: 5)              │
│                                                 │
│ COACHING RECOMMENDATIONS:                      │
│                                                 │
│ Knowledge of Laws (Score: 2)                   │
│ ┌──────────────────────────────────────────┐  │
│ │ "Structured review of warrantless arrest │  │
│ │  exceptions. Case law examples. Monitor  │  │
│ │  next 2 weeks."                          │  │
│ └──────────────────────────────────────────┘  │
│                                                 │
│ Time Management (Score: 2)                     │
│ ┌──────────────────────────────────────────┐  │
│ │ "Case prioritization practice exercises. │  │
│ │  Critical path vs. supportive steps."    │  │
│ └──────────────────────────────────────────┘  │
│                                                 │
│ PRIORITY: ○ Routine  ○ Urgent                  │
│                                                 │
│ ADDITIONAL NOTES (optional):                   │
│ ┌──────────────────────────────────────────┐  │
│ │                                          │  │
│ └──────────────────────────────────────────┘  │
│                                                 │
│ [CANCEL]  [SUBMIT TO FTO COORDINATOR]          │
└─────────────────────────────────────────────────┘
```

### DIT View of Weekly Results

```
┌─ YOUR WEEKLY EVALUATION ───────────────────────┐
│ Week: 3/15-3/21, 2025 | FTO: Smith, John      │
│                                                 │
│ ✓ EVALUATION SUBMITTED                         │
│                                                 │
│ COMPETENCY SCORES:                             │
│ ✓ General Appearance: 4 (was 4) →             │
│ ✓ Attitude: 3 (was 2) ↗                       │
│ ✓ Work Ethic: 5 ⭐ "Excellent"                │
│ ✓ Time Management: 2 (was 3) ↘                │
│   └─ "Struggled with prioritization. Work    │
│      in progress."                             │
│ ... (14 more)                                  │
│                                                 │
│ NOT OBSERVED THIS WEEK:                        │
│ • Interview Skills (Need 2; have 1)            │
│ • Crime Scene Management (Need 2; have 1)     │
│                                                 │
│ COACHING IN PROGRESS:                          │
│ Competencies: Knowledge of Laws, Time Mgmt    │
│ Status: FTO Coordinator coordinating           │
│ Meeting scheduled: 3/24/2025, 10:00 AM        │
│ Your FTO will send coaching plan details.     │
│                                                 │
│ [DOWNLOAD PDF]  [PRINT FOR SIGNATURE]         │
└─────────────────────────────────────────────────┘
```

---

## Implementation Notes

### Authentication & Authorization

- All endpoints require authenticated user with appropriate role
- RLS policies enforce row-level access (see Database Schema section)
- FTO can only log activities for assigned DITs (via pairing_id)
- DIT can only view own records

### Calendar Integration

- Use Supabase edge function to call Google Calendar API
- Create event with title, attendees, time zone, description
- Return `calendar_event_id` to store in deficiency_form_actions
- Retry logic for failed invites (queue via background job)

### Email Notifications

- **Activity logged:** No automatic email (in-app notification only)
- **Weekly eval submitted:** Coordinator gets notification
- **Unobserved competencies:** Auto-email to DIT + FTO CC
- **Deficiency form submitted:** Auto-email to Coordinator
- **Deficiency form escalated:** Email to FTO Sgt + attendees (with meeting link)
- **Excellence recognition:** Email to FTO Coordinator, FTO Sgt, Lt (FYI)

### Performance Considerations

- Cache competency master (20 items, static)
- Index on `pairing_id`, `status`, `score` for fast lookups
- Paginate deficiency form queue (10 items/page)
- Batch unobserved competency notifications (daily cron)

### Data Validation

- Score must be 1-5 or NULL
- If score in (1, 2, 5), explanation must not be empty
- Case/complaint # should be validated format (optional)
- FTO must exist in pairing before logging activity
- Session dates must be within phase dates

### Audit & Compliance

- All changes logged with actor_id, timestamp, action_type
- Deficiency form changes create version history
- Escalation notes immutable (append-only)
- PDF export includes signatures (placeholder for digital signature integration)

---

## Cursor Build Prompts

See section below.