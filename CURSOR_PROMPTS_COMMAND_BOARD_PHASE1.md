# Cursor Prompts: Command Board (Phase 1)

## Small, Focused Chunks — One Component Per Prompt

**Goal:** Build the Command Board system in relative chunks. Each prompt is standalone, achievable in one session, minimal complexity.

**Dependency Chain:** Foundation → Core Components → Advanced Features

---

## FOUNDATION LAYER (Prompts 1-2)

### PROMPT 1: Database Schema (Command Board)

**For Cursor:**

Create the database schema and table structure for the Command Board system. Do NOT build APIs yet. Schema only.

**Tables Required:**

```
Cases/Complaints:
- complaint_id (primary key)
- case_agent_id (foreign key to users)
- case_status (enum: active, investigation, closed, cold_case)
- tier (enum: 1, 2, 3)
- incident_type (text: homicide, assault, robbery, etc.)
- location (lat/long, address)
- date_called (timestamp)
- date_created (timestamp)

Personnel Assignments:
- assignment_id (primary key)
- complaint_id (foreign key)
- detective_id (foreign key to users)
- role (text: lead_detective, co_lead, supervisor, interviewer, etc.)
- assigned_date (timestamp)
- status (enum: active, on_leave, unavailable, handed_off)
- assigned_by (user_id who made assignment)
- notes (text)

Handover Logs:
- handover_id (primary key)
- assignment_id (foreign key)
- from_detective_id (foreign key)
- to_detective_id (foreign key)
- reason (text: sick, emergency, vacation, transferred)
- expected_duration (text)
- start_time (timestamp)
- end_time (timestamp, nullable)
- briefing_sent (boolean)
- status (enum: in_progress, completed)

Victims:
- victim_id (primary key)
- complaint_id (foreign key)
- name (text)
- dob (date)
- race (text)
- gender (text)
- address (text)
- phone (text)
- status (enum: deceased, injured, missing, other)

Victim Details (Hierarchical):
- detail_id (primary key)
- victim_id (foreign key)
- category (enum: immediate_family, extended_family, friends, work, social, neighborhood, property, behavioral)
- relationship (text)
- contact_name (text)
- contact_phone (text)
- contact_address (text)
- interview_status (enum: pending, interviewed, declined)
- link_sent_date (timestamp, nullable)
- link_expires_date (timestamp, nullable)
- notes (text)

Suspects:
- suspect_id (primary key)
- complaint_id (foreign key)
- description (text)
- weapon_type (text, nullable)
- vehicle_description (text, nullable)
- last_seen_location (lat/long, nullable)
- threat_level (enum: immediate, high, medium, low)
- bolo_issued (boolean)
- bolo_date (timestamp, nullable)
- status (enum: unknown, identified, apprehended, deceased)

Evidence:
- evidence_id (primary key)
- complaint_id (foreign key)
- item_description (text)
- location_found (lat/long)
- date_found (timestamp)
- collected_by (user_id)
- chain_of_custody (JSON: array of {person, time, action})
- analysis_status (enum: not_started, in_progress, complete, pending)
- analysis_type (text: ballistics, dna, fingerprint, etc.)
- notes (text)

Timeline Events:
- event_id (primary key)
- complaint_id (foreign key)
- event_type (enum: crime_event, investigation_milestone)
- event_title (text)
- event_time (timestamp)
- location (lat/long)
- description (text)
- created_by (user_id)
- created_date (timestamp)

FACT/WITHIN/VERIFY:
- fwv_id (primary key)
- complaint_id (foreign key)
- fact_statement (text)
- within_hypothesis (text: what I think I know)
- verify_steps (text: how to confirm)
- verified_status (enum: unverified, in_progress, verified)
- priority (enum: critical, high, medium, low)
- created_by (user_id)
- created_date (timestamp)
- updated_date (timestamp)

Interview Tracking:
- interview_id (primary key)
- complaint_id (foreign key)
- person_id (text: could be victim contact, witness, etc.)
- interview_type (enum: witness, suspect, family, expert)
- interview_status (enum: pending, scheduled, completed, declined)
- interview_date (timestamp, nullable)
- interviewed_by (user_id, nullable)
- link_sent_date (timestamp, nullable)
- link_expires_date (timestamp, nullable)
- notes (text)

Investigation Tasks:
- task_id (primary key)
- complaint_id (foreign key)
- task_title (text)
- task_description (text)
- assigned_to (user_id)
- assigned_date (timestamp)
- due_date (date)
- priority (enum: critical, high, medium, low)
- status (enum: not_started, in_progress, on_hold, complete)
- updated_date (timestamp)
- updated_by (user_id)
```

**Output:**

- SQL schema (PostgreSQL)
- Foreign key relationships documented
- Indexes for frequently-searched fields (complaint_id, detective_id, case_status)
- No data; no APIs; schema only

**User Controls:**

- Table names, field names, data types
- Enum values
- Required vs. optional fields
- Index strategy

---

### PROMPT 2: API Layer (CRUD Endpoints)

**For Cursor:**

Build REST API endpoints for the schema from Prompt 1. Do NOT build UI. Endpoints only.

**Endpoints Required:**

```
CASES:
GET /api/cases — list all cases (paginated)
GET /api/cases/:id — get single case
POST /api/cases — create new case
PATCH /api/cases/:id — update case status
GET /api/cases/:id/status — get full case status (all related data)

PERSONNEL ASSIGNMENTS:
GET /api/cases/:id/personnel — list all personnel for a case
POST /api/cases/:id/personnel — assign new person to case
PATCH /api/cases/:id/personnel/:assignment_id — update assignment
DELETE /api/cases/:id/personnel/:assignment_id — remove assignment

HANDOVERS:
POST /api/cases/:id/personnel/:assignment_id/handover — initiate handover
PATCH /api/cases/:id/handover/:handover_id — update handover status
GET /api/cases/:id/handover/log — get all handovers for a case

VICTIMS & VICTIM DETAILS:
POST /api/cases/:id/victims — add victim to case
GET /api/cases/:id/victims — list all victims
PATCH /api/cases/:id/victims/:victim_id — update victim info
GET /api/cases/:id/victims/:victim_id/details — get victimology tree
POST /api/cases/:id/victims/:victim_id/details — add detail entry (family, friends, work, etc.)
PATCH /api/cases/:id/victims/:victim_id/details/:detail_id — update detail

SUSPECTS:
POST /api/cases/:id/suspects — add suspect
GET /api/cases/:id/suspects — list all suspects
PATCH /api/cases/:id/suspects/:suspect_id — update suspect info
POST /api/cases/:id/suspects/:suspect_id/bolo — issue BOLO

EVIDENCE:
POST /api/cases/:id/evidence — log evidence
GET /api/cases/:id/evidence — list all evidence
PATCH /api/cases/:id/evidence/:evidence_id — update evidence
POST /api/cases/:id/evidence/:evidence_id/coc — add chain of custody entry

TIMELINE:
POST /api/cases/:id/timeline — add timeline event
GET /api/cases/:id/timeline — list all timeline events
PATCH /api/cases/:id/timeline/:event_id — update timeline event

FACT/WITHIN/VERIFY:
POST /api/cases/:id/fwv — create F/W/V entry
GET /api/cases/:id/fwv — list all F/W/V entries
PATCH /api/cases/:id/fwv/:fwv_id — update F/W/V entry

INTERVIEWS:
POST /api/cases/:id/interviews — create interview record
GET /api/cases/:id/interviews — list interviews
PATCH /api/cases/:id/interviews/:interview_id — update interview status
POST /api/cases/:id/interviews/:interview_id/send-link — generate and send interview link

TASKS:
POST /api/cases/:id/tasks — create task
GET /api/cases/:id/tasks — list tasks (filterable by status, assignee, priority)
PATCH /api/cases/:id/tasks/:task_id — update task (status, assignee, etc.)
GET /api/cases/:id/tasks/:task_id/history — get task change history
```

**Input Validation:**

- Required fields cannot be empty
- Enum fields validate against allowed values
- Foreign key references validate existence
- Timestamps auto-set by system

**Output:**

- REST endpoint documentation
- Request/response examples for each endpoint
- Error handling (404, 400, 401, 500)
- No UI; endpoints only

**User Controls:**

- Endpoint names, HTTP methods
- Required fields per endpoint
- Validation rules
- Response formats

---

## DESKTOP UI FOUNDATION (Prompts 3-5)

### PROMPT 3: Desktop Layout Shell (No Data)

**For Cursor:**

Build the responsive desktop UI layout for Command Board. Structure only, no data binding, no API calls yet.

**Layout Structure:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ HEADER (Case info, tier, status, time called)                           │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐  ┌─────────────────────────────────────────┐  │
│ │ SIDEBAR              │  │ MAIN CONTENT AREA                       │  │
│ │ ┌─────────────────┐  │  │ (Tabbed: Timeline, Task, Evidence, etc) │  │
│ │ [ ] Personnel     │  │  │                                         │  │
│ │ [ ] Victimology   │  │  │ [TAB] Timeline                         │  │
│ │ [ ] Suspects      │  │  │ [TAB] Tasks                            │  │
│ │ [ ] Evidence      │  │  │ [TAB] Interviews                       │  │
│ │ [ ] FACT/WITHIN   │  │  │ [TAB] F/W/V                            │  │
│ │ [ ] Interviews    │  │  │ [TAB] Personnel                        │  │
│ │ [ ] Map           │  │  │ [TAB] Suspects                         │  │
│ │ [ ] Search (^F)   │  │  │ [TAB] Evidence                         │  │
│ │                   │  │  │ [TAB] Map                              │  │
│ └─────────────────┘  │  │                                         │  │
└──────────────────────┴──────────────────────────────────────────────────┘
```

**Responsive:**

- Full desktop: sidebar + main area side-by-side
- Tablet: sidebar collapses to icons
- Mobile: sidebar becomes drawer menu

**Styling:**

- Dark theme (war room display suitable)
- Clear hierarchy, minimal clutter
- Tab navigation (click to switch views)
- No data in tables yet (just column headers)

**Output:**

- HTML/CSS skeleton (or React components with placeholder content)
- Responsive grid layout
- Tab navigation working (clicks change tabs)
- No API integration yet

**User Controls:**

- Colors, fonts, spacing
- Sidebar width
- Tab names and order

---

### PROMPT 4: Header & Status Bar Component

**For Cursor:**

Build the header bar (top of Command Board). Displays case info, tier, status, time info.

**Header Contains:**

```
╔═══════════════════════════════════════════════════════════════════╗
║ COMPLAINT #: 250712-XXXX  |  INCIDENT: Homicide (I-24 Shooting)   ║
║ TIER: 3 (Critical)  |  TIME CALLED: 11:33am  |  TIME CTRL: 11:52am ║
║ STATUS: [ACTIVE]  |  ELAPSED: 6h 27m  |  LEAD: Stanley (CID-47)    ║
╚═══════════════════════════════════════════════════════════════════╝
```

**Dynamic Fields:**

- Complaint number
- Incident type
- Tier (color-coded: Tier 1=blue, Tier 2=orange, Tier 3=red)
- Status (color-coded)
- Time called (from API)
- Time control taken (from API)
- Elapsed time (calculated real-time)
- Lead detective (from personnel API)
- If supervisor on-scene: "Supervisor: McPherson"

**Interaction:**

- Click complaint number → open case details panel (not built yet)
- Click tier badge → shows tier info (not built yet)
- Click lead detective → shows their contact info (not built yet)

**Output:**

- React component with prop-based data
- Real-time elapsed time calculation
- Color-coded status indicators
- Responsive (shrink gracefully on smaller screens)

**User Controls:**

- Colors for each tier
- Time format (12hr vs 24hr)
- Fields displayed in header

---

### PROMPT 5: Personnel Roster Panel

**For Cursor:**

Build the Personnel Roster display (list of who's assigned to case, their role, status, location).

**Table Columns:**

```
Role                   Name              Badge    Location          Status      Action
────────────────────────────────────────────────────────────────────────────────────────
Lead Detective         Stanley           CID-47   Ravine/Body       Active      [···]
Supervisor             McPherson         Sgt-12   Perimeter         Active      [···]
Crime Scene Tech       Kendall           CST-08   Evidence Area     Active      [···]
Evidence Photographer  Brown              CST-09   Vehicle Area      Active      [···]
Sketch Tech            Jones              CST-10   Staging Area      Active      [···]
Patrol Unit 1          Smith              LP-456   I-24 North        Active      [···]
Patrol Unit 2          Johnson            LP-457   I-24 South        Active      [···]
Detective (Interviews) Rodriguez          CID-48   Staging Area      Active      [···]
Medical Examiner       Davis              ME-555   Body Location     Active      [···]
```

**Features:**

- Sortable by: Role, Name, Badge, Location
- Searchable by: Name, Badge, Role
- Color-coded Status: Active=green, On-Leave=yellow, Unavailable=red
- [···] menu per row (not functional yet)

**Data Source:**

- GET /api/cases/:id/personnel endpoint

**Output:**

- React table component
- Sorting functionality
- Search/filter input
- Status color-coding
- Click row → shows personnel detail panel (panel not built yet)

**User Controls:**

- Column order
- Column visibility (hide/show columns)
- Default sort order
- Color scheme for statuses

---

## DATA DISPLAY COMPONENTS (Prompts 6-11)

### PROMPT 6: Victimology Tree (Display Mode)

**For Cursor:**

Build the Victimology Tree display (read-only hierarchical view).

**Structure:**

```
VICTIM 1: John Smith, DOB 1955 (70yo, White Male)
├─ DEMOGRAPHICS & CONDITION
│  ├─ Physical: 5'10", 180 lbs, gray hair, glasses
│  ├─ Location Found: I-24 ravine, ~30 yards, in vehicle
│  └─ Status: Deceased at scene
│
├─ IMMEDIATE FAMILY (3 contacts)
│  ├─ Sarah Smith (Wife) — interviewed
│  ├─ Michael Smith (Son) — pending
│  └─ Jennifer Smith (Daughter) — pending
│
├─ EXTENDED FAMILY (2 contacts)
│  └─ [collapsed]
│
└─ [More categories collapsed]
```

**Interactive:**

- Expand/collapse each category
- Click on person → shows full detail (interview status, link expiration, notes)
- Shows interview status icons (✓ interviewed, ⏳ pending, ✗ declined)

**Data Source:**

- GET /api/cases/:id/victims/:victim_id/details

**Output:**

- React tree component
- Expand/collapse working
- Click to show person detail (in modal or side panel)
- Interview status indicators

**User Controls:**

- Category names and order
- Expand/collapse default state
- Color scheme

---

### PROMPT 7: Victimology Tree (Edit Mode)

**For Cursor:**

Build the edit mode for Victimology Tree. Add, edit, delete person entries.

**Features:**

- Click [+ Add Family Member] → form appears
- Form fields: Name, Relationship, Contact phone, Contact address, Notes
- Click on existing person → form appears with pre-filled data
- [Save] button → POST/PATCH to API
- [Delete] button → confirm and DELETE

**Output:**

- Form component for adding/editing
- Input validation (name required, phone format, etc.)
- Save/cancel buttons
- API integration (POST for new, PATCH for edit, DELETE)
- Success notification on save

**User Controls:**

- Form field labels
- Required vs optional fields
- Validation messages

---

### PROMPT 8: Suspect Tracker (Display Mode)

**For Cursor:**

Build Suspect information display (read-only).

**Display Format:**

```
SUSPECT 1: UNKNOWN — ACTIVE MANHUNT

DESCRIPTION:
├─ Physical: Race, approx age, height, build
├─ Clothing: Description
├─ Weapon: 9mm pistol (inferred from shell casings)
└─ Vehicle: Blue pickup, fled northbound

CONNECTIONS TO VICTIM:
├─ Known to victim?: Unknown
├─ Motive (Hypothesis): Robbery? Personal? Mistaken identity?
└─ Prior relationship: Unknown

PRIOR CRIMINAL HISTORY:
├─ Arrests: [Pending — databases]
├─ Convictions: [Pending]
└─ Weapons charges: [Pending]

CURRENT STATUS:
├─ Location: UNKNOWN — ACTIVE BOLO
├─ Threat Level: IMMEDIATE (armed, active threat)
└─ BOLO Issued: 7/12 5:30pm
```

**Data Source:**

- GET /api/cases/:id/suspects

**Output:**

- React component with hierarchical display
- Expandable sections
- Status color-coded (threat level: red/orange/yellow/green)
- Suspect count (supports multiple suspects)

**User Controls:**

- Section names and order
- Color coding for threat levels

---

### PROMPT 9: Suspect Tracker (Edit Mode)

**For Cursor:**

Build edit mode for Suspect information. Add, edit, delete suspects.

**Features:**

- Click [+ Add Suspect] → form appears
- Form fields: Physical description, Clothing, Weapon, Vehicle, Relationship to victim, Motive hypothesis, etc.
- Click on existing suspect → edit form
- [BOLO] button → marks BOLO as issued, records timestamp

**Output:**

- Form component
- Save/delete/BOLO buttons
- API integration
- Validation

---

### PROMPT 10: FACT/WITHIN/VERIFY Tracker (Display Mode)

**For Cursor:**

Build the F/W/V tracker (3-column display, read-only).

**Format:**

```
FACT (What I Know for Fact)           WITHIN (What I Think I kNow)           VERIFY (How to Confirm)
─────────────────────────────────────────────────────────────────────────────────────────────────────
✓ Victim found in ravine (confirmed)  Victim was shot at location, not      [ ] Scene reconstruction
  Status: VERIFIED                    transported and dumped                [ ] Witness statements
                                                                              [ ] Ballistics evidence

✓ GSW to chest (confirmed by ME)      Single shot? Multiple shots?          [ ] ME autopsy
  Status: VERIFIED                                                           [ ] Gunshot residue

✓ 9mm shell casings found             Suspect armed with 9mm                [ ] Ballistics match
  Status: VERIFIED                                                           [ ] Gun registry

✗ "Robbery" — assumption              Could be robbery, could be personal   [ ] Wallet inventory
  Status: UNVERIFIED                  dispute, mistaken identity             [ ] Family debt check
                                                                              [ ] Gang check

? Suspect vehicle "blue pickup"       Suspect fled in this vehicle          [ ] Traffic cameras
  Status: IN PROGRESS                                                        [ ] Parking lot video
```

**Color-Coding:**

- Green = Verified ✓
- Yellow = In Progress (actively being verified)
- Red = Unverified ✗
- Gray = Hypothesis (?—not yet assigned to verify)

**Interactive:**

- Click row → expands to show full text
- Filter by status (verified, unverified, in-progress)
- Sort by priority (critical → high → medium → low)

**Data Source:**

- GET /api/cases/:id/fwv

**Output:**

- React table component
- Color-coded status
- Expandable rows
- Filter/sort controls

---

### PROMPT 11: FACT/WITHIN/VERIFY Tracker (Edit Mode)

**For Cursor:**

Build edit mode for F/W/V tracker. Create, edit, delete entries.

**Features:**

- Click [+ Add Entry] → form appears
- Form fields: Fact statement, Within hypothesis, Verify steps, Priority, Status
- Click on existing entry → edit form
- Update status (unverified → in-progress → verified)

**Output:**

- Form component
- Status selector dropdown
- Priority selector
- Save/delete buttons
- API integration

---

## TIMELINE & MAP (Prompts 12-14)

### PROMPT 12: Timeline Visualization (Crime Events)

**For Cursor:**

Build timeline view showing crime events (the incident timeline, not investigation timeline).

**Display Format:**

```
CRIME TIMELINE

11:00am ····· ~Shooting occurs [Unknown exact time]
         │
11:05am ····· Victim in ravine [Estimated by witness]
         │
11:20am ····· 911 call received [Confirmed by 911 audio]
         │
11:33am ····· First responders arrive [Fire/EMS/Police]
```

**Interactive:**

- Hover over event → shows full details
- Click event → opens detail panel
- Zoom in/out to change time scale
- Can toggle between "Crime Timeline" and "Investigation Timeline"

**Data Source:**

- GET /api/cases/:id/timeline?event_type=crime_event

**Output:**

- React timeline component
- Vertical timeline with events
- Time labels, event descriptions
- Click to detail

**User Controls:**

- Time format (12hr vs 24hr)
- Colors for event types
- Zoom levels

---

### PROMPT 13: Timeline Visualization (Investigation Events)

**For Cursor:**

Build investigation event timeline (what detectives did, when).

**Display Format:**

```
INVESTIGATION TIMELINE

11:43am ····· County detective Stanley arrives, takes command
         │
11:52am ····· Scene secured, jurisdiction asserted
         │
12:15pm ····· ME arrives, preliminary exam begins
         │
12:30pm ····· Scene walkthrough begins
         │
1:30pm  ····· Firearm recovered from brush
         │
2:30pm  ····· Initial evidence photography complete
         │
5:30pm  ····· Suspect vehicle alert broadcast
```

**Interactive:**

- Same as crime timeline
- Can overlay both timelines (show crime events + investigation events on same view)

**Data Source:**

- GET /api/cases/:id/timeline?event_type=investigation_milestone

**Output:**

- React timeline component (reuse from Prompt 12)
- Switchable between crime/investigation/both

---

### PROMPT 14: Map Integration (Timeline Pins)

**For Cursor:**

Build map display with timeline events pinned to locations.

**Map Features:**

- Crime event location (red pin)
- Investigation milestones (blue pins)
- Evidence found locations (green pins)
- Witness interview locations (yellow pins)
- Suspect sighting locations (orange pins)
- Click pin → shows event details
- Zoom/pan works normally

**Data Source:**

- GET /api/cases/:id/timeline (includes lat/long)

**Output:**

- Map component (Mapbox, Leaflet, or Google Maps)
- Pinned events with color-coding
- Click pin → show event details
- Zoom/pan controls

**User Controls:**

- Map provider (if choice available)
- Pin colors
- Default zoom level

---

## TASK MANAGEMENT (Prompts 15-17)

### PROMPT 15: Task List (Display Mode)

**For Cursor:**

Build task list display (read-only, sortable, filterable).

**Table:**

```
TASK                              ASSIGNED TO   DUE       STATUS   PRIORITY   DAYS LEFT
─────────────────────────────────────────────────────────────────────────────────────────
Interview victim's family         Stanley       Today     In Prog  CRITICAL   4hrs
BOLO broadcast for suspect        Dispatch      Today     Done     CRITICAL   ✓
Secure weapon evidence            Kendall       Today     Done     HIGH       ✓
Interview 911 caller              Rodriguez     Today     Assign   HIGH       4hrs
Canvass neighborhood              Smith/Jones   Today     In Prog  HIGH       6hrs
Pull traffic camera footage       IT            Tomorrow  Assign   MEDIUM     24hrs
Ballistics analysis               Lab           5 days    Submit   MEDIUM     5 days
Gunshot residue testing           Lab           3 days    Submit   MEDIUM     3 days
```

**Interactive:**

- Click task → shows full details (description, notes, due date, assignee)
- Sort by: Due date, Priority, Status, Assignee
- Filter by: Status (not started, in progress, done), Priority, Assignee
- Color-coded: Critical=red, High=orange, Medium=yellow, Low=gray

**Data Source:**

- GET /api/cases/:id/tasks

**Output:**

- React table component
- Sorting/filtering working
- Click row → detail panel
- Status/priority color-coding

---

### PROMPT 16: Task List (Create/Edit/Assign/Reassign)

**For Cursor:**

Build task management: create new tasks, edit existing, assign/reassign.

**Features:**

- [+ Create Task] → form with: Title, Description, Assigned to, Due date, Priority
- Click existing task → edit form
- [Reassign] button → change assignee (with notification)
- [Status] dropdown → update status
- [Delete] button → remove task

**Output:**

- Form component
- Assignee dropdown (filtered by available personnel)
- Due date picker
- Priority selector
- Save/delete/reassign buttons
- API integration

---

### PROMPT 17: Handover Management (Trigger & Logging)

**For Cursor:**

Build role handover initiation and logging. Handles ANY role becoming unavailable.

**Process:**

```
PERSONNEL ROSTER → Click [···] on person → Menu appears:
                   - View Details
                   - Mark Unavailable
                   - [Other options]

Click "Mark Unavailable" → Dialog:
  - Reason: [Sick / Emergency / Vacation / Transferred / Other]
  - Expected Duration: [Hours / Days / Unknown]
  - Reassign to: [Dropdown of available personnel with same role]
  - [SAVE HANDOVER]

System:
  ✓ Logs handover (from → to, reason, time, duration)
  ✓ Sends briefing document to new person
  ✓ Notifies supervisor + team of change
  ✓ Reassigns any pending tasks (if >4 hours)
  ✓ Updates personnel roster (shows new person in role)
```

**Data:**

- POST /api/cases/:id/personnel/:assignment_id/handover (initiate)
- PATCH /api/cases/:id/handover/:handover_id (update status)
- GET /api/cases/:id/handover/log (view handover history)

**Output:**

- Dialog/modal for initiating handover
- Handover log display (showing all handovers for case)
- Automatic notifications
- Task reassignment (if duration >4 hours)

**User Controls:**

- Handover reason options
- Duration categories

---

## iPAD INPUT MODES (Prompts 18-20)

### PROMPT 18: iPad Layout (Form Entry Mode)

**For Cursor:**

Build iPad layout optimized for scene entry. Portrait/landscape responsive.

**Layout:**

```
┌─────────────────────────────────────┐
│ HEADER: Case #, Date, Time, Location│
├─────────────────────────────────────┤
│ [TAB] Notes  [TAB] Evidence         │
│ [TAB] Interview [TAB] Suspect Info  │
├─────────────────────────────────────┤
│ FORM AREA (Large input boxes)       │
│                                     │
│ [ Text Entry Field ]                │
│ [ Large Text Area for Notes ]       │
│ [ Evidence Description ]            │
│ [ Location (GPS or map pin) ]       │
│                                     │
│ [SUBMIT] [CLEAR] [HANDWRITE MODE]   │
│                                     │
└─────────────────────────────────────┘
```

**Responsive:**

- Portrait: Full screen form, tabs below
- Landscape: Side-by-side tabs and form
- Large touch targets (buttons, inputs)

**Output:**

- React Native or responsive web component
- Tab navigation working
- Form inputs functional (no API yet)

---

### PROMPT 19: iPad Handwriting Recognition (OCR to Text)

**For Cursor:**

Build handwriting-to-text conversion on iPad. Detective writes → system converts to text.

**Features:**

- [HANDWRITE MODE] button → opens canvas
- Detective draws/writes on iPad screen
- When done, click [CONVERT TO TEXT]
- System runs OCR
- Text appears in text field above
- Can edit text manually
- Click [SAVE] → goes to appropriate field (Victimology? Evidence? Suspect? Auto-categorize based on content)

**Library/Tool:**

- Use web-based OCR (Google Vision API, Tesseract.js, or similar)
- Handwriting-to-text is known hard problem; acknowledge accuracy ~70-80% (user should review/edit)

**Output:**

- Canvas component for handwriting capture
- OCR integration
- Text output field (editable)
- Auto-categorization logic (if text starts with "Victim..." → suggest victimology)

---

### PROMPT 20: iPad Voice Note Recording

**For Cursor:**

Build voice recording capability (hands-free).

**Features:**

- [VOICE NOTE] button → starts recording
- Visual indicator (recording light/timer)
- Recording icon with time elapsed
- [STOP] → ends recording, saves audio
- [TRANSCRIBE] → converts audio to text (optional, may not be available)
- [ATTACH TO CASE] → saves audio file to case, creates text transcript if available

**Output:**

- Audio recorder component
- Save audio to case file
- Auto-transcription (optional)
- Attach transcript to relevant section

---

## SYNC & REAL-TIME (Prompts 21-22)

### PROMPT 21: WebSocket Sync Engine (Desktop ↔ iPad ↔ Database)

**For Cursor:**

Build real-time sync between desktop Command Board and iPad input. When iPad submits data, desktop updates immediately (no page refresh).

**Architecture:**

- WebSocket connection (not polling)
- When iPad saves data → POST to API → WebSocket broadcast to desktop
- When desktop gets update → table refreshes, timeline updates, etc.
- Bi-directional: desktop update → iPad sees it

**Features:**

- Real-time task list updates
- Real-time personnel changes
- Real-time evidence logging
- Real-time timeline updates
- Conflict resolution (if two people edit same field, last-write-wins or merge)

**Output:**

- WebSocket server implementation
- Client-side sync logic (React hooks or similar)
- Event broadcasting
- Reconnection handling (if connection drops)

---

### PROMPT 22: Offline Mode (iPad Can Work Offline)

**For Cursor:**

Build offline capability for iPad. Detective can fill out form offline, syncs when connected.

**Features:**

- Check for internet connection
- If offline: work locally, store data in browser storage/local DB
- When connection restored: sync to server
- Conflict resolution (if case was updated by someone else while offline)

**Output:**

- Offline detection
- Local storage mechanism (IndexedDB or similar)
- Sync queue (when online, sync queued changes)
- Conflict resolution logic

---

## ADMIN & TESTING (Prompts 23-24)

### PROMPT 23: Test Data Generator

**For Cursor:**

Build a script/component to populate Command Board with realistic sample data for testing/demo.

**Generates:**

- Sample case with complaint number
- Sample victims (with family trees)
- Sample suspects
- Sample evidence
- Sample timeline events
- Sample tasks
- Sample F/W/V entries
- Sample interviews

**Usage:**

- Run once to populate test data
- Allows testing UI without manually entering everything
- Can be reset/cleared for next test

**Output:**

- Script that calls APIs to create sample data
- Or button in admin panel to generate test data

---

### PROMPT 24: Admin Panel (Basic)

**For Cursor:**

Build simple admin panel for case management, user management, system status.

**Features:**

- List all cases (create, delete, archive)
- List all users (create, deactivate)
- View system health (API status, database status, sync status)
- View API logs (recent requests)
- Clear test data

**Output:**

- Admin panel UI
- Basic case/user CRUD
- System status display

---

## BUILD SEQUENCE (Phase 1)

**Foundation First:**

1. Prompt 1: Database schema
2. Prompt 2: API endpoints

**Desktop UI Foundation:**
3. Prompt 3: Layout shell
4. Prompt 4: Header component
5. Prompt 5: Personnel roster

**Data Components (Display Mode):**
6. Prompt 6: Victimology tree (display)
7. Prompt 8: Suspect tracker (display)
8. Prompt 10: FACT/WITHIN/VERIFY (display)

**Timeline & Map:**
9. Prompt 12: Crime timeline
10. Prompt 13: Investigation timeline
11. Prompt 14: Map integration

**Task Management:**
12. Prompt 15: Task list (display)

**Edit Modes (after display versions work):**
13. Prompt 7: Victimology tree (edit)
14. Prompt 9: Suspect tracker (edit)
15. Prompt 11: FACT/WITHIN/VERIFY (edit)
16. Prompt 16: Task list (manage/assign)

**Role Management:**
17. Prompt 17: Handover management

**iPad Input:**
18. Prompt 18: iPad layout
19. Prompt 19: Handwriting recognition
20. Prompt 20: Voice notes

**Sync & Offline:**
21. Prompt 21: WebSocket sync
22. Prompt 22: Offline mode

**Admin & Testing:**
23. Prompt 23: Test data generator
24. Prompt 24: Admin panel

---

## DEPENDENCY NOTES

- Prompts 1-2 must complete first (all others depend on database/API)
- Prompts 3-5 establish UI foundation for others
- Prompts 6-11 are display components (can be built in any order after 3-5)
- Prompt 12-14 depend on timeline data structure (from API)
- Prompts 18-22 depend on API endpoints existing
- Prompts 23-24 are optional (for testing/admin)

---

## EACH PROMPT IS:

- ✓ Single-focus (one component/feature)
- ✓ Achievable in one session
- ✓ Clear success criteria
- ✓ Dependencies noted
- ✓ Minimal complexity (one prompt = one class/component typically)

