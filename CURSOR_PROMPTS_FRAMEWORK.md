# Cursor Prompts for CID Case Management System

## Architecture & Framework Build

**Goal:** Create a flexible framework that the user can configure and control. Cursor builds the structural capacity; user defines the operational rules.

---

## PROMPT 1: Authentication & User Roles Framework

**For Cursor:**

Build an authentication system with flexible role definitions. Requirements:

- User login (email/password or SSO)
- Role types: Lead Detective, Co-Lead Detective, Detective, Evidence Tech, Canvass Team, SWAT Commander, Sergeant, DA/Prosecutor, Admin
- Each role can have custom permissions (read-only, can assign tasks, can file supplements, can modify case tier, etc.)
- User profile stores: name, badge number, phone, role(s), assigned cases, notification preferences
- Admin panel to create/edit roles and assign permissions without code changes
- Roles are assignable per case (same person might be Lead on one case, Detective on another)

**Output:** 

- User authentication flow (login, session management)
- Role/permission database schema
- API endpoints for user management
- Admin UI to configure roles and permissions

**User will control:** Which roles can notify the group, who can declare milestones, permissions per role

---

## PROMPT 2: Case Intake & Tier Declaration Framework

**For Cursor:**

Build case creation flow that captures initial information and automatically scaffolds the investigation. Requirements:

- Case intake form: case name, location, date/time, incident type (shooting, unattended death, stabbing, etc.), initial description, reporting officer
- Tier selection (1, 2, 3) with clear descriptions
- Tier selected → auto-loads task template (Tier 1 has X tasks, Tier 2 has Y tasks, Tier 3 has Z tasks)
- Initial case metadata: lead detective, co-lead detective, case status (active, paused, closed)
- Task template is editable before committing (user can add/remove tasks)
- Database stores: case record, all initial tasks in "Pending" state, case metadata

**Output:**

- Case intake form (UI)
- Tier templates (configuration, not hardcoded)
- Task creation logic (intake triggers template loading)
- Case dashboard entry point

**User will control:** Which tasks appear in which tier templates, what metadata is captured at intake, when to show/hide fields

---

## PROMPT 3: Task Management Framework (Core)

**For Cursor:**

Build the task data model and lifecycle. Requirements:

- Task record fields: ID, case_id, title, description, type (enum: interview, canvass, evidence, warrant, etc.), created_date, created_by, assigned_to (role), assigned_person (detective), deadline, priority (low/medium/high/critical)
- Task status machine: Pending → In Progress → Waiting For → Blocked → Complete (allow status updates via UI)
- Task detail view: show all metadata, linked evidence, linked supplements, notes field
- Task list/board view: Kanban-style (columns by status)
- Ability to link related tasks (task A is blocked by task B)
- Edit task: reassign, change deadline, change status, add notes
- Delete task (soft delete, audit trail)
- Search/filter tasks by: assignee, status, deadline, type, case

**Output:**

- Task database schema
- Task CRUD APIs
- Task board UI (Kanban layout)
- Task detail view
- Search/filter backend

**User will control:** Task types, task statuses, whether certain status transitions trigger notifications, display order on task board

---

## PROMPT 4: Supplement Tracking Framework (Critical)

**For Cursor:**

Build supplement tracking linked to tasks. Requirements:

- Supplement record: ID, task_id, type (enum: interview_report, evidence_report, analysis, etc.), required (boolean), due_date, filed_date, filed_by, file_link (document upload), status (outstanding/filed/overdue)
- When task is created with "supplement_required=true," auto-create linked supplement record
- Supplement lifecycle: Outstanding → Filed OR Outstanding → Overdue (if due_date passed without filing)
- Supplement tracker dashboard: table showing all supplements for case, with status indicators
- Alert system: supplement due soon, overdue, all supplements show when due
- Supplement batch view: for lead detective, one view of all outstanding/overdue supplements
- Ability to upload document to supplement (PDF, image, text)
- Audit trail: who filed, when, document version history

**Output:**

- Supplement database schema
- Supplement CRUD APIs
- Supplement tracker dashboard
- Alert/escalation logic backend
- File upload handling

**User will control:** Which task types require supplements, due date offsets (how many days after task completion), alert thresholds (remind at X days before due, escalate at Y days overdue)

---

## PROMPT 5: Evidence Tracker Framework

**For Cursor:**

Build evidence intake and tracking system. Requirements:

- Evidence record: ID, case_id, description, type (enum: physical, digital, video, photo, document), date_obtained, obtained_by (detective), obtained_from (location/source), current_location, current_custodian, status (intake/cataloged/analysis_pending/analysis_in_progress/analysis_complete/archive)
- Evidence intake form: fill in evidence details, auto-timestamp, auto-attach detective name
- Evidence detail view: show all metadata, custody chain (log of who had it, when), linked task (which task obtained this), linked supplement (analysis results)
- Evidence tracker dashboard: list all evidence for case, status filters
- Chain of custody log: timestamped entries of who possessed evidence, from when to when, for what purpose
- Evidence search: by type, status, date, custodian

**Output:**

- Evidence database schema
- Evidence intake form
- Evidence CRUD APIs
- Chain of custody log UI
- Evidence tracker dashboard

**User will control:** Evidence types, status values, which evidence requires linked supplements

---

## PROMPT 6: Timeline Framework (Case + Investigation)

**For Cursor:**

Build dual timeline visualization. Requirements:

- Timeline event record: ID, case_id, event_type (enum: case or investigation), description, timestamp, location, linked_to (task_id or evidence_id or person_id), source (detective narrative, video timestamp, phone data, etc.)
- Timeline entry form: quick entry (timestamp, description, type, link to case item)
- Timeline view: vertical timeline, events ordered by timestamp, color-coded by type (case=red, investigation=blue), hover shows details
- Overlay capability: show case timeline and investigation timeline on same view with visual separation
- Gap detection (optional, for later): "Victim location unknown 8pm-9am" highlighted as visual gap
- Timeline search: by date, description, linked item

**Output:**

- Timeline event database schema
- Timeline entry form
- Timeline CRUD APIs
- Timeline visualization (web component)
- Gap highlighting logic (optional)

**User will control:** Event types, colors/visual indicators, how events are displayed (linear, compact, detailed)

---

## PROMPT 7: Communication Framework (Notifications & Messaging)

**For Cursor:**

Build notification system that's flexible for different use cases (broadcast milestones vs. task assignment). Requirements:

- Notification record: ID, case_id, type (enum: task_assignment, milestone, alert, update, info), recipient (person or role), message, created_by, created_date, acknowledged (boolean)
- Notification rules (configurable by admin): 
  - Task assigned → notify assigned person + lead detective
  - Supplement filed → notify lead detective + DA (if applicable)
  - Milestone event (user-defined) → notify selected group
  - Alert (overdue supplement, blocked task) → notify lead detective
  - Broadcast → notify selected group (user picks recipients)
- Notification delivery: in-app, push to iPad, SMS (optional)
- Notification history: archive for audit trail
- Do-not-disturb: user can set quiet hours
- Read status: track if notification was seen

**Output:**

- Notification database schema
- Notification rule engine (configurable, not hardcoded)
- API for creating notifications
- Notification UI (inbox, history)
- Push notification integration (iOS for iPad)
- Admin panel to define notification rules

**User will control:** Which events trigger notifications, who gets notified for what, when broadcasts happen vs. narrow-cast, notification frequency

---

## PROMPT 8: Risk Assessment Form Integration Framework

**For Cursor:**

Build framework to tie Risk Assessment form to case data. Requirements:

- Risk Assessment form: structured form with sections (Situation, Suspect Info, Dangerous Items, Location Risk, Techniques/Equipment)
- Form data stored as: form_record_id, case_id, section_scores (Section A: 5 points, Section B: 12 points, etc.), total_score
- Auto-calculation: as fields are filled, total score updates
- Form linked to case: can update form after initial creation
- Score thresholds trigger alerts:
  - 1-19 points: "Supervisor present, investigation unit leads"
  - 20-24 points: "Consult SWAT Commander"
  - 25+ points: "SWAT assists, supervisor present"
- Form signature/approval: Lead Detective, Case Supervisor
- Audit trail: when form was filled, by whom, what changed

**Output:**

- Risk Assessment database schema
- Risk Assessment form UI (with auto-calculation)
- Form CRUD APIs
- Threshold logic and alerts
- Form history/audit trail

**User will control:** Section scoring rules, point thresholds and what they trigger, approval workflow

---

## PROMPT 9: Warrant Tracking Framework

**For Cursor:**

Build warrant lifecycle tracking. Requirements:

- Warrant record: ID, case_id, type (search warrant, arrest warrant, phone warrant, etc.), status (drafted/submitted/signed/served/results_documented), drafted_date, drafted_by, submitted_date, signed_date, signed_by_judge, served_date, served_by, results_documented_date
- Warrant detail view: full warrant text (upload), items to be seized, location, risk level
- Warrant status board: show all warrants for case, current status
- Warrant linked to: risk assessment (if applicable), evidence (what was obtained), task (which task obtained it)
- Milestones: when warrant is signed, option to broadcast to team or specific group
- Warrant audit trail: timestamp every status change

**Output:**

- Warrant database schema
- Warrant creation/editing form
- Warrant status tracking APIs
- Warrant tracker dashboard
- Milestone notification logic

**User will control:** Warrant types, status workflow, who gets notified when warrant is signed, how "warrant signed" milestone is communicated

---

## PROMPT 10: iPad Integration Framework

**For Cursor:**

Build iPad-specific features. Requirements:

- Responsive UI: all interfaces work on iPad (Safari, full-screen app if possible)
- Offline capability: critical data cached locally, sync when connection returns
- Task assignment on iPad: assigned detective taps to accept/view details
- Supplement filing on iPad: upload document (photo of report, or PDF), add notes
- Evidence intake on iPad: form entry with photo capture
- Timeline entry on iPad: quick entry (timestamp auto-filled, description, photo optional)
- Handwriting input: if using iPad native drawing app, ability to import notes/sketches
- Push notifications: badge updates when new tasks assigned
- Geolocation (optional): auto-tag evidence/timeline entries with location

**Output:**

- Responsive CSS for iPad
- Offline sync logic
- iOS push notification integration
- Geolocation API integration (optional)
- Mobile form UX optimization

**User will control:** Which features are available on iPad vs. desktop, push notification opt-in, geolocation privacy settings

---

## PROMPT 11: War Room Display Framework

**For Cursor:**

Build a large-screen display optimized for war room use. Requirements:

- War room dashboard: read-only view of case status, suitable for 55"+ screen
- Display layout: sections for Task Board (Kanban), Evidence Tracker, Timeline, Open Questions, Team Roster
- Real-time updates: when detective updates task on iPad, dashboard refreshes without manual refresh
- Display rotation (optional): cycle through different views (task board → timeline → evidence → risk assessment) on interval
- Readability: large fonts, high contrast, minimal scrolling
- Display mode: kick it to a TV/projector, starts in full-screen

**Output:**

- War room dashboard UI (fullscreen-optimized)
- WebSocket or polling for real-time updates
- Display layout configuration
- Projection-friendly CSS

**User will control:** Which sections display, refresh rate, layout arrangement, display rotation schedule

---

## PROMPT 12: Admin Configuration Panel Framework

**For Cursor:**

Build admin controls so user can customize the system without code changes. Requirements:

- Admin login (separate from case users)
- Task type management: create/edit task types, set default fields
- Tier templates: edit which tasks appear in Tier 1/2/3, reorder
- Supplement rules: which task types require supplements, due date offset
- Evidence types: custom evidence type list
- Notification rules: configure when notifications fire and to whom
- Warrant types: custom warrant types
- Timeline event types: custom event type list
- Risk Assessment form: edit section headings, point values, thresholds
- User management: create/edit roles, assign permissions
- Backup/export: case data export, audit log export

**Output:**

- Admin panel UI
- CRUD APIs for all configuration options
- Configuration database schema
- Permission checks (only admins can access)

**User will control:** Every operational detail (task types, notification rules, roles, form fields, etc.)

---

## Data Flow Architecture (Conceptual)

```
INTAKE
  ↓
Case created + Tier selected
  ↓
Task template loaded (user can edit before commit)
  ↓
Tasks created in "Pending" state
Supplements auto-created if required
  ↓
ACTIVE INVESTIGATION
  ↓
Detective receives task assignment (notification)
Detective opens iPad → views task details, location, linked evidence
Detective works task (interview, canvas, evidence collection)
Detective updates task status: In Progress → Waiting For → Complete
  ↓
If supplement required → auto-create supplement notification
Detective files supplement (upload document)
Supplement marked "Filed"
  ↓
Evidence collected → Evidence intake form
Evidence logged to tracker
Chain of custody starts
  ↓
Timeline events logged as investigation progresses
Lead detective views timeline overlay (case events vs. investigation events)
Gaps become visible → new canvass tasks created
  ↓
Warrant drafted → submitted → signed (milestone, notification per user config)
Warrant linked to evidence obtained
  ↓
Risk Assessment form auto-updates as information arrives
Score recalculated, thresholds checked, alerts if needed
  ↓
CLOSURE
  ↓
All supplements must be filed before case can close
Lead detective review: all tasks complete? all supplements filed?
Generate case summary (auto-compile all tasks, evidence, timeline, supplements)
Case moved to "Closed" status
Archive all documents
```

---

## Build Sequence Recommendation

1. **Prompts 1-3:** User auth + Case intake + Task management (core functionality)
2. **Prompts 4-5:** Supplement tracking + Evidence tracker (critical features)
3. **Prompts 6-7:** Timeline + Notifications (coordination layer)
4. **Prompts 8-9:** Risk assessment + Warrant tracking (operational forms)
5. **Prompts 10-12:** iPad integration + War room display + Admin panel (deployment)

---

## Control Points for User Customization

After Cursor builds each component, **user controls:**


| Framework           | User Customizes                                                    |
| ------------------- | ------------------------------------------------------------------ |
| Task Management     | Task types, statuses, transitions, display order                   |
| Supplement Tracking | Which tasks require supplements, due date rules, alert thresholds  |
| Evidence Tracker    | Evidence types, status values, custody rules                       |
| Timeline            | Event types, display colors, visual style                          |
| Notifications       | Trigger rules, recipient groups, delivery channels, do-not-disturb |
| Risk Assessment     | Sections, point values, score thresholds, approval workflow        |
| Warrants            | Warrant types, status workflow, milestone notifications            |
| Roles & Permissions | Role definitions, permission mapping                               |
| Admin Panel         | All of the above without touching code                             |


---

## Notes

- **No hardcoded business logic:** Everything should be configurable
- **Audit trail:** Every change timestamped and attributed to user
- **Flexibility first:** Build so user can add new roles, task types, evidence types, etc. via admin panel
- **Human context preserved:** System enables broadcast milestones, team celebrations, rites of passage — user decides when/how
- **Framework, not fully-specified features:** Cursor builds the structure; user fills in operational details

