# CID Case Management System — Requirements & Brainstorm

**Project Purpose:** Replace whiteboard-based case management and fragmented text/email communication with a real-time, role-based digital command board for homicide and major case investigations. Enable seamless coordination across distributed teams, persistent tracking of decisions and evidence, and eliminate breakdowns in task assignment and completion visibility.

---

## Current System Problems (As-Is Analysis)

### Whiteboard-Based War Room
- **Single location only** — remote detectives, night shift, DA's office have no visibility
- **Ephemeral** — information gets erased and overwritten; no audit trail
- **Implicit status** — task ownership and completion status are marked by color/abbreviations (Gammel, Fincon, Burned) with no legend
- **Mixed content** — tasks, evidence, witnesses, vehicle info all jumbled together with no clear categorization
- **No timeline** — despite case notes containing granular timelines, the whiteboard has no temporal sequence
- **Duplicated effort** — no visibility into what others are doing; requests may be duplicated
- **Shift handoffs are painful** — incoming shift must spend 15+ minutes deciphering abbreviations and status

### Text-Based Communication (iMessage group 15 people)
- **Lost in the noise** — detectives get messages while focused on another task and miss critical info
- **Unclear routing** — messages broadcast to everyone; person who should act on it may ignore it thinking "not my assignment"
- **No accountability** — who got the message? Who's supposed to act? No way to track.
- **Context collapse** — "Sw signed" (search warrant?), "Arrest warrants signed," "Items to be seized" all appear in stream without clear connection
- **No persistent reference** — scrolling back through 200 messages to find "what was the status on the Roku warrant?"
- **Evidence details get lost** — "Yes. Terminate AT&T pings please. Thank you." appears inline without linking to what pings, why, or whether it was done

### Case Notes (Detective's Notebook)
- **Chronological narrative only** — excellent for documenting process but hard to query
- **Cross-references are manual** — "Det. [X] case notes" requires knowing other detective's work exists
- **Supplement tracking is invisible** — no structured way to know which follow-ups are outstanding
- **External dependencies are buried** — "Awaiting TBI results," "Subpoena served 7/16," etc. appear in prose; no separate tracking

### Supplement & Report Completion Crisis
- **Lead detective's nightmare** — no visibility into which detectives have filed required follow-up reports (supplements)
- **Implicit knowledge** — "I think Jones filed a supplement on the doorbell footage" vs. confirmed fact
- **Accountability gap** — a supplement may be overdue and nobody knows until it's too late
- **Prosecutor pain** — DA asks "is the analysis on the shell casings documented?" and you have to go back through files to find it

---

## Desired System (To-Be Solution)

### Core Principle
**Single source of truth with real-time synchronization across all roles, devices, and locations.**

### Key Features

#### 1. Intelligent Task Assignment & Routing
- **Tasks are assigned to roles, not broadcast to everyone**
  - Example: "Canvas neighborhood for witnesses" → assigned to "Canvass Lead" (whoever fills that role)
  - Only people with that role get the notification
  - If role changes hands, task follows the person
  
- **Task types auto-populate from case templates**
  - Tier 1 (routine): ~5 tasks
  - Tier 2 (suicide/aggravated assault): ~15 tasks  
  - Tier 3 (homicide/mass casualty): ~30+ tasks
  
- **Each task includes:**
  - What: Clear description of work
  - Why: Context/case theory link
  - Who: Assigned detective(s)
  - Status: Pending → In Progress → Waiting For → Blocked → Complete
  - Deadline: With escalation if missed
  - Supplement required: Yes/No + link to required form

#### 2. Supplement Tracking (Critical Feature)
- **Every investigative action that requires documentation gets a linked supplement entry**
  - Interview conducted? → Supplement required (interview report)
  - Evidence collected? → Supplement required (chain of custody, analysis)
  - Warrant served? → Supplement required (results documented)
  - Canvas completed? → Supplement required (findings report)

- **Dashboard shows:**
  ```
  TASK                          ASSIGNED   STATUS    SUPPLEMENT    SUPPLEMENT DUE
  ─────────────────────────────────────────────────────────────────────────────
  Interview victim's GF         Jones      Complete  Required ✓   ✓ Filed 7/14
  Canvass 3-block radius        Smith      Complete  Required ✗   ⚠ OVERDUE 7/17
  Evidence: Doorbell footage    Whitaker   Complete  Required ✗   ⚠ OVERDUE 7/18
  Trash pull analysis           Brown      Complete  Required ✓   ✓ Filed 7/16
  ```

- **Lead detective view shows at a glance:**
  - Which supplements are filed and on time
  - Which are overdue
  - Who's responsible
  - Escalation alerts

#### 3. Evidence Tracker with Chain of Custody
- **Every piece of evidence has a persistent record:**
  ```
  EVIDENCE              TYPE      OBTAINED   OBTAINED BY   FROM WHERE      STATUS
  ──────────────────────────────────────────────────────────────────────────────
  Phone CDR - Jade      Digital   7/13       Whitaker      AT&T subpoena   Analyzed
  Video - I-24 MM64.8   Video     7/12       CSI           TDOT cameras    Reviewed
  Shell casings (6)     Physical  7/12       CSI           Scene           At TBI lab
  Doorbell footage      Video     7/14       Whitaker      Neighborhood    Reviewed
  ```
  
  - Click any row to see: who obtained it, from where, timestamp, where it is now, who's analyzing it, when analysis will be done

#### 4. Dual Timeline Visualization
- **Case Timeline (what happened to victim)** runs parallel with **Investigation Timeline (what we did)**
  ```
  CASE: Victim's Timeline              │ INVESTIGATION: Detective's Timeline
  ─────────────────────────────────    │ ──────────────────────────────────
  7/12 0700 - Left residence           │ 7/12 0931 - Call received
  7/12 0725 - At Red Bicycle coffee    │ 7/12 1133 - Lead arrives on scene
  7/12 ~0720 - Road rage incident      │ 7/13 - Autopsy + footage review
  7/12 0731 - Shot on I-24             │ 7/14 - Witness interviews begin
  7/12 0931 - Found at scene           │ 7/15 - Suspect vehicle ID'd
                                        │ 7/18 - Suspects arrested
  ```
  
  - **Gaps are visible:** "We didn't document victim's location 6-8pm until interview on 7/14 — that's a critical gap"
  - **Overlay shows cause-effect:** "Suspect phone pinged at Red Bicycle at 7:32am; victim was there at 7:25am — this is the connection point"

#### 5. War Room Display (iPad-friendly)
- **Large screen in CID conference room shows live dashboard**
  - Task board with assignments, status, owners
  - Evidence tracker with current status
  - Open questions/gaps to be filled
  - Timeline visualization
  - All updates in real-time as detectives input from iPads

- **iPad-based input from detectives in the field or at desk**
  - Handwriting recognition + task creation
  - Voice-to-text for quick updates
  - Form filling (interviews, evidence intake)
  - Photo/video capture with automatic timestamping

#### 6. Role-Based Views (Not Everyone Sees Everything)
- **Lead Detective:** Full case overview, timeline, all evidence, all supplements, open questions
- **Canvass Lead:** Tasks assigned to canvas team, witness locations, findings as they come in
- **Evidence Tech:** Evidence intake queue, chain of custody, pending analysis
- **SWAT Commander:** Risk assessment form, location security, tactical considerations
- **DA/Prosecutor:** Case summary, evidence status, timeline, interview notes

#### 7. Risk Assessment/Threat Assessment Form Integration
- **Tier declaration auto-triggers the form**
- **Form updates dynamically as information arrives:**
  - Suspect has firearm → updates Section C
  - Location has security system → updates Section D
  - Dangerous items discovered → updates scoring
- **Total score auto-calculates and alerts command if thresholds change**

#### 8. Warrant & Legal Process Tracker
- **Warrant lifecycle visible to all relevant parties:**
  - Drafted (date, detective)
  - Submitted to DA (date, status)
  - Signed by judge (date, returned)
  - Served (date, by whom, results documented)
  - Results logged to evidence tracker

#### 9. Communication That Isn't Noise
- **Structured messages tied to tasks/evidence**
  - Instead of: "Yes. Terminate AT&T pings please. Thank you."
  - System creates: Task "Terminate AT&T location pings on suspect phone" → assigned to Mobile Tech → marked Complete when confirmed
  - Notifications only go to assignee and lead detective
  - Not broadcast to 15-person group chat

---

## Data Model (High-Level)

### Case
- Case ID, Case Name, Tier (1/2/3), Date Opened, Lead Detective, Co-Lead
- Working Theory (text field, editable)
- Status (Active, Closed, Archive)

### Tasks
- Task ID, Case ID
- Title, Description, Task Type (canvass, interview, evidence, warrant, etc.)
- Assigned To (role), Assigned Detective (person), Assigned Date
- Status (Pending, In Progress, Waiting For, Blocked, Complete)
- Deadline, Priority
- Supplement Required (Yes/No)
- Related Tasks (linked)
- Notes field
- Completed Date, Completed By

### Supplements (Critical)
- Supplement ID, Task ID
- Type (interview report, evidence report, analysis, etc.)
- Required (Yes/No), Due Date
- Filed (Yes/No), Filed Date, Filed By
- Document link (PDF, etc.)
- Status (Outstanding, Overdue, Filed)

### Evidence
- Evidence ID, Case ID
- Description, Type (digital, physical, video, etc.)
- Obtained Date, Obtained By, From Where
- Current Location, Custodian
- Status (Intake, Cataloged, Analysis Pending, Analysis In Progress, Analysis Complete, Archive)
- Supplement Link (analysis report, etc.)
- Chain of Custody (timestamped log)

### Timeline Events
- Event ID, Case ID, Type (case or investigation)
- Description, Time, Location
- Linked To (task, evidence, person, interview)
- Source (detective narrative, video timestamp, phone data, etc.)

### Persons (Victim, Suspects, Witnesses)
- Person ID, Case ID
- Name, DOB, phone, address
- Role (victim, suspect, witness, family, etc.)
- Interviews (linked)
- Background checks (linked)
- Status (Identified, Interviewed, Arrested, etc.)

---

## iPad Integration (Hardware + Software)

### Devices
- 3 iPads available for field detectives, interviewers, evidence technicians
- Real-time sync to cloud/server (not local-only)

### Input Methods
1. **Handwriting + OCR**
   - Detective sketches on whiteboard app: "Jones - canvass 3 blocks, 0800"
   - System parses and creates task: assigned to Jones, type=canvass, deadline=0800
   - Fallback: if OCR fails, task created as-is for lead to review

2. **Form Entry**
   - Structured interview forms, evidence intake forms
   - Auto-timestamp, auto-location (if GPS available)
   - Fields link to case data (dropdown to select suspect/witness)

3. **Voice-to-Text**
   - Detective dictates: "Interviewed witness at residence, confirmed suspect's alibi breaks down at 8pm" → transcribed and logged

4. **Photo/Video Capture**
   - Evidence photo → auto-tagged with date, time, location, detective
   - Sent to evidence tracker
   - Optional: detective can draw/annotate with pencil

### Sync & Connectivity
- Cloud-based (not dependent on local network)
- Offline mode: tasks/forms cached locally, sync when connection returns
- Real-time push updates: war room display updates as detectives file reports

---

## Workflow: From Call-Out to Closure

### T+0 (Call received)
1. Sgt. declares incident, reports: location, basic facts, tier estimate
2. System creates case, auto-generates task list based on tier
3. Lead detective gets assignment, sees template tasks
4. War room display lights up with tasks and team roster

### T+1-6 hours (Initial response)
1. Detectives arrive, confirm scene, request resources
2. Scene Lead updates status via iPad: "Scene secured," "Body in vehicle," etc.
3. Evidence Tech starts intake: photos, casings, vehicle — each logged to tracker
4. Canvass Lead receives assignment: "Canvas 3-block radius," assigns sub-teams via app
5. Lead Detective views war room: what's done, what's pending, what's blocked

### T+6-48 hours (Investigation)
1. Video collection tasks go to team members via iPad assignments
2. Interviews completed → detective files supplement (recorded notes or form)
3. Evidence analysis requests sent to labs with tracking
4. Timeline gets populated as events discovered: victim's movements, suspect's movements
5. Lead sees gaps: "Victim's location 8pm-9am unknown" → creates canvass task to fill gap
6. Risk Assessment form auto-updates as weapon info, suspect history comes in

### T+48 hours - Arrest (Active phase)
1. Warrants drafted in system, tracked through signature
2. When warrant signed, SWAT team sees it immediately on their view
3. Search warrant executed → results documented and linked
4. Interviews conducted → supplements filed
5. All supplements tracked; lead sees which are outstanding

### Post-Arrest (Closure phase)
1. All supplements must be filed before case closes
2. Missing supplements trigger alerts
3. Case summary auto-generated from tasks, evidence, timeline, supplements
4. Archive: case moved to closed, all documents attached

---

## UI Concepts (Rough)

### War Room Display (Large screen, 55"+)
```
┌─────────────────────────────────────────────────────────────┐
│                    CASE: [Case Name]  Tier 2               │
├──────────────────┬──────────────────┬───────────────────────┤
│  TASK BOARD      │  EVIDENCE        │  OPEN QUESTIONS      │
│ ┌────────────┐   │ ┌──────────────┐ │ ┌─────────────────┐  │
│ │TO DO       │   │ │Shell casings │ │ │ Victim location │  │
│ │ Canvas     │   │ │Status: TBI   │ │ │ 8pm-9am?       │  │
│ │ [Assign]   │   │ │ Analysis...  │ │ │ ACTION: Canvas  │  │
│ ├────────────┤   │ └──────────────┘ │ │ assigned to    │  │
│ │IN PROGRESS │   │ ┌──────────────┐ │ │ Smith          │  │
│ │ Interviews │   │ │Video I-24    │ │ └─────────────────┘  │
│ │ [Jones]    │   │ │Status: Ready │ │                      │
│ │ [Smith]    │   │ │for review    │ │                      │
│ └────────────┘   │ └──────────────┘ │                      │
│                  │                   │                      │
│ WAITING FOR      │ SUPPLEMENTS       │  TIMELINE            │
│ ┌────────────┐   │ Outstanding: 3    │ ┌──────────────────┐ │
│ │Lab results │   │ Overdue: 1 ⚠️     │ │7/12 0731 - Shot  │ │
│ │Est: 7/20   │   │ Filed: 8          │ │7/13 - Autopsy   │ │
│ └────────────┘   │                   │ │7/14 - Interviews │ │
│                  │                   │ │7/18 - Arrest     │ │
│                  │                   │ └──────────────────┘ │
└──────────────────┴──────────────────┴───────────────────────┘
```

### Detective's iPad (Task Assignment)
```
┌─────────────────────────────┐
│ MY TASKS (3)                │
├─────────────────────────────┤
│ ✓ Victim interview          │ Completed
│   Supplement: Filed         │
├─────────────────────────────┤
│ ⏳ Canvass - 3 blocks       │ In Progress
│   Due: Today 5pm            │
│   Supplement: Required      │
├─────────────────────────────┤
│ ⏱️  Evidence: Doorbell      │ Waiting For
│    Awaiting: Footage        │ Lab analysis
│    Due: 7/20                │
│    Supplement: Required     │
├─────────────────────────────┤
│ [ + New Task ]              │
└─────────────────────────────┘
```

### Lead Detective's Supplement Tracker
```
CASE: [Case]  All Supplements
┌────────────────────────────────────────────────────────────────┐
│ Task                    Assigned To   Due Date   Status        │
├────────────────────────────────────────────────────────────────┤
│ Interview VGF           Jones         7/14       ✓ Filed       │
│ Canvass sector 1        Smith         7/16       ✗ OVERDUE ⚠️  │
│ Evidence: Doorbell      Whitaker      7/18       ✗ OVERDUE ⚠️  │
│ Lab analysis: Casings   Brown (TBI)   7/20       ⏳ Pending     │
│ Risk assessment         Command       7/18       ✓ Filed       │
│                                                                 │
│ Summary: 5 supplements required │ 2 filed │ 2 overdue │ 1 pending
└────────────────────────────────────────────────────────────────┘
```

---

## Build Priorities (Phased Approach)

### Phase 1 (MVP)
- Task board with Tier-based templates
- Basic assignment (detective selection)
- Status tracking (Pending → Complete)
- iPad form entry for task updates
- War room display (read-only web view)

### Phase 2
- Supplement tracking (required/filed/overdue)
- Evidence tracker
- Dual timeline visualization
- Risk assessment form integration

### Phase 3
- Role-based access controls
- Handwriting OCR for task creation
- Mobile notifications (push to iPad)
- Advanced search/filtering
- Post-case reporting/export

### Phase 4
- Integration with external systems (TBI submission, records database)
- Advanced analytics (case resolution rate, time-to-arrest, etc.)
- Workflow automation (auto-assign tasks based on rules)
- Post-mortem/debrief template

---

## Success Metrics

- **Supplement completion:** 100% of required supplements filed before case closure
- **Task clarity:** Zero instances of "who's doing what?" confusion in interviews
- **Response time:** Lead detective can answer "what's the status on X?" in <30 seconds
- **Shift handoff:** Incoming shift can get full briefing in <10 minutes
- **Evidence tracking:** 100% chain of custody documented and auditable
- **Case quality:** Improved prosecution conviction rate (long-term)

---

## Next Steps for Cursor Build
1. Authenticate user (detective login)
2. Create case intake form (Tier 1/2/3 selection)
3. Auto-populate task template based on tier
4. Build task board UI (Kanban style: To Do / In Progress / Waiting / Done)
5. iPad form for task status updates
6. War room display (read-only dashboard)
7. Supplement tracker linked to tasks
8. Evidence intake form
9. Timeline events log
10. Risk assessment form integration

---

**Created:** Brainstorm session, April 2026
**Status:** Requirements & Conceptual Design
**Next:** Technical architecture & database schema
