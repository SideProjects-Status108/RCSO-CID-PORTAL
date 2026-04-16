# Cursor Build Prompts: DIT Weekly Training System

**Use these prompts sequentially in Cursor.** Each prompt is self-contained and includes full context.

---

## Prompt 1: Database Migrations & Schema

**Objective:** Create Supabase migrations for the new training system tables.

```
CONTEXT:
This is the RCSO CID Portal built with Next.js 14 (app router), Supabase, and TypeScript.
The application has existing tables for auth.users, profiles, fto_pairings, evaluations, 
dit_records, and dit_milestones.

TASK:
Create a comprehensive Supabase migration file that sets up the new DIT Weekly Training System.
The migration should include:

1. training_activity_templates table
   - id (UUID, primary key)
   - activity_name (TEXT, unique)
   - category (TEXT) — e.g., "Scene Management", "Witness/Victim"
   - required_exposures_phase_1, _phase_2, _phase_3 (INT, default 0)
   - description (TEXT)
   - created_at, updated_at (TIMESTAMPTZ)

2. training_activity_exposures table
   - id (UUID, primary key)
   - dit_record_id (UUID, FK to dit_records, CASCADE)
   - activity_template_id (UUID, FK to training_activity_templates, RESTRICT)
   - fto_id (UUID, FK to auth.users, CASCADE)
   - exposure_date (DATE)
   - case_complaint_number (TEXT)
   - role (TEXT, CHECK: 'observer', 'assistant', 'lead')
   - duration_minutes (INT)
   - fto_notes (TEXT)
   - created_at, updated_at (TIMESTAMPTZ)
   - Indexes on: dit_record_id, activity_template_id, exposure_date

3. weekly_training_sessions table
   - id (UUID, primary key)
   - pairing_id (UUID, FK to fto_pairings, CASCADE)
   - week_start_date (DATE)
   - week_end_date (DATE)
   - status (TEXT, CHECK: 'draft', 'submitted', 'approved')
   - submitted_by (UUID, FK to auth.users, nullable)
   - submitted_at (TIMESTAMPTZ)
   - approved_by (UUID, FK to auth.users, nullable)
   - approved_at (TIMESTAMPTZ)
   - created_at, updated_at (TIMESTAMPTZ)
   - Unique constraint on (pairing_id, week_start_date)
   - Indexes on: pairing_id, status

4. competency_masters table (reference/static data)
   - key (TEXT, primary key)
   - label (TEXT, unique)
   - category (TEXT) — one of: PROFESSIONALISM & DEMEANOR, KNOWLEDGE & PROCEDURES, 
     INVESTIGATIVE CORE SKILLS, OPERATIONAL MANAGEMENT, INTERPERSONAL & SAFETY
   - sort_order (INT)
   - description (TEXT)
   - created_at (TIMESTAMPTZ)
   
   Seed with 20 competencies from the physical training manual:
   - General Appearance
   - Acceptance of Feedback
   - Attitude Toward Investigations
   - Knowledge of Policies/Procedures
   - Knowledge of Laws/Criminal Procedures
   - Response to Initial Investigation
   - Crime Scene Management
   - Time Management
   - Stress Management
   - General Investigative Skills
   - Interview Skills
   - Report Writing/Documentation
   - Computer/Data Entry
   - Problem Solving/Decision Making
   - Self-Initiated Investigative Skills
   - Innovative Investigative Skills
   - Officer Safety
   - Relationship with Citizens
   - Relationships within CID/Department
   - Work Ethic

5. weekly_competency_scores table
   - id (UUID, primary key)
   - session_id (UUID, FK to weekly_training_sessions, CASCADE)
   - competency_key (TEXT)
   - competency_label (TEXT)
   - category (TEXT)
   - score (INT, CHECK: 1-5)
   - explanation (TEXT)
   - explanation_required (BOOLEAN, default false)
   - prior_week_score (INT)
   - created_at, updated_at (TIMESTAMPTZ)
   - Unique constraint on (session_id, competency_key)
   - Index on: session_id, score

6. unobserved_competencies table
   - id (UUID, primary key)
   - session_id (UUID, FK to weekly_training_sessions, CASCADE)
   - competency_key (TEXT)
   - competency_label (TEXT)
   - days_since_last_observed (INT)
   - dit_notified_at (TIMESTAMPTZ)
   - created_at (TIMESTAMPTZ)
   - Unique constraint on (session_id, competency_key)
   - Index on: session_id

7. deficiency_forms table
   - id (UUID, primary key)
   - pairing_id (UUID, FK to fto_pairings, CASCADE)
   - weekly_session_id (UUID, FK to weekly_training_sessions, CASCADE)
   - created_by (UUID, FK to auth.users, RESTRICT)
   - created_at (TIMESTAMPTZ)
   - status (TEXT, CHECK: 'submitted', 'coordinator_reviewing', 'coaching_active', 
     'escalated_to_sgt', 'escalated_to_lt', 'resolved')
   - priority_level (TEXT, CHECK: 'routine', 'urgent', default 'routine')
   - competencies_flagged (JSONB) — array of {competency_key, score, fto_recommendation}
   - additional_notes (TEXT)
   - updated_at (TIMESTAMPTZ)
   - Indexes on: pairing_id, status

8. deficiency_form_actions table
   - id (UUID, primary key)
   - deficiency_form_id (UUID, FK to deficiency_forms, CASCADE)
   - action_level (TEXT, CHECK: 'coordinator', 'fto_sgt', 'lt')
   - actor_id (UUID, FK to auth.users, RESTRICT)
   - action_type (TEXT, CHECK: 'coordinator_review', 'scheduled_meeting', 
     'escalate_to_sgt', 'escalate_to_lt', 'resolve')
   - action_notes (TEXT)
   - calendar_meeting_id (TEXT)
   - meeting_date (DATE)
   - meeting_attendees (TEXT[])
   - created_at (TIMESTAMPTZ)
   - Index on: deficiency_form_id

9. excellence_recognitions table
   - id (UUID, primary key)
   - session_id (UUID, FK to weekly_training_sessions, CASCADE)
   - competency_key (TEXT)
   - competency_label (TEXT)
   - dit_user_id (UUID, FK to auth.users, CASCADE)
   - fto_user_id (UUID, FK to auth.users, CASCADE)
   - explanation (TEXT)
   - sent_to_recipients (TEXT[])
   - created_at (TIMESTAMPTZ)
   - Index on: dit_user_id

IMPORTANT:
- Add RLS (Row Level Security) enabled for all tables
- Create basic RLS policies that allow fto_coordinator and supervision+ roles full access
- Add SECURITY DEFINER functions as needed (following existing pattern in the codebase)
- Use existing set_profiles_updated_at() trigger for updated_at columns where applicable
- Add proper indexes for all foreign keys and frequently queried columns
- Follow the naming conventions and style of existing migrations in supabase/migrations/

OUTPUT:
Create one migration file with filename: 20260425120000_dit_weekly_training_system.sql
Include all 9 tables with proper constraints, indexes, and RLS.
```

---

## Prompt 2: TypeScript Types & Database Client Functions

**Objective:** Create TypeScript types and query functions for the new training system.

```
CONTEXT:
The RCSO CID Portal uses TypeScript with Supabase client. Existing types are in src/types/ 
and include training.ts (which has basic DIT types). Database query functions are in 
src/lib/training/queries.ts.

TASK:
1. Create/update src/types/training.ts to include new types:

   // Activity logging
   export type ActivityTemplate = {
     id: string
     activity_name: string
     category: string
     required_exposures_phase_1: number
     required_exposures_phase_2: number
     required_exposures_phase_3: number
     description: string | null
   }

   export type ActivityExposure = {
     id: string
     dit_record_id: string
     activity_template_id: string
     fto_id: string
     exposure_date: string
     case_complaint_number: string | null
     role: 'observer' | 'assistant' | 'lead'
     duration_minutes: number | null
     fto_notes: string | null
     created_at: string
   }

   // Weekly session
   export type WeeklyTrainingSession = {
     id: string
     pairing_id: string
     week_start_date: string
     week_end_date: string
     status: 'draft' | 'submitted' | 'approved'
     submitted_by: string | null
     submitted_at: string | null
     approved_by: string | null
     approved_at: string | null
     created_at: string
     updated_at: string
   }

   // Competency
   export type CompetencyMaster = {
     key: string
     label: string
     category: string
     sort_order: number
     description: string | null
   }

   export type WeeklyCompetencyScore = {
     id: string
     session_id: string
     competency_key: string
     competency_label: string
     category: string
     score: number | null
     explanation: string | null
     explanation_required: boolean
     prior_week_score: number | null
     created_at: string
     updated_at: string
   }

   // Unobserved
   export type UnobservedCompetency = {
     id: string
     session_id: string
     competency_key: string
     competency_label: string
     days_since_last_observed: number
     dit_notified_at: string | null
     created_at: string
   }

   // Deficiency
   export type DeficiencyForm = {
     id: string
     pairing_id: string
     weekly_session_id: string
     created_by: string
     created_at: string
     status: 'submitted' | 'coordinator_reviewing' | 'coaching_active' | 
             'escalated_to_sgt' | 'escalated_to_lt' | 'resolved'
     priority_level: 'routine' | 'urgent'
     competencies_flagged: DeficiencyCompetency[]
     additional_notes: string | null
     updated_at: string
   }

   export type DeficiencyCompetency = {
     competency_key: string
     competency_label: string
     score: number
     fto_recommendation: string
   }

   export type DeficiencyFormAction = {
     id: string
     deficiency_form_id: string
     action_level: 'coordinator' | 'fto_sgt' | 'lt'
     actor_id: string
     action_type: 'coordinator_review' | 'scheduled_meeting' | 
                  'escalate_to_sgt' | 'escalate_to_lt' | 'resolve'
     action_notes: string | null
     calendar_meeting_id: string | null
     meeting_date: string | null
     meeting_attendees: string[] | null
     created_at: string
   }

   export type ExcellenceRecognition = {
     id: string
     session_id: string
     competency_key: string
     competency_label: string
     dit_user_id: string
     fto_user_id: string
     explanation: string
     sent_to_recipients: string[]
     created_at: string
   }

2. Create/update src/lib/training/queries.ts with functions:

   // Activity exposures
   export async function fetchActivityTemplates(): Promise<ActivityTemplate[]>
   export async function logActivityExposure(exposure: Partial<ActivityExposure>): Promise<ActivityExposure>
   export async function fetchActivityExposuresForDit(dit_record_id: string, 
                                                      week_start?: string): Promise<ActivityExposure[]>
   export async function getActivityProgressForTemplate(dit_record_id: string, 
                                                        template_id: string): Promise<{
     required: number
     completed: number
     pending: ActivityExposure[]
   }>

   // Weekly sessions
   export async function createWeeklySession(pairing_id: string, 
                                             week_start: string): Promise<WeeklyTrainingSession>
   export async function fetchWeeklySession(session_id: string): Promise<WeeklyTrainingSession>
   export async function updateSessionStatus(session_id: string, 
                                             status: 'draft' | 'submitted' | 'approved'): Promise<void>

   // Competency scores
   export async function fetchCompetencyMasters(): Promise<CompetencyMaster[]>
   export async function saveCompetencyScore(score: WeeklyCompetencyScore): Promise<void>
   export async function fetchSessionCompetencyScores(session_id: string): Promise<WeeklyCompetencyScore[]>
   export async function getPriorWeekScore(dit_record_id: string, 
                                          competency_key: string): Promise<number | null>

   // Unobserved competencies
   export async function identifyUnobservedCompetencies(session_id: string): Promise<UnobservedCompetency[]>
   export async function markUnobservedNotified(unobserved_id: string): Promise<void>

   // Deficiency forms
   export async function createDeficiencyForm(form: Partial<DeficiencyForm>): Promise<DeficiencyForm>
   export async function fetchDeficiencyForm(form_id: string): Promise<DeficiencyForm>
   export async function fetchDeficiencyFormsForCoordinator(status?: string): Promise<DeficiencyForm[]>
   export async function updateDeficiencyFormStatus(form_id: string, 
                                                    status: DeficiencyForm['status']): Promise<void>
   export async function addDeficiencyAction(action: Partial<DeficiencyFormAction>): Promise<void>
   export async function fetchDeficiencyActions(form_id: string): Promise<DeficiencyFormAction[]>

   // Excellence recognitions
   export async function createExcellenceRecognition(recognition: Partial<ExcellenceRecognition>): Promise<void>
   export async function fetchExcellenceRecognitions(dit_user_id: string): Promise<ExcellenceRecognition[]>

IMPORTANT:
- Use Supabase client with TypeScript strict mode
- All functions should handle errors and throw with descriptive messages
- Use proper RLS context (auth.uid()) in queries
- Follow existing patterns in src/lib/training/queries.ts
- Add type guards for JSON columns (competencies_flagged is JSONB)
- Cache competency_masters with SWR or static generation (they don't change often)
```

---

## Prompt 3: Weekly Evaluation Form Component

**Objective:** Build the FTO weekly competency evaluation form.

```
CONTEXT:
The RCSO CID Portal uses React 19, shadcn/ui components, and Next.js app router.
There are existing form components in src/components/training/ for evaluations.
The system uses react-hook-form for form state management.

TASK:
Build src/components/training/weekly-evaluation-form.tsx component that:

1. Display structure:
   - Show competency categories as collapsible sections
   - Within each section, show 4-5 competencies grouped together
   - For each competency, show: label, radio buttons (1-5), prior week score, trend indicator
   - Score of 5 = green checkmark + "⭐", declining scores = red down arrow

2. Interaction:
   - FTO selects score 1-5 or leaves blank (not observed)
   - If score is 1, 2, or 5: explanation field appears (red border, labeled "Required")
   - Explanation should be 2-3 sentence textarea
   - If FTO blanks out a score: that competency marked as "not observed"

3. Bottom of form:
   - Show list of "Not Observed" competencies (auto-generated)
   - Show summary: "Rated 18/20. Not observed: 2"
   - Two buttons: [SAVE DRAFT] [SUBMIT EVALUATION]
   - BELOW those buttons: [GENERATE DEFICIENCY FORM] (always visible, separate)

4. Data handling:
   - Load prior week scores for comparison
   - Auto-calculate which competencies are not observed (no score)
   - On submit: validate all 1/2/5 have explanations
   - Save state to draft session in DB
   - On [SUBMIT]: lock form, change status to 'submitted'

5. Props:
   interface WeeklyEvaluationFormProps {
     dit_record_id: string
     pairing_id: string
     fto_id: string
     week_start_date: string
     week_end_date: string
     onSubmit?: (session_id: string) => void
   }

6. UI Details:
   - Use shadcn Card for category sections
   - Use shadcn Radio for score selection
   - Use shadcn Textarea for explanation
   - Use shadcn Button for actions
   - Color scheme: Red for score 1, Yellow for 2, Green for 4-5
   - Show trend: ↗ (improving), → (same), ↘ (declining), or first time (no arrow)

COMPONENT SHOULD:
- Load competency masters on mount
- Load prior week scores from database
- Load existing session scores if editing draft
- Handle save draft (POST to /api/training/sessions/:id/save)
- Handle submit evaluation (POST to /api/training/sessions/:id/submit)
- Show loading/error states
- Scroll to first error on validation failure
```

---

## Prompt 4: Deficiency Form Component & Escalation

**Objective:** Build deficiency form creation and escalation workflow.

```
CONTEXT:
The deficiency form is SEPARATE from the weekly evaluation form. It's generated 
AFTER evaluation is submitted (not during). FTO has a button [GENERATE DEFICIENCY FORM] 
available on the eval summary screen.

TASK:
Build src/components/training/deficiency-form.tsx that:

1. Modal/Drawer that opens when FTO clicks [GENERATE DEFICIENCY FORM]

2. Content:
   - Show DIT name, FTO name, week
   - Show checkboxes for each competency with score 1, 2, or 5
   - Pre-fill with FTO's explanation and recommendation from eval
   - Allow FTO to edit/add to recommendation
   - FTO selects which scores warrant escalation (some 5s may not need escalation)
   - Priority selector: Routine / Urgent
   - Optional additional notes field

3. Submit flow:
   - Validate at least one competency selected
   - POST to /api/training/deficiency-forms
   - On success: show "Form submitted to FTO Coordinator"
   - Close modal

4. Also build src/components/training/deficiency-coordinator-view.tsx:
   - Show list of pending deficiency forms
   - Filter by status: Submitted, Coaching Active, Escalated, Resolved
   - Click to open form detail
   - Detail view shows:
     - All competencies flagged with scores
     - FTO's recommendations
     - [SCHEDULE MEETING WITH FTO] button
     - Notes field for coordinator to add comments
     - Set target resolution date
     - Status buttons: [CONTINUE COACHING] [ESCALATE TO FTO SGT]
   
5. When coordinator clicks [SCHEDULE MEETING WITH FTO]:
   - Show date/time picker
   - Auto-fill attendees: Coordinator, FTO
   - Generate Google Calendar event (via edge function)
   - Save calendar_event_id to deficiency_form_actions
   - Set form status to 'coaching_active'

6. When coordinator clicks [ESCALATE TO FTO SGT]:
   - Show form for escalation notes
   - Auto-add: Form history, prior coaching attempts, current status
   - Show date/time picker for meeting with FTO Sgt
   - Auto-fill attendees: FTO Sgt, Coordinator, FTO, DIT
   - Generate Google Calendar event
   - Set form status to 'escalated_to_sgt'
   - Create deficiency_form_action record with escalation notes

IMPORTANT:
- Google Calendar integration: Call edge function /api/calendar/create-event
- Edge function should handle auth, return event ID or error
- Maintain audit trail in deficiency_form_actions
- DITs should be notified when coaching initiated (send notification)
```

---

## Prompt 5: Activity Logging Interface

**Objective:** Build activity exposure logging component.

```
CONTEXT:
DITs and FTOs log activities throughout the week. This should be lightweight 
and fast (appears in sidebar or quick-add modal).

TASK:
Build src/components/training/activity-logger.tsx that:

1. Modal/quick-add form triggered by [+ LOG ACTIVITY] button

2. Fields:
   - Activity Type: dropdown (loaded from training_activity_templates)
   - Date: date picker (default to today)
   - FTO Name: dropdown (auto-filled to current user, can change)
   - Case/Complaint #: text input
   - Role: radio buttons (Observer / Assistant / Lead)
   - Duration (min): number input (optional)
   - Notes: textarea (optional)

3. Post-log feedback:
   - Show progress: "Death Investigation: now 1 of 2 exposures"
   - Close modal
   - Refresh activity list on parent page

4. Also build activity-list-summary.tsx to show on eval page:
   - Show all logged activities for the week
   - Group by activity type
   - Show: Activity | Date | FTO | Case # | Role | Duration
   - Show progress bars: "2 of 2 required" with green checkmark
   - Show "in progress" activities: "1 of 2 required"
   - Quick-add button to log more

PROPS:
interface ActivityLoggerProps {
  dit_record_id: string
  week_start_date: string
  week_end_date: string
  onActivityLogged?: () => void
}

API:
POST /api/training/activities
Body: { dit_record_id, activity_template_id, fto_id, exposure_date, 
        case_complaint_number, role, duration_minutes, fto_notes }
```

---

## Prompt 6: DIT Progress Dashboard

**Objective:** Build DIT-facing view showing competency scores, coaching status, unobserved alerts.

```
CONTEXT:
DITs need to see their weekly evaluation scores, which competencies need work, 
and any active coaching processes.

TASK:
Build src/app/(dashboard)/training/dit-dashboard/page.tsx that shows:

1. Weekly snapshot card:
   - DIT name, current FTO, week dates
   - Status badge (Draft, Submitted, Approved)
   - Competency summary: "Rated 18/20, Not observed: 2"

2. Competency card grid:
   - Show score (1-5) with color coding
   - Show trend arrow (↗, →, ↘)
   - Show explanation if score is 1, 2, or 5
   - Collapsible detail with related activities for that competency

3. "Not Observed" alert section:
   - List competencies not observed
   - Show last observed date + FTO name
   - "Days since last observed: 14"
   - [LOG EXPOSURE] button

4. "Coaching Status" section (if active):
   - Show competency being coached
   - FTO coordinator assigned
   - Scheduled meeting date/time
   - Brief coaching plan summary

5. Trend chart (optional):
   - Show last 4 weeks of scores for top 3 competencies
   - Line chart using recharts

PROPS: None (use session context to get DIT info)

FEATURES:
- Print button to generate PDF for filing
- Download button for personal records
- Share eval with FTO (email link)
```

---

## Prompt 7: API Routes & Server Actions

**Objective:** Create API endpoints for form submission and data management.

```
CONTEXT:
The portal uses Next.js app router with /api directory for REST endpoints.
All DB queries should use Supabase client with proper RLS.

TASK:
Create API routes in src/app/api/training/:

1. POST /api/training/sessions
   - Create new weekly_training_session
   - Input: pairing_id, week_start_date, week_end_date
   - Return: session_id

2. POST /api/training/sessions/[id]/save
   - Save draft competency scores
   - Input: session_id, scores array
   - Validation: Check all 1/2/5 have explanations
   - Return: updated session

3. POST /api/training/sessions/[id]/submit
   - Submit evaluation (lock form)
   - Input: session_id
   - Action: 
     a. Change status to 'submitted'
     b. Auto-identify unobserved competencies
     c. Create unobserved_competencies records
     d. Send auto-email to DIT with unobserved list
   - Return: success

4. POST /api/training/activities
   - Log activity exposure
   - Input: { dit_record_id, activity_template_id, fto_id, ... }
   - Return: created exposure

5. POST /api/training/deficiency-forms
   - Create deficiency form
   - Input: { pairing_id, session_id, competencies_flagged, priority_level, ... }
   - Return: form_id

6. POST /api/training/deficiency-forms/[id]/schedule-meeting
   - Schedule coordinator meeting via Google Calendar
   - Input: { form_id, meeting_date, meeting_time }
   - Call: POST /api/calendar/create-event (edge function)
   - Return: calendar_event_id

7. POST /api/training/deficiency-forms/[id]/escalate
   - Escalate to FTO Sgt
   - Input: { form_id, escalation_notes, meeting_date, meeting_time }
   - Action:
     a. Create deficiency_form_action with escalation notes
     b. Change status to 'escalated_to_sgt'
     c. Create Google Calendar event with 4 attendees
     d. Send email to FTO Sgt with invite
   - Return: updated form

8. GET /api/training/deficiency-forms?status=submitted
   - Fetch pending forms for coordinator
   - Query: status, pairing_id (optional)
   - Return: array of deficiency forms

IMPORTANT:
- All endpoints require authentication
- Validate RLS by checking user roles
- FTO can only create/edit sessions for own pairings
- Coordinator can view/edit all forms
- Log all actions with timestamps for audit
```

---

## Prompt 8: Email & Notification Templates

**Objective:** Create email templates for auto-notifications.

```
CONTEXT:
The system sends automated emails for:
1. Unobserved competencies (after eval submitted)
2. Deficiency form submitted (to coordinator)
3. Coaching meeting scheduled (to FTO)
4. Escalation to Sgt (to all attendees)
5. Excellence recognition (to leadership)

TASK:
Create email templates in src/lib/email/templates/training/:

1. unobserved-competencies.ts
   - To: DIT
   - CC: FTO
   - Subject: "Unobserved Training Activities — Week of [DATE]"
   - Content: List of competencies + last observed dates + progress toward goals
   - Action: [LOG EXPOSURE] link

2. deficiency-form-submitted.ts
   - To: FTO Coordinator
   - From: System
   - Subject: "New Deficiency Form: [DIT Name] — [WEEK]"
   - Content: Summary of competencies + FTO's recommendations
   - Action: [REVIEW FORM] link

3. coaching-meeting-scheduled.ts
   - To: FTO
   - From: Coordinator
   - Subject: "DIT Coaching Meeting Scheduled: [DIT Name]"
   - Content: Competencies to discuss + meeting time + prep notes
   - Attachment: Google Calendar invite

4. escalation-notice.ts
   - To: FTO Sgt, Coordinator, FTO, DIT
   - Subject: "DIT Coaching Escalation: [DIT Name] — [COMPETENCIES]"
   - Content: Original deficiency form + coordinator's follow-up notes + escalation reason
   - Include: Meeting time + attendees

5. excellence-recognition.ts
   - To: FTO Coordinator, FTO Sgt, Lt
   - From: System
   - Subject: "Excellence in Training: [DIT Name] — [COMPETENCY]"
   - Content: Competency scored 5 + FTO's explanation + related case details
   - Tone: Celebratory/positive

Use React Email library for HTML templates (or plain HTML if preferred).
Keep design clean and professional (match RCSO brand if guidelines available).

All templates should include:
- DIT/FTO names with badges
- Week dates
- Clear call-to-action links
- Footer with "Do not reply" instruction
```

---

## Next Steps After Implementation

1. **Test the full flow:**
  - FTO logs activities → Creates eval → Submits → Generates deficiency form
  - Coordinator reviews → Schedules meeting → Escalates to Sgt
  - DITs see their progress with accurate trending
2. **Add missing features:**
  - PDF export with signature placeholders
  - Dashboard analytics (coordinator view across all DITs)
  - Historical records/archival
3. **Integrate Google Calendar:**
  - Create edge function for calendar event creation
  - Handle auth & error scenarios
4. **User documentation:**
  - Training guide for FTOs on new weekly eval flow
  - FAQ for DITs on interpreting scores
  - Escalation decision tree for coordinators

---

## File Structure Reference

After implementation, the codebase should include:

```
src/
├── types/
│   └── training.ts                    # All training-related types
├── lib/
│   ├── training/
│   │   ├── queries.ts                 # DB query functions
│   │   └── constants.ts               # Competency masters, categories
│   └── email/
│       └── templates/
│           └── training/              # Email templates
├── components/
│   └── training/
│       ├── weekly-evaluation-form.tsx
│       ├── deficiency-form.tsx
│       ├── deficiency-coordinator-view.tsx
│       ├── activity-logger.tsx
│       └── activity-list-summary.tsx
├── app/
│   ├── api/
│   │   └── training/
│   │       ├── sessions/route.ts
│   │       ├── activities/route.ts
│   │       ├── deficiency-forms/route.ts
│   │       ├── calendar/create-event.ts  # Edge function
│   │       └── [id]/...
│   └── (dashboard)/
│       └── training/
│           ├── weekly-evaluation/page.tsx
│           ├── dit-dashboard/page.tsx
│           └── coordinator/page.tsx
└── DIT_WEEKLY_TRAINING_SYSTEM_SPEC.md  # This spec
```

