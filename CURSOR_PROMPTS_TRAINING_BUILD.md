# Cursor Build Prompts: Training Section Renovation

**RCSO CID Portal - Detective in Training Program**

**Total Prompts:** 14  
**Phases:** 1B (Dashboard Foundation), 1C (Core Training), 1D (Advanced Features)  
**Estimated Build Time:** ~18 sessions @ 1 per week = 18-22 weeks

---

## Signature Routing Rules (Master Reference)

Keep this handy—it's the routing blueprint for all document signatures:


| Document Type            | Route                              | Endpoint     |
| ------------------------ | ---------------------------------- | ------------ |
| Weekly Eval              | FTO → Coordinator → SGT            | Stop at SGT  |
| Equipment Check-Off      | FTO → Coordinator → SGT            | Stop at SGT  |
| Deficiency/Remedial Form | FTO → Coordinator → SGT → LT       | Stop at LT   |
| Completion Certificate   | FTO → Coordinator → SGT → LT → CPT | Final at CPT |
| FTO Feedback Survey      | DIT (self) → Coordinator → SGT     | Review only  |


**Database implementation:** Store `routing_order` as an array (e.g., `['fto', 'coordinator', 'sgt']`), increment `current_step` as each person signs, and update `current_signer_role` accordingly. When `current_step` exceeds array length, mark as `'completed'`.

**iPad setup:** Shared device, authenticates via Face ID or badge code, captures signature + timestamp + IP + device ID on each sign.

---

## PHASE 1B: Dashboard Foundation (Prompts 1-9)

---

## PROMPT 1: Training Dashboard Layout Shell

**What to build:**
I need the responsive foundation for the Training Dashboard. This is structure only—no API calls, no data binding yet. Think of it as the skeleton that the rest of the app hangs on.

**Here's the layout:**

- Top navbar with logo, Dashboard, DIT Files, Schedule, Resources, settings icon
- Left sidebar (collapsible on mobile/tablet) showing user welcome, role, and main nav menu
- Main content area with 5 placeholder sections: Onboarding, Active DIT Files, Documents, Schedule, Resources
- All responsive: desktop (1200px+) shows full sidebar, tablet (768-1199px) collapses sidebar to icons, mobile (<768px) hides sidebar as drawer

**Styling:**
Use Tailwind CSS with dark theme (#111827 background, #f3f4f6 text), 8pt grid system, 16px base spacing. This sets the tone for the entire section.

**Navigation routing:**
Logo → `/training` (home)
Dashboard → `/training` (active)
DIT Files → `/training/dit-files`
Schedule → `/training/schedule`
Resources → `/training/resources`
Settings → `/training/settings` (stub for now)

Top right shows logged-in user name, role, and logout button.

**Success looks like:**

- Responsive works at all 3 breakpoints (test by resizing)
- Navigation links route correctly, no 404s
- Sidebar toggle works on mobile (hamburger menu)
- Placeholder cards appear in main area showing where content will go
- No API calls—everything hardcoded/mocked
- No console errors

**Tech:**
Next.js, TypeScript, Tailwind CSS, React hooks for layout state (sidebar open/closed)

**Depends on:** Nothing—this is foundation

**Time estimate:** 1 session (2-3 hours)

---

## PROMPT 2: Onboarding Section (Create Profile, Survey Trigger, Meeting Brief)

**What to build:**
The Onboarding section where coordinators enroll new DITs. Three cards: (1) Create new DIT profile, (2) Survey status tracker, (3) Meeting brief checklist.

**"Create Profile" modal:**
Form fields: First Name, Last Name, Email, Cell Number, Badge Number. When submitted:

- POST to `/api/training/dit-records` with { firstName, lastName, email, cellNumber, badgeNumber }
- Backend generates survey link (expires in 7 days)
- Sends email to DIT with survey link before their first day
- Response: { dit_user_id, survey_link, survey_expires_at }

**Survey status card:**
After creation, show status: "Awaiting Response" | "Completed" | "Expired"

- GET `/api/training/dit-records/{id}/survey-status` returns { status, completed_count, pending_count, learning_style_data (if completed) }
- [TRACK RESPONSES] button links to response list
- [RESEND SURVEY] button triggers POST `/api/training/dit-records/{id}/resend-survey`
- Once completed, display "✓ Completed (3 of 3 responded)" and show learning style data

**Meeting brief card:**
Checkbox checklist for onboarding meeting: 10-week program overview, probationary phase expectations, dress code/schedules, division areas, case management, chain of command, weekly eval process, equipment list. 

- [SCHEDULE MEETING] (placeholder for now)
- [PRINT] (CSS media query print styling)
- [EMAIL] (generates PDF and emails checklist)

**Form validation:**

- First/Last Name: Required, max 50 chars
- Email: Required, valid format, unique in system
- Cell: Required, valid phone format
- Badge: Required, alphanumeric, unique

**Error handling:**
"This email is already registered" | "This badge number is already in use"

**Depends on:** Prompt 1 (dashboard shell, nav working), dit_records table with schema from spec, `/api/training/dit-records` endpoint

**Time estimate:** 1 session (2-3 hours)

---

## PROMPT 3: Active DIT Files Grid (Status Color-Coding)

**What to build:**
A responsive grid of tiles showing all active DITs at a glance. Each tile is a quick snapshot—click it to dive into details. Think of it like a status dashboard.

**Tile layout per DIT:**

- Name (bold, top)
- Week indicator: "Week 5 of 10 (35%)" with progress bar
- FTO name (hover shows tooltip with contact info)
- Status badge with color:
  - 🟢 Green (#10b981): All competencies observed, avg score 3+, no active coaching
  - 🟡 Amber (#f59e0b): Scores trending down, unobserved competencies, or coaching active
  - 🔴 Red (#ef4444): Multiple 1/2 scores, escalation pending, or behind schedule
  - ⚪ Gray: On leave/paused
- Quick stats: Activities logged, Avg Score, Coaching status
- Buttons: [OPEN] (navigate to detail), [NOTES] (navigate to notes tab)

**Status logic (frontend):**

```javascript
if (coaching_active) return 'amber';
if (unobserved_competencies > 0) return 'amber';
if (avg_score < 3) return 'red';
if (avg_score >= 3 && !coaching_active) return 'green';
return 'gray';
```

**Responsive grid:**
Desktop (1200px+): 4 columns
Tablet (768-1199px): 2-3 columns
Mobile (<768px): 1 column (stacked)

**API calls:**
GET `/api/training/dit-records?status=active` returns array of { id, name, week, fto_name, avg_score, activities_count, status, coaching_active, unobserved_competencies }

**Click behavior:**
Tile click or [OPEN] button → Navigate to `/training/dit-files/{id}`
[NOTES] button → Navigate to `/training/dit-files/{id}?tab=notes`

**Success looks like:**

- Grid displays all active DITs with correct status colors (test with coaching_active, low score, etc.)
- Responsive at all 3 breakpoints
- Click/navigation working
- FTO tooltip shows on hover
- No console errors

**Depends on:** Prompt 1 (dashboard, nav), Prompt 2 (DITs exist), dit_records + fto_pairings tables, `/api/training/dit-records` endpoint

**Time estimate:** 1 session (2-3 hours)

---

## PROMPT 4: DIT File Detail View - Tabs + Overview Tab

**What to build:**
Full-page DIT file with tab navigation (Overview, Weekly Eval, Activity, Cases, Call-Outs, Notes). Start with the shell + Overview tab. Overview shows the competency scorecard and progress snapshot.

**Header:**
[← Back] | DIT NAME | Week X of 10 (XX%)
Badge: [BADGE#] | FTO: [FTO NAME] | Start: [DATE] | End: [DATE]

**Tab navigation:**
6 tabs underlined, click to switch, URL updates to `?tab={tabName}` for bookmarking. Active tab persists on revisit.

**Overview tab content:**

1. **Competency Scorecard** (all 20 grouped by category)
  - Shows: [Score] (trend arrow ↗/→/↘ from prior week) + FTO notes if 1/2/5
  - Categories expandable (click header to collapse/expand)
  - Color-coded scores: 1/2 = red, 3 = green, 4/5 = blue, blank = gray
  - Display prior week score for reference
2. **Unobserved Competencies**
  - List competencies not scored this week
  - Show: "X of Y exposures required, last observed 3/8"
  - Flag with ⚠️ icon
3. **Coaching Status**
  - If active: Show competencies, status, target resolution date
  - If none: "No active coaching" + link to last coaching (if any)
4. **Progress Indicators**
  - Weeks complete: 5 of 10 (50%)
  - Competencies mastered (3+): 8 of 20 (40%)
  - Avg score trend: 3.4 / 5.0
  - Trajectory badge: ↗ (trending up) | → (stable) | ↘ (down)
  - "On Track for Graduation: ✓ YES"

**API calls:**

1. GET `/api/training/dit-records/{id}` → { name, badge, start_date, end_date, fto_id, fto_name }
2. GET `/api/training/dit-records/{id}/current-week` → { week_number, week_start_date, week_end_date, fto_id, fto_name }
3. GET `/api/training/dit-records/{id}/competency-scores?week={week}` → Array of { competency_key, competency_label, category, score, prior_week_score, explanation, unobserved }
4. GET `/api/training/dit-records/{id}/coaching-status` → { active, competencies[], status, target_date }

**Trend calculation:**

```typescript
function getTrend(current: number | null, prior: number | null) {
  if (!current || !prior) return '→';
  if (current > prior) return '↗';
  if (current < prior) return '↘';
  return '→';
}
```

**Success looks like:**

- DIT page loads with correct name, week, FTO
- Tab navigation works (click tabs, URL updates, active state visible)
- Overview displays competency scorecard correctly
- Unobserved list shows with days-since-observed
- Coaching status accurate
- Progress indicators calculate right
- Color-coding matches spec
- Back button returns to grid
- Mobile: tabs become horizontal scroll or dropdown

**Depends on:** Prompts 1-3, dit_records + weekly_competency_scores + deficiency_forms tables, `/api/training/dit-records/{id}` endpoints

**Time estimate:** 1.5 sessions (3-4 hours)

---

## PROMPT 5: DIT File - Weekly Eval Tab

**What to build:**
A history view of all weekly evaluations. Each week shows status, submission date, signature chain, and quick summary. Click week to expand and see full form or download PDF.

**List layout:**
For each week (1-10):

- Week number and date range (3/17-3/23)
- Status: "✓ COMPLETED" or "⏳ PENDING" or "⏳ AWAITING SGT SIGNATURE"
- Submitted date/time and who submitted
- Signature chain with status: ✓ FTO: Smith (3/24 17:45) → ✓ Coordinator: Brown (3/25 09:30) → ⏳ Sergeant: [Pending]
- Quick summary: "18 of 20 scored, Avg 3.4/5, 4 extreme scores (Knowledge Law 2, Time Mgmt 2, Work 5), 2 unobserved"
- [VIEW FULL FORM] [DOWNLOAD PDF] [MORE OPTIONS...]

**Click to expand:**
Shows full form view (read-only, all 20 competencies with scores and explanations)

**Signature chain display:**
✓ = Signed (show name + timestamp)
⏳ = Pending (show role + "Awaiting signature")
✗ = Rejected (future feature, show reason)

**Download PDF:**
Generates PDF with all 20 scores, explanations, signature chain, timestamp. Filename: "Weekly_Eval_[DIT_NAME]_Week[#]_SIGNED.pdf"

**Deficiency form link:**
If deficiency form exists for that week, show: "Deficiency Form: [Status] ([LINK])"

**API calls:**

1. GET `/api/training/dit-records/{id}/weekly-evals` → Array of { week, week_start_date, week_end_date, status, submitted_by, submitted_at, signature_status }
2. GET `/api/training/dit-records/{id}/weekly-evals/{week}` → Full eval form data (all 20 competencies)
3. GET `/api/training/dit-records/{id}/weekly-evals/{week}/signature-chain` → { current_step, routing_order, signatures: [{role, signer_name, signed_at, signed_date}] }

**Success looks like:**

- List shows all weeks with correct status
- Click week expands to show summary
- Signature chain displays correct (✓/⏳ icons, names, timestamps)
- PDF download works and includes all competencies
- Full form view readable, formatted correctly
- Deficiency form link shows if applicable
- Responsive on mobile

**Depends on:** Prompt 4 (DIT File tabs), weekly_training_sessions + weekly_competency_scores + digital_signatures tables, `/api/training/weekly-evals` endpoints

**Time estimate:** 1.5 sessions (3-4 hours)

---

## PROMPT 6: DIT File - Activity Sheet Tab

**What to build:**
An activity exposure log with search/filter. Shows all activities logged for the DIT (case work, call-outs, meetings, etc.) and correlates them to competency progress.

**Activity table:**
Columns: Activity | Date | FTO | Role | Status | Duration
Rows show: Death Investigation (3/17, Smith, Observer, ✓), Subpoena Prep (3/18, Smith, Assistant, ✓), etc.

**Search/filter:**

- Search box: Filter by activity name (client-side)
- Week filter: [This Week] [Week 1-10] [All Weeks]
- Activity type filter: [All Activities] [Death] [Interview] [Evidence] etc. (populate from templates)

**Competency progress display:**
For each activity type: "X of Y exposures required"

- ✓ Green if met
- ⚠️ Yellow if partial
- 🔴 Red if behind
- "exceeds requirement" note if over

**Example:**
Death Investigation: ✓ 2/2 complete
Interview Skills: 1/2 complete ⚠️ (need 1 more)
Evidence Collection: 3/2 complete (exceeds requirement)

**API calls:**

1. GET `/api/training/dit-records/{id}/activity-exposures?week={week}&activity_type={type}` → Array of { id, activity_name, activity_type, exposure_date, fto_name, role, duration_minutes, status }
2. GET `/api/training/dit-records/{id}/activity-progress` → Array of { activity_name, required_exposures, completed_exposures, status }

**Additional buttons:**
[+ LOG NEW ACTIVITY] (placeholder for now, implemented later)
[PRINT] [EMAIL] (CSS print styling + email as PDF)

**Success looks like:**

- Activity table displays all logged activities
- Search filters by name (client-side)
- Week/type filters work
- Competency progress calculates correctly
- Color coding accurate (green/yellow/red)
- Print/email buttons functional
- Responsive on mobile

**Depends on:** Prompt 4 (DIT tabs), training_activity_exposures + training_activity_templates tables, `/api/training/activity-exposures` endpoints

**Time estimate:** 1 session (2-3 hours)

---

## PROMPT 7: DIT File - Case List & Call-Out Tabs

**What to build:**
Two tabs: Case Assignments and Call-Out Log. Show cases assigned to DIT, roles, dates, and call-outs with date/time/duration/incident type. Include statistics.

**Case List Tab:**
Table: Case # | Incident | Status | Lead Detective | Assigned Dates
Example: 2024-0847 | Homicide | Closed | Smith, J. | 3/8-4/2

Below table: "Exposure categories: Scene Management: 2 | Interviews: 1 | Evidence: 3 | Reports: 2"

**Call-Out Log Tab:**
Table: Date | Time Called | FTO | Case Type | Hours | Status
Example: 3/17 | 2:30am | Smith | Death Scene | 4:15 | ✓

Below table:

- Total Call-Outs: 12 (week 5)
- Avg Duration: 3h 20m
- Night Calls: 7 of 12 (58%)
- Off-Day Calls: 1 (eligible for comp time)

**API calls:**

1. GET `/api/training/dit-records/{id}/case-assignments` → Array of { case_id, case_number, incident_type, status, lead_detective, assigned_date, assigned_end_date }
2. GET `/api/training/dit-records/{id}/call-outs` → Array of { date_called, time_called, fto_name, case_type, duration_minutes, status, is_off_duty }

**Success looks like:**

- Case list displays all cases with correct dates
- Call-out log shows all call-outs with times/durations
- Statistics calculate correctly
- Off-duty flag works (shows comp time eligibility)
- Responsive on mobile

**Depends on:** Prompt 4 (DIT tabs), case_assignments + call_out_logs tables, `/api/training/case-assignments` and `/api/training/call-outs` endpoints

**Time estimate:** 1 session (2-3 hours)

---

## PROMPT 8: 10-Week Schedule Grid

**What to build:**
Visual grid showing all 10 weeks of training with FTO pairings. Each week shows FTO name, color-coded, focus areas, working hours, status, activities, and avg score. Click week to see details and handover notes.

**Week card content:**

- Week number & date range (3/3-3/9, MON-FRI)
- Working hours (8am-5pm, etc.)
- FTO name + color swatch (unique color per FTO)
- Status: ✓ Complete | 🟢 In Progress | ⏳ Upcoming
- Activities logged counter
- Avg score for week
- Focus areas (1-2 bullets)
- Handover notes (if FTO change mid-week)
- [VIEW] [NOTES] buttons

**Color assignment:**
Generate or assign a unique color to each FTO (8-10 palette). Either randomize or hash based on FTO ID. Store in FTO record or calculate client-side.

**Click to expand:**
Show full details, handover timeline if FTO change, admin option [REASSIGN FTO] (future feature).

**Responsive:**
Desktop: All 10 weeks visible
Tablet: 5 weeks per row, scroll
Mobile: 1 week per row, vertical scroll

**API calls:**

1. GET `/api/training/dit-records/{id}/schedule` → Array of { week, week_start_date, week_end_date, fto_id, fto_name, fto_badge, focus_areas, handover_notes, status }
2. GET `/api/training/fto/{id}` → { fto_name, fto_color, contact_info } (for color assignment)

**Buttons:**
[PRINT FULL SCHEDULE] [EMAIL TO DITs/FTOs] [EDIT SCHEDULE] (admin feature)

**Success looks like:**

- All 10 weeks display with correct dates
- FTO names/colors correct
- Status badges accurate (current week = in progress)
- Click week expands to show details
- Handover notes show if FTO change
- Print/email buttons functional
- Responsive at all sizes

**Depends on:** Prompt 4 (DIT file page), fto_pairings + fto_records tables, `/api/training/schedule` endpoint

**Time estimate:** 1 session (2-3 hours)

---

## PROMPT 9: Documents & Resources Tiles

**What to build:**
Two sections: Training Documents (categorized) and External Resources (links). Searchable, with file previews and downloads.

**Documents section:**
Categories: Required Reading | Reference Materials | Forms & Templates
Tiles show: File icon | Title | File size/pages | Last updated | [OPEN] [SAVE] buttons

File types: PDF (📄), DOCX (📝), XLSX (📊), Link (🔗)

Search: Client-side filter by document name/category/description

[OPEN] button: Opens in inline PDF viewer (PDF.js) or new tab
[SAVE] button: Downloads file to device

**Resources section:**
Branded tiles with org logos (FBI, TBI, DA Office, etc.)
Show: Logo | Name (1-2 line description) | [VISIT SITE] button
[VISIT SITE] → Opens in new tab

**API calls:**

1. GET `/api/training/documents?category={cat}&search={term}` → Array of { id, name, category, file_type, file_size, file_url, updated_at, description }
2. GET `/api/training/resources` → Array of { id, name, url, logo_url, description }

**Responsive grid:**
Desktop: 3-4 columns
Tablet: 2-3 columns
Mobile: 1 column

**Success looks like:**

- Documents display in correct categories
- File icons accurate
- Search filters documents
- [OPEN] button works (viewer/link works)
- [SAVE] button downloads file
- Last updated date displays correctly
- Resources show with logos and working links
- Responsive grid at all sizes

**Depends on:** Prompt 1 (dashboard, nav), training_documents + training_resources tables, `/api/training/documents` and `/api/training/resources` endpoints, S3 or Supabase Storage for PDFs

**Time estimate:** 1 session (2-3 hours)

---

## PHASE 1C: Core Training Features (Prompts 10-11)

---

## PROMPT 10: Weekly Evaluation Form + Signature Workflow

**What to build:**
The form FTOs fill out every Friday to score all 20 competencies. Includes validation, draft saving, deficiency form generation, and iPad signature capture integrated at submit time.

**Form layout:**
5 sections (one per competency category). Each section shows 4 competencies with:

- Competency name (label)
- Score buttons: 1 2 3 4 5 [Not Observed checkbox]
- Explanation text field (hidden until 1/2/5 selected, required if selected)
- Prior week score display (read-only, for context)

**Unobserved list at bottom:**
Auto-generates from blank scores. Shows: "Interview Skills (need 2, have 1, last observed 3/8)"

**Buttons:**
[SAVE DRAFT] - Stores form in DB, status='draft', can return later
[SUBMIT EVALUATION] - Finalizes form, status='submitted', becomes read-only, triggers signature routing
[GENERATE DEFICIENCY FORM] - Available after submit if any 1/2 scores exist

**Form state:**

- Validation: All 20 must have score OR explicitly "Not Observed"
- Scores 1, 2, 5 MUST have explanation (max 300 chars, show character count)
- Red border on explanation if required but empty
- Activity context sidebar (optional): Show recent activities/cases/call-outs from this week

**After submit → Signature workflow:**

1. System creates digital_signatures record
2. iPad interface loads: "Weekly Eval ready for signature"
3. FTO draws signature on iPad canvas (Apple Pencil or finger)
4. [CLEAR SIGNATURE] [CONFIRM & SEND TO COORDINATOR] buttons
5. On confirm:
  - Save signature as base64 image
  - Update routing to next signer (Coordinator)
  - Send notification to Coordinator
  - Status: 'pending_coordinator_signature'

**API calls:**

1. POST `/api/training/weekly-evals` with { dit_id, week, competency_scores: [{key, score, explanation}] } → { session_id, status: 'draft' }
2. PATCH `/api/training/weekly-evals/{session_id}` with updated scores, status: 'submitted' → { session_id, status: 'submitted', signature_routing: {...} }
3. POST `/api/training/weekly-evals/{session_id}/sign` with { signature_data: base64, signer_role: 'fto', device_info: {...} } → { current_step_updated, next_signer: {...} }

**Tech:**
Canvas API for iPad, signature_pad.js for smooth drawing, React hooks for form state, Formik or custom validation

**Success looks like:**

- Form displays all 20 competencies grouped correctly
- Score buttons work (select/deselect)
- "Not Observed" checkbox hides score requirement
- Explanation field shows red border if required but empty
- [SAVE DRAFT] stores partial form (can edit later)
- [SUBMIT] finalizes, makes read-only, triggers email
- Unobserved list auto-generates
- iPad signature capture smooth (no jank)
- Signature saves to DB with timestamp/IP/device
- Routing updates (FTO → Coordinator)
- Next signer gets notification email

**Depends on:** Prompts 4-9 (DIT file structure), weekly_training_sessions + weekly_competency_scores + digital_signatures tables, `/api/training/weekly-evals` endpoints, email service

**Time estimate:** 2 sessions (4-5 hours) — Complex form + signature integration

---

## PROMPT 11: Deficiency Form + Escalation Routing

**What to build:**
After FTO submits a weekly eval, they can generate a deficiency form if there are 1/2 scores. This form flags competencies needing coaching and routes for signatures with optional escalation to Sergeant if unresolved.

**[GENERATE DEFICIENCY FORM] button:**
Available after eval is submitted. Opens modal.

**Modal content:**

- DIT, FTO, Week (all pre-filled, read-only)
- Checkboxes: Select flagged competencies (only show 1/2/5 scores from that week)
- Coaching recommendations text area (per competency): "Structured review of warrantless arrest exceptions. Case law examples. Monitor next 2 weeks."
- Priority: ○ Routine ● Urgent
- Additional notes (optional)

**Signature routing:**
FTO → Coordinator → Sergeant → (optional) Lieutenant
Button: [SUBMIT TO FTO COORDINATOR]

**Escalation workflow:**

1. FTO submits, signs on iPad
2. Coordinator receives notification, reviews form, signs
3. Coordinator clicks [SCHEDULE MEETING WITH FTO]
  - Opens calendar (or creates meeting record)
  - Sets coaching plan target date
  - Status: [COACHING IN PROGRESS]
4. If no improvement after 2 weeks:
  - Coordinator escalates to Sergeant
  - Sergeant attends meeting with DIT + Coordinator + FTO
  - Sergeant decides: continue coaching, change FTO, or formal action
  - Status: [ESCALATED TO SERGEANT] or [RESOLVED]

**API calls:**

1. POST `/api/training/deficiency-forms` with { session_id, competencies_flagged: [{key, score, recommendation}], priority, notes } → { deficiency_form_id, status: 'submitted' }
2. POST `/api/training/deficiency-forms/{id}/sign` with { signature_data, signer_role: 'fto' } → { current_step_updated, next_signer: 'coordinator' }

**Success looks like:**

- [GENERATE DEFICIENCY FORM] button appears after eval submit
- Modal shows only 1/2/5 scores as checkboxes
- Coaching fields appear for selected competencies
- Priority selector works
- [SUBMIT] creates form + initiates signature routing
- FTO signature capture works
- Coordinator gets email notification
- Can escalate to Sergeant if needed
- Status tracking accurate

**Depends on:** Prompt 10 (weekly eval, signature system), deficiency_forms + deficiency_form_actions tables, `/api/training/deficiency-forms` endpoints

**Time estimate:** 1.5 sessions (3-4 hours)

---

## PHASE 1D: Advanced Features (Prompts 12-14)

---

## PROMPT 12: Digital Signature System (Complete Implementation)

**What to build:**
The core signature infrastructure used across all forms (weekly evals, deficiency forms, certificates, etc.). Includes iPad capture, routing logic, signature queue for signers, and immutable audit trail.

**iPad signature capture:**
Canvas element (Fabric.js or HTML5 Canvas) for drawing

- [CLEAR] button to erase and retry
- [CONFIRM & SEND] button to save and advance routing
- Biometric lock: Face ID / Touch ID / badge code before signature is final
- Auto-capture: timestamp, IP address, device type

**Signature queue (for each signer):**
Shows all documents awaiting that person's signature:

- Document type (Weekly Eval, Deficiency Form, etc.)
- DIT name | Week | Submitted date | Days pending
- Status: "Signed by FTO, pending you"
- [SIGN NOW] button → Opens iPad interface

**Audit trail (view for any signed document):**
For each signer:

- Signature 1: FTO (Smith, John)
└─ Signed: 3/24/2025 17:45
└─ Device: iPad Pro (11-inch)
└─ IP: 192.168.1.105
└─ Signature Image: [verified]
- Signature 2: Coordinator (Brown, Sandra)
└─ Signed: 3/25/2025 09:30
└─ etc.
- Signature 3: Sergeant [AWAITING]
└─ Due by: 3/27/2025 (2 business days)

**Routing logic:**

```javascript
const routingRules = {
  'weekly_eval': {
    routing_order: ['fto', 'coordinator', 'sergeant'],
    if_deficiency_generated: extend_to(['lieutenant']),
    max_days_per_signer: 2
  },
  'deficiency_form': {
    routing_order: ['fto', 'coordinator', 'sergeant', 'lieutenant'],
    max_days_per_signer: 1
  },
  'completion_certificate': {
    routing_order: ['fto', 'coordinator', 'sergeant', 'lieutenant', 'captain'],
    max_days_per_signer: 2
  },
  'equipment_checklist': {
    routing_order: ['fto', 'coordinator', 'sergeant'],
    max_days_per_signer: 2
  }
};

function advanceRouting(signature_record) {
  const current_step = signature_record.current_step;
  const next_step = current_step + 1;
  
  if (next_step < routing_order.length) {
    signature_record.current_step = next_step;
    signature_record.current_signer_role = routing_order[next_step];
    // Notify next signer
  } else {
    signature_record.status = 'completed';
    // Generate final PDF with all signatures
  }
}
```

**PDF generation (with signatures):**

- Append signature page(s) showing all signatures in order
- Include audit trail (timestamp, device, IP for each)
- Watermark: "DIGITALLY SIGNED"
- Store PDF in database

**API calls:**

1. GET `/api/training/signatures/queue` → Array of pending documents
2. POST `/api/training/signatures/{id}/sign` with { signature_data: base64, device_info, ip_address } → { status: 'signed', next_signer: {...} OR 'completed' }
3. GET `/api/training/signatures/{id}/audit-trail` → Array of signature events
4. GET `/api/training/signatures/{id}/pdf` → PDF file with all signatures

**Success looks like:**

- iPad signature capture smooth and responsive
- Biometric authentication works
- Signature saves as image (base64)
- Routing updates correctly (FTO → Coordinator)
- Next signer gets email notification
- Audit trail captures timestamp/device/IP
- PDF generates with signatures in order
- Queue shows pending for current user
- No console errors on iPad

**Depends on:** Prompts 10-11, digital_signatures table, Canvas API, signature_pad.js or Fabric.js, PDF generation library (jsPDF)

**Time estimate:** 2 sessions (4-5 hours) — Complex signature + routing

---

## PROMPT 13: Graduation Trigger & Certificate Generation

**What to build:**
Auto-check after week 10 eval submitted: Are all 20 competencies scored 3+? If yes, trigger certificate generation with signature routing (Coordinator → LT → CPT). If no, create deficiency form instead.

**Graduation check:**

```javascript
POST /api/training/dit-records/{id}/check-graduation
Returns: { ready_to_graduate: true/false, missing_competencies: [] }
```

If all 20 are 3+: Proceed to certificate. Otherwise: Mark week as "REVIEW NEEDED" and create deficiency form.

**Certificate generation:**
Create training_certificate record with DIT name, badge, graduation date, serial number.
Generate PDF from template:

```
RCSO CID PORTAL
DETECTIVE IN TRAINING PROGRAM CERTIFICATE

This certifies that

[DIT NAME]
Badge Number: [BADGE#]

Has successfully completed the
10-Week Detective in Training Program

on [GRADUATION DATE]

All 20 competencies have been mastered
at Level 3 (Meets Standard) or above.

Signed by: ___________________
[Signature + Title + Date]

Certificate #: [SERIAL NUMBER]
Digital Signature Applied: [TIMESTAMP]
```

**Signature routing:**
FTO (already signed on weekly eval) → Coordinator → Lieutenant → Captain
Create digital_signatures record:

- document_type: 'final_certificate'
- routing_order: ['coordinator', 'lieutenant', 'captain']
- current_step: 0
- status: 'pending'

**Email to DIT (upon Captain signature):**

```
Subject: 🎉 RCSO CID Training Program - Graduation Certificate

Congratulations, [DIT NAME]!

You have successfully completed the 10-week Detective in Training program.
All 20 competencies have been mastered at Level 3 (Meets Standard) or above.

Your graduation certificate is attached and available in your portal.

Next Steps:
- You are cleared for solo detective duty
- Probation period: [DATE] - [DATE] (1 year)
- Your FTO will complete final evaluation
- Welcome to the CID team!

Best of luck,
RCSO CID Portal
```

**API calls:**

1. POST `/api/training/dit-records/{id}/check-graduation` → { ready_to_graduate: bool, missing_competencies: [] }
2. POST `/api/training/certificates` with { dit_id, graduation_date, serial_number } → { certificate_id, pdf_path, status: 'pending_signatures' }
3. GET `/api/training/certificates/{id}` → Certificate details + signature chain
4. GET `/api/training/certificates/{id}/pdf` → PDF file

**Success looks like:**

- Auto-check triggers after week 10 eval submit
- Competency check logic correct (all must be 3+)
- If missing: Deficiency form created, no certificate
- If all pass: Certificate generated with correct DIT info
- Routing: Coordinator → LT → CPT
- PDF has correct DIT name, badge, date
- Signatures integrate correctly (iPad + desktop)
- Once Captain signs: marked 'graduated', email sent
- Certificate downloadable from DIT record

**Depends on:** Prompts 5, 10, 12, training_certificates + digital_signatures tables, jsPDF or pdfkit-js, email service

**Time estimate:** 1.5 sessions (3-4 hours)

---

## PROMPT 14: FTO Feedback Survey

**What to build:**
Post-graduation survey where DITs rate their FTO on 10 questions (1-5 scale). Results visible to Coordinator & FTO Sergeant. FTO sees aggregated ratings, not individual DIT names.

**Survey form:**
10 questions, 1-5 scale, optional comments per question:

1. My FTO was knowledgeable about investigative procedures.
2. My FTO provided clear feedback when I made mistakes.
3. My FTO created a safe environment for asking questions.
4. My FTO was accessible and responsive to my needs.
5. My FTO helped me understand the 'why' behind procedures.
6. My FTO adapted their teaching style to match my learning style.
7. My FTO provided opportunities for me to lead investigations.
8. My FTO treated me with respect and professionalism.
9. I feel prepared for solo detective work because of this FTO's training.
10. Overall, rate your FTO's effectiveness as a trainer.

**Survey trigger:**
Day 1 of week 10 or after graduation notification

**DIT workflow:**

- [SAVE DRAFT] stores partial responses
- [SUBMIT SURVEY] finalizes and sends to Coordinator + Sergeant
- No signature required (self-reported feedback)
- Email confirmation to DIT: "Thank you for your feedback"

**Results dashboard (for Coordinator & FTO Sergeant):**
FTO: Smith, John (CID-12)
10-Week Average Rating: 4.2 / 5.0

# of DITs Trained: 12 (this year)

Recent Feedback (last 3):

- Anderson, Michael (Week 10) - 4.4/5.0 - "Smith is knowledgeable and accessible. Excellent" / "Could improve: more time on report writing feedback"
- Brown, Jennifer (Week 10) - 4.1/5.0 - "Great trainer, very patient" / "More opportunities to lead cases"
- Chen, Lisa (Week 10) - 4.0/5.0 - "Good coaching on legal knowledge" / "More consistent feedback timing"

Trends (Last 12 Months):

- Average Rating: 4.2/5.0 ↗ (improving)
- Most Praised: Knowledge, accessibility, respect
- Areas for Development: Report feedback, case leadership

[DOWNLOAD REPORT] [SCHEDULE FTO DEVELOPMENT MEETING]

**FTO visibility:**
FTO sees aggregated ratings and trends, NOT individual DIT names or comments
Shows: "Average rating this year: 4.2" + "Strengths: Knowledge, accessibility" + "Areas to develop: Report feedback"

**API calls:**

1. POST `/api/training/fto-feedback` with { dit_id, fto_id, scores: [{question_id, score}], comments: [{question_id, comment}] } → { feedback_id, status: 'submitted' }
2. GET `/api/training/fto/{id}/feedback-summary` → { average_rating, num_dits, recent_feedback: [], trends: {} }
3. GET `/api/training/fto/{id}/feedback-by-dit` → Array of all feedback for this FTO

**Success looks like:**

- Survey form displays 10 questions with 1-5 scale
- Comments optional per question
- [SUBMIT] saves feedback
- Coordinator & FTO Sergeant see results dashboard
- Average rating calculates correctly
- Trends show (improving/declining)
- Email sent to Coordinator on submit
- FTO sees aggregated (no DIT names)
- No console errors

**Depends on:** Prompt 13 (graduation trigger), fto_feedback table, `/api/training/fto-feedback` endpoints

**Time estimate:** 1 session (2-3 hours)

---

## Build Sequence & Timeline


| Phase              | Prompt | Component                    | Time | Cumulative       |
| ------------------ | ------ | ---------------------------- | ---- | ---------------- |
| 1B                 | 1      | Dashboard Shell              | 1    | 1                |
| 1B                 | 2      | Onboarding                   | 1    | 2                |
| 1B                 | 3      | DIT Files Grid               | 1    | 3                |
| 1B                 | 4      | DIT File Detail + Overview   | 1.5  | 4.5              |
| 1B                 | 5      | Weekly Eval Tab              | 1.5  | 6                |
| 1B                 | 6      | Activity Sheet Tab           | 1    | 7                |
| 1B                 | 7      | Case List & Call-Out Tabs    | 1    | 8                |
| 1B                 | 8      | 10-Week Schedule Grid        | 1    | 9                |
| 1B                 | 9      | Documents & Resources        | 1    | 10               |
| **Phase 1B Total** |        |                              |      | **10 sessions**  |
| 1C                 | 10     | Weekly Eval Form + Sig       | 2    | 12               |
| 1C                 | 11     | Deficiency Form + Escalation | 1.5  | 13.5             |
| **Phase 1C Total** |        |                              |      | **3.5 sessions** |
| 1D                 | 12     | Digital Signature System     | 2    | 15.5             |
| 1D                 | 13     | Graduation & Certificate     | 1.5  | 17               |
| 1D                 | 14     | FTO Feedback Survey          | 1    | 18               |
| **Phase 1D Total** |        |                              |      | **4.5 sessions** |
|                    |        | **TOTAL**                    |      | **~18 sessions** |


**Overall timeline:** 18-22 weeks @ 1 session/week

---

## Quick Reference: Signature Routing Master


| Document               | FTO | Coordinator | SGT | LT  | CPT |
| ---------------------- | --- | ----------- | --- | --- | --- |
| Weekly Eval            | ✓   | ✓           | ✓   | -   | -   |
| Equipment Check-off    | ✓   | ✓           | ✓   | -   | -   |
| Deficiency/Remedial    | ✓   | ✓           | ✓   | ✓   | -   |
| Completion Certificate | ✓   | ✓           | ✓   | ✓   | ✓   |
| FTO Feedback Survey    | -   | ✓           | ✓   | -   | -   |


---

## Ready to Roll

Each prompt is self-contained, includes success criteria, API specs, dependencies, and time estimates. Copy each one to Cursor individually and build in sequence (1B → 1C → 1D). No surprises—every decision is locked in.

**Probation phase:** Deferred to Phase 2.  
**Call-out types supported:** After-hours, business-hour, and scheduled meetings (CAC, VAPIT, CPIT, SART, CDRB).