# RCSO CID Portal: Two-Application Architecture
## Command Board + Call-Out/OPS Plan System

---

## ARCHITECTURE OVERVIEW

```
TWO SEPARATE APPLICATIONS

┌─────────────────────────────────────────────────────────────────────────┐
│ APPLICATION 1: COMMAND BOARD                                            │
│ Primary: DESKTOP (war room display)                                     │
│ Secondary: iPad (scene management handwriting capture)                  │
│ Focus: Scene management, investigation tracking, real-time coordination │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
                     Shared Database (Cloud)
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ APPLICATION 2: CALL-OUT & OPS PLAN                                      │
│ Primary: MOBILE (iPad/Phone - field and briefing room)                  │
│ Secondary: Desktop (administrative view)                                │
│ Focus: Call-out initiation, role assignment, search warrant planning    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## APPLICATION 1: COMMAND BOARD

### Purpose
Central hub for scene management and investigation coordination. Real-time updates from iPad input, displays unified view of case status, personnel, evidence, timeline, and investigative progress.

### Primary Interface: DESKTOP (War Room Display)
**Display Style:** Large-format dashboard (typically 2-3 monitors or wall-mounted display)
**Use Case:** Supervisor/lead detective at command post reviews entire case status in real-time

### Secondary Interface: iPAD (Scene/Field Input)
**Use Case:** Detective on scene or in vehicle uses iPad to input data, which auto-parses and syncs to desktop display
**Handwriting Recognition:** Critical feature — detectives write/draw on iPad, system converts to structured data

---

## COMMAND BOARD: DETAILED COMPONENTS

### 1. COMMAND HEADER (Top of Display)
```
╔═══════════════════════════════════════════════════════════════════╗
║ COMPLAINT #: 250712-XXXX  |  INCIDENT: Homicide (I-24 Shooting)   ║
║ TIER: 3 (Critical)  |  TIME CALLED: 11:33am  |  TIME CTRL: 11:52am ║
╚═══════════════════════════════════════════════════════════════════╝

COMMAND STRUCTURE:
  Supervisor: Sgt. Amanda McPherson (Sgt-12) — On Scene
  Lead Detective: Stanley (CID-47) — On Scene
  Co-Lead: [Assigned if available]
  
SCENE LOCATION: I-24 Westbound, Rutherford/Davidson county line
STATUS: ACTIVE INVESTIGATION
```

### 2. PERSONNEL ROSTER & ROLE MANAGEMENT (Live Status)
```
PERSONNEL ROSTER

Role                   Name              Badge    Location          Status      Handoff Status
────────────────────────────────────────────────────────────────────────────────────────────────
Lead Detective         Stanley           CID-47   Ravine/Body       Active      ——
Supervisor             McPherson         Sgt-12   Perimeter         Active      ——
Crime Scene Tech       Kendall           CST-08   Evidence Area     Active      ✓ Available
Evidence Photographer  Brown              CST-09   Vehicle Area      Active      ✓ Available
Sketch Tech            Jones              CST-10   Staging Area      Active      ✓ Available
Patrol Unit 1          Smith              LP-456   I-24 North        Active      ✓ Available
Patrol Unit 2          Johnson            LP-457   I-24 South        Active      ✓ Available
Detective (Interviews) Rodriguez          CID-48   Staging Area      Active      ✓ Available
Medical Examiner       Davis              ME-555   Body Location     Active      ✓ Available

ROLES AVAILABLE FOR HANDOVER:
[ ] Crime Scene Tech (Kendall) → ASSIGN TO: [Dropdown of available CST personnel]
[ ] Evidence Photographer → ASSIGN TO: [Dropdown]
[ ] Sketch Tech → ASSIGN TO: [Dropdown]
```

**Key Feature:** If Crime Scene Tech Kendall gets sick or called away:
1. Click [ ] next to Kendall's role
2. System shows available personnel with CST certification
3. Select replacement
4. Handoff is logged: time, reason (sick/emergency/vacation), from/to, duration
5. New CST notified automatically
6. Task list for that role is reassigned

---

### 3. VICTIMOLOGY TREE (Expandable Hierarchical View)

```
VICTIM 1: John Smith, DOB 1955 (70yo, White Male)
├─ DEMOGRAPHICS & CONDITION
│  ├─ Physical: 5'10", 180 lbs, gray hair, glasses
│  ├─ Location Found: I-24 ravine, ~30 yards, in vehicle
│  ├─ Vehicle: 2019 Ford F-150 (Blue, Tag ABC123) — AT SCENE
│  ├─ Injuries: GSW to chest (per initial ME observation)
│  ├─ Status: Deceased at scene
│  └─ Clothing: [Full description with photo]
│
├─ IMMEDIATE FAMILY (with interview status & links)
│  ├─ Sarah Smith (Wife, DOB 1958)
│  │  ├─ Contact: 615-555-0123
│  │  ├─ Interview Status: INTERVIEWED (7/12 4:00pm by Stanley)
│  │  ├─ Relationship Concern: [Potential suspect? Grieving? Alibi?]
│  │  └─ Link: [SMS sent 7/12 12:15pm - DELIVERED - Link expires 7/14 12:15pm]
│  │
│  ├─ Michael Smith (Son, DOB 1985)
│  │  ├─ Contact: 615-555-4567
│  │  ├─ Interview Status: PENDING
│  │  ├─ Last Contact w/ Victim: [When?]
│  │  └─ Link: [SMS sent 7/12 1:00pm - DELIVERED - Link expires 7/14 1:00pm]
│  │
│  └─ Jennifer Smith (Daughter, DOB 1988)
│     ├─ Contact: 615-555-7890
│     ├─ Interview Status: PENDING
│     └─ Link: [Sent 7/12 1:00pm - DELIVERED - expires 7/14]
│
├─ EXTENDED FAMILY
│  ├─ Brother: Tom Smith (Contact info)
│  ├─ Sister-in-law: Susan Smith
│  └─ [Continue as needed]
│
├─ CLOSE FRIENDS & ASSOCIATES
│  ├─ Golf Buddy: Robert Johnson
│  │  ├─ Contact: 615-555-9999
│  │  ├─ Last saw victim: 7/10 (golf outing)
│  │  ├─ Interview Status: INTERVIEWED (7/12 7:00pm - Alibi: home)
│  │  └─ Link: [Sent 7/12 - Received, interview conducted]
│  │
│  └─ [Others]
│
├─ WORK & PROFESSIONAL
│  ├─ Former Employer: Rutherford County Schools (Retired)
│  ├─ Last Job: Math Teacher
│  └─ Professional Associations: Rotary Club, Golf League
│
├─ SOCIAL PRESENCE
│  ├─ Facebook: John_Smith70 (Follow-up needed for recent activity)
│  ├─ Instagram: [None found]
│  ├─ Active Memberships: First Baptist Church, Rotary Club
│  └─ Social Media Activity: [Last post 7/10 - routine]
│
├─ NEIGHBORHOOD & RESIDENTIAL
│  ├─ Home Address: 123 Maple St, Murfreesboro
│  ├─ Neighbors:
│  │  ├─ Across street: Mary Jones → Link sent 7/12 2:00pm
│  │  ├─ Next door: Robert Lee → Interview scheduled 7/13
│  │  └─ [Continue]
│  │
│  └─ Neighborhood Watch: Active (contact for any alerts)
│
├─ PROPERTY, ASSETS & VALUABLES
│  ├─ Vehicle: 2019 Ford F-150 (at scene, recovered)
│  ├─ Wallet: [FOUND - in vehicle, contents logged as EV-004]
│  ├─ Cash: [Amount found? — check evidence log]
│  ├─ Credit Cards: [Monitor for post-mortem use — CRITICAL]
│  ├─ Bank Accounts: [Need to freeze/monitor]
│  ├─ Firearms: [Did victim own? Check registration]
│  ├─ Home Ownership: [Address, mortgage, value]
│  └─ Will/Estate: [Check for conflicts, beneficiaries]
│
└─ BEHAVIORAL & MOTIVE ANALYSIS
   ├─ Recent Life Changes: [Retirement status, health, relationships?]
   ├─ Known Conflicts: [Enemies? Disputes? Threats?]
   ├─ Financial Status: [Debt? Gambling? Money problems?]
   ├─ Substance Use: [Drugs? Alcohol?]
   ├─ Mental Health: [Known issues?]
   ├─ Recent Communications: [Threatening calls/texts? Suspicious activity?]
   └─ Investigator Notes: [Free-form observations]
```

**iPad Feature:** Detective on scene can write notes directly:
- "Victim's daughter in town for funeral, no alibi" → System converts to structured data
- Sketch of victim's injuries → Links to victimology tree
- Notes on home condition → Syncs to case file

---

### 4. SUSPECT TRACKER (Multi-Suspect Support)

```
SUSPECT 1: UNKNOWN — ACTIVE MANHUNT

DESCRIPTION:
├─ Physical: [Race, approx age, height, build from witnesses]
├─ Clothing: [Description from witness statements]
├─ Weapon: [Firearm type, if known — 9mm per shell casings]
├─ Vehicle: [Description, direction fled, last seen location]
└─ Known Aliases: [If any]

CONNECTIONS TO VICTIM:
├─ Known to victim?: [Unknown at this time]
├─ Motive (Hypothesis): [Robbery? Personal? Mistaken identity?]
├─ Prior relationship: [UNKNOWN — need to verify]
└─ Known associates: [UNKNOWN — need to identify]

PRIOR CRIMINAL HISTORY:
├─ Arrests: [Pending — search databases]
├─ Convictions: [Pending]
├─ Weapons charges: [Pending]
└─ Violence history: [Pending]

CURRENT STATUS:
├─ Location: UNKNOWN — ACTIVE BOLO
├─ Vehicle: [Blue pickup, direction fled north on I-24]
├─ Threat Level: IMMEDIATE (armed, active threat)
└─ BOLO Issued: 7/12 5:30pm (all agencies notified)

INVESTIGATIVE LEADS:
├─ Witness 1: "Overheard argument 10:45am" (NOT IDed yet)
├─ Witness 2: "Saw blue pickup flee north" (phone witness, pending ID)
├─ Traffic cameras: [Submitted for review, ETA 7/13]
├─ Gunshot residue: [Submitted to lab]
└─ Ballistics: [Pending — 9mm match]
```

---

### 5. FACT / WITHIN / VERIFY TRACKER (3-Column Framework)

**WITHIN = "What I Think I kNow"**

```
FACT COLUMN                           WITHIN (What I Think I kNow)           VERIFY (How to Confirm)
(What I Know for Fact)                (Hypothesis/Working Theory)            (Verification Steps)
───────────────────────────────────────────────────────────────────────────────────────────────────────

✓ Victim found in ravine              Victim was shot at/near location       [ ] Scene reconstruction
  (Confirmed 11:43am)                 (not transported and dumped)           [ ] Witness statements
                                                                              [ ] Ballistics evidence
                                                                              [ ] Blood spatter analysis

✓ GSW to chest                        Single shot? Multiple shots?           [ ] Medical examiner autopsy
  (Confirmed by ME Davis 11:52am)     Victim defensive wounds?               [ ] Gunshot residue testing
                                                                              [ ] Wound trajectory analysis

✓ 9mm shell casings found              Suspect armed with 9mm pistol         [ ] Ballistics match
  (Evidence EV-002, found 12:15pm)                                           [ ] Gun registry check
                                                                              [ ] Pawn shop records

✓ Witness heard "argument" ~10:45am   Argument may have escalated to         [ ] Witness canvass
  (One witness, unconfirmed)          shooting (NOT random attack)          [ ] Identify argument parties
                                                                              [ ] Motive investigation

✓ Witness saw "blue pickup" flee      Suspect vehicle is blue pickup        [ ] Traffic camera footage
  (Phone witness, unconfirmed)        (matches victim's vehicle? NO)        [ ] License plate check
                                                                              [ ] Neighboring parking lots

✗ "Robbery" — assumption              Motive could be robbery, could be     [ ] Check victim's wallet/cash
  (NOT VERIFIED YET)                  personal dispute, could be crime      [ ] Interview family on debts
                                      of passion, could be mistaken ID      [ ] Gang/organized crime check

✗ "Random shooting" — theory          Unlikely without connection, but      [ ] Deep dive victim associations
  (Being considered)                  possible if wrong place/wrong time    [ ] Suspect description crosscheck
                                                                              [ ] Hate crime/bias indicators

? Victim "almost dead battery"        May indicate victim unable to call    [ ] Phone forensics
  (From family, not confirmed)        for help, or phone was off           [ ] AT&T records check
```

**Interactive Features:**
- Click on each row to expand with detailed notes
- Color-coded: Green = Verified ✓ | Yellow = Working | Red = Needs Verification
- Investigator can update WITHIN column as new theories emerge
- System auto-tracks who added what and when

---

### 6. TIMELINE VISUALIZATION (Dual Timeline with Map Integration)

```
CRIME TIMELINE (What Happened)        INVESTIGATION TIMELINE (What We Did)  MAP LOCATION
─────────────────────────────────────────────────────────────────────────────────────────

~11:00am                              11:33am - Dispatch call               [Pin: I-24 ravine]
Shooting occurs                       received
[Unknown exact time]                  

~11:05am                              11:43am - County detective            [Pin: I-24 shoulder]
Victim in ravine                      Stanley arrives at scene,
[Estimated by witness]                takes command

                                      11:52am - Scene secured,              [Pin: Perimeter]
                                      jurisdiction asserted

11:20am                               12:15pm - ME arrives,                 [Pin: Body location]
911 call received                     preliminary exam begins
[Confirmed by 911 audio]              

11:33am                               12:30pm - Scene walkthrough           [Pin: Evidence areas]
First responders arrive               begins with multi-agency
[Fire/EMS/Police]                     coordination

                                      1:30pm - Firearm recovered            [Pin: 10 yards NE
                                      from brush                            of body]

                                      2:30pm - Initial evidence             [Pin: Vehicle area]
                                      photography complete

                                      3:00pm - Suspect description          [Pin: I-24 north
                                      circulated (BOLO)                     (direction fled)]

                                      4:00pm - Victim's family              [Pin: Home address]
                                      notified and interviewed

                                      5:30pm - Suspect vehicle              [Pin: I-24
                                      alert broadcast                       northbound]

                                      7/13 10:00am - Traffic                [Pin: Dispatch
                                      camera footage retrieved              center/Lab]
```

**Map Features:**
- Pinpoint exact location of every event
- Color-coded pins:
  - Red = Crime event (shooting location)
  - Blue = Investigation milestone (detective arrival, scene secured)
  - Green = Evidence found (firearm location, shell casings, wallet)
  - Yellow = Witness interview location
  - Orange = Suspect sighting/BOLO
- Zoom in/out to see full geographic picture
- Timeline slider: Drag left/right to see events at specific time

---

### 7. INVESTIGATION TASK LIST (Assigned, Trackable, Real-Time)

```
TASK                                ASSIGNED TO      DUE       STATUS          PRIORITY    DAYS LEFT
─────────────────────────────────────────────────────────────────────────────────────────────────────
[ ] Interview victim's family       Stanley          Today     IN PROGRESS     CRITICAL    4hrs
    (Sarah, Michael, Jennifer)      (CID-47)         5:00pm    (Currently with Sarah)

[ ] BOLO broadcast for suspect      Dispatch         Today     COMPLETE        CRITICAL    ✓
    vehicle                         (via radio)      1:00pm

[ ] Secure weapon evidence          Kendall (CST-08) Today     COMPLETE        HIGH        ✓
    (9mm pistol, shell casings)                      3:00pm

[ ] Interview 911 caller            Rodriguez        Today     ASSIGNED        HIGH        4hrs
    (Phone number from logs)        (CID-48)         4:00pm

[ ] Canvass neighborhood for        Smith (LP-456)   Today     IN PROGRESS     HIGH        6hrs
    additional witnesses            Johnson (LP-457) 8:00pm    (Door-to-door Maple St area)

[ ] Pull traffic camera footage     Tech Support     Tomorrow  ASSIGNED        MEDIUM      24hrs
    (I-24 both directions)          (IT)             10:00am

[ ] Ballistics analysis             Lab              5 days    SUBMITTED       MEDIUM      5 days
    (9mm weapon + casings)                           7/17      (9mm pistol + shells from scene)

[ ] Gunshot residue testing         Lab              3 days    SUBMITTED       MEDIUM      3 days
    (Suspect hands/clothing)        (pending)        7/15      (If suspect identified)

[ ] Phone records subpoena          Stanley          Tomorrow  ASSIGNED        MEDIUM      1 day
    (Victim's cell phone)           (CID-47)         7/13

[ ] Financial records review        Rodriguez        5 days    PENDING         LOW         5 days
    (Credit card fraud check)       (CID-48)         7/17

[ ] Social media deep-dive          Detective TBD    5 days    PENDING         LOW         5 days
    (Facebook, Instagram, Twitter)                   7/17

[ ] Suspect photo search            Records Dept     2 days    ASSIGNED        MEDIUM      2 days
    (Run description through NCIC)  (Jail division)  7/14

[ ] Gang/organized crime check      Gang Unit        3 days    ASSIGNED        LOW         3 days
    (Any known connections?)        (External)       7/15
```

**Interactive Features:**
- Click task → see subtasks and notes
- Drag/drop to reassign (with notification)
- Update status: Not Started → In Progress → Complete
- Filter by: Assigned to, Priority, Status, Due date
- If task owner goes on vacation/emergency → system notifies and prompts reassignment

---

### 8. OUTER AGENCY TRACKER (Multi-Agency Coordination)

```
AGENCY              CONTACT              BADGE/ROLE       PURPOSE                  STATUS
──────────────────────────────────────────────────────────────────────────────────────────
LaVergne PD         Officer Smith        LP-456           Traffic Control          ON-SCENE
                    Officer Johnson      LP-457           (Peripheral assistance)  ON-SCENE

THP (State Police)  Sgt. Johnson         THP-789          Highway Closure          ON-SCENE
                    Trooper Lee          THP-790          Traffic Management       ON-SCENE

Fire/EMS            Chief Davis          FD-321           Life Safety              ON-SCENE
                    Paramedic Brown      FD-322           (Initial treatment)      ON-SCENE

Medical Examiner    Dr. Davis            ME-555           Preliminary Exam         EN ROUTE
                    (Rutherford County)  ME-556           Scene documentation      ETA 12:30pm

Metro Nashville PD  Det. Liedtke         NPD-234          Initial scene control    (Handed off jurisdiction)
                    (Arrived first)      (Lead Detective)

DA's Office         ADA Johnson          DA-001           Prosecution liaison       CALLED IN (as needed)
                    (District Attorney)

FBI (if needed)     [Pending assessment] [TBD]            Federal crimes           STANDBY (if warranted)
                                                           (interstate travel, etc.)
```

---

### 9. iPad INPUT MODES (Scene Capture & Auto-Parsing)

**Three iPad Modes:**

**Mode A: Free-Form Note Taking (Handwriting Recognition)**
- Detective writes note on iPad screen
- System captures handwriting
- OCR converts to text
- Auto-categorizes by keyword:
  - "Victim..." → goes to Victimology
  - "Suspect description..." → goes to Suspect Tracker
  - "Evidence..." → goes to Evidence log
  - "Witness..." → goes to Interview Tracker
- Detective can override categorization

**Mode B: Structured Form Entry**
- Detective selects form template (evidence, witness, suspect desc., etc.)
- Fills in fields
- Syncs to command board immediately

**Mode C: Quick Voice Note**
- Hands-free recording (while photographing or examining scene)
- Audio transcript auto-generated
- Syncs to case file

**All three modes sync in real-time to desktop command board.**

---

## APPLICATION 2: CALL-OUT & OPS PLAN

### Purpose
Field-optimized tool for initial call-out, role assignment, and search warrant planning. Used during briefing, vehicle approach, and execution.

### Primary Interface: MOBILE (iPad/Phone)
**Display Style:** Optimized for portrait and landscape, 7-10" iPad preferred
**Use Case:** Briefing room, vehicle (Sergeant/Lead Detective reviews and coordinates)

### Secondary Interface: DESKTOP
**Use Case:** Administrative review, prior to briefing

---

## CALL-OUT & OPS PLAN: DETAILED COMPONENTS

### 1. CALL-OUT INITIATION (Tier-Based, SMS Distribution)

```
INCIDENT TIER SELECTOR:

[ ] TIER 1 - Routine (Property crime, cold case follow-up)
    └─ Resources: 1-2 detectives, standard response
    └─ Roles: Lead Detective only
    └─ Response time: Next business day OK

[•] TIER 2 - Major (Assault, sexual assault, robbery, in-progress felony)
    └─ Resources: 3-5 detectives + supervisor
    └─ Roles: Lead Detective, Supervisor, Co-Lead (if available)
    └─ Response time: 2-4 hour window
    └─ SELECTED FOR THIS INCIDENT

[ ] TIER 3 - Homicide/Critical (Homicide, OIS, kidnapping, major felony)
    └─ Resources: Full Major Crime Unit (8-12+)
    └─ Roles: Lead Detective, Co-Lead, Supervisor, Lieutenant, specialists
    └─ Response time: Immediate (first 15 min critical)
```

**System Auto-Assigns Roles Based on Tier:**

```
TIER 2 (Selected) → AUTO-ROLE ASSIGNMENT:

Lead Detective: [Stanley (CID-47)] — IF UNAVAILABLE: [Dropdown of seniors]
  │ Can accept or reassign
  │ If reassign: [Select replacement from: Rodriguez, Brown, etc.]
  │
Supervisor: [McPherson (Sgt-12)] — IF UNAVAILABLE: [Dropdown]
  │ Can accept or reassign
  │
Co-Lead: [Open] — IF NEEDED: [Assign from: Det. Rodriguez, Det. Jones]
  │ Co-lead is lead's backup for scene take-over if lead becomes unavailable
  │

ROLE HANDOVER RULES FOR THIS TIER:
├─ If Lead Detective becomes unavailable mid-investigation:
│  └─ Co-Lead assumes control, all tasks reassigned
│  └─ Handoff logged: time, reason, duration, who took over
│
├─ If Supervisor becomes unavailable:
│  └─ Next senior sergeant assumes role
│  └─ Handoff logged
│
├─ If any assigned role becomes unavailable:
│  └─ System shows available personnel with same certification
│  └─ Reassign or absorb role to remaining team
│  └─ Handoff logged
│
└─ All handovers trigger:
   ├─ Notification to new role holder
   ├─ Briefing document sent
   ├─ Timestamp in system
   └─ Old role holder status marked "handed off"
```

**SMS Distribution:**

```
Once roles assigned, click [SEND CALL-OUT]:

→ System generates SMS message to each role holder:

"CALL-OUT: Tier 2 Investigation
Lead: Stanley (CID-47)
Type: [Homicide / Assault / etc.]
Location: [Address/Location pin]
Briefing: [Fire Hall, 30 mins]
Team size: [8 people]
Link: [cloud.rcso.cid/case/250712-XXXX]
Expires: [24 hrs]

Confirm receipt: [Y/N]"

→ SMS tracked: sent, delivered, read, confirmed
→ Link in SMS gives access to:
   - OPS Plan (if search warrant planned)
   - Initial incident info
   - Briefing location on map
   - Role assignment for that person
   - Complaint number
```

---

### 2. ROLE ASSIGNMENT & HANDOVER MANAGEMENT

```
PERSONNEL ROSTER (For this Tier 2 incident):

Name                Badge    Role                Status      Assigned    Availability    Action
────────────────────────────────────────────────────────────────────────────────────────────────
Stanley             CID-47   Lead Detective      ✓ Accept    NOW         Available        [Confirm]
Rodriguez           CID-48   Supervisor's TBD    [Pending]   NOW         Available        [Accept/Decline]
McPherson           Sgt-12   Supervisor          ✓ Accept    NOW         Available        [Confirm]
Brown               CID-49   Co-Lead             ✗ Sick      NOW         UNAVAILABLE      [→ Reassign]
Jones               CID-50   Interviewer         ✓ Accept    NOW         Available        [Confirm]

[+] ADD PERSONNEL:
    [Dropdown with available detectives, by shift]
    
ROLE HANDOVER TRACKING (Live during investigation):

If Stanley (Lead) becomes unavailable at 3pm:
├─ System notification to Brown (Co-Lead): "Stanley unavailable, you're now Lead"
├─ Brown accepts/confirms: "Yes, taking over as Lead"
├─ Handoff logged: 
│  ├─ Time: 3:00pm
│  ├─ From: Stanley (CID-47)
│  ├─ To: Brown (CID-49)
│  ├─ Reason: Emergency (child hospitalization)
│  ├─ Duration: Est. 4 hours
│  └─ Briefing Document: Auto-sent to Brown with case summary
│
└─ Command Board updated:
   ├─ Lead Detective: Brown (CID-49) [NOW LEADING]
   ├─ Co-Lead: [Open — can reassign]
   └─ Status: TRANSITION IN PROGRESS (14:03 - 14:07)

All team members notified: "Lead has changed to Brown. New decisions from Brown going forward."
```

---

### 3. OPS PLAN FORM (Search Warrant Execution)

**Integrated with:**
- Equipment Checklist
- Supplement Tracking
- Role assignments (with handover provisions)

```
OPS PLAN FORM (For SW execution — reference CURSOR_PROMPTS_OPS_PLAN_MVP.md)

Displays on iPad:
├─ Basic info (complaint number, date, operation type)
├─ Suspect/Vehicle/Address info
├─ Personnel assignments (with role handover if someone unavailable)
├─ Equipment checklist (supervisor pre-execution verification)
├─ Briefing checklist (all personnel confirmed aware of roles/equipment/plan)
├─ Supplement assignments (each person knows what they need to file post-operation)
└─ Supervisor approval workflow

Can print to PDF matching original RCSO form EXACTLY.
```

---

## DATA SYNC BETWEEN APPLICATIONS

Both applications share one cloud database:

```
COMMAND BOARD (Desktop)             ←→  SHARED DATABASE  ←→  CALL-OUT/OPS PLAN (Mobile)
├─ Victimology tree                     ├─ Case complaints          ├─ Initial role assignments
├─ Suspect tracker                      ├─ Personnel roster         ├─ OPS Plans
├─ FACT/WITHIN/VERIFY                  ├─ Evidence logs            ├─ Equipment checklists
├─ Timeline                             ├─ Task assignments         ├─ Supplement assignments
├─ Task list                            ├─ Interview status         ├─ Threat assessments
├─ Interview tracker                    ├─ Timeline events          └─ Briefing documents
├─ Evidence tracker                     ├─ Suspect descriptions
└─ Personnel status                     └─ Handover logs
```

**Sync Pattern:**
- iPad handwriting input → auto-parses → uploads to database
- Desktop updates → synced to iPad in real-time
- Handovers → logged in database, notifications sent to both apps
- Evidence/task updates → visible on both simultaneously

---

## TECHNICAL ARCHITECTURE

### Authentication & Access Control:
- Lead detective gets full access to Command Board + OPS Plan
- Supervisor gets approval view (Command Board + approval workflows)
- Patrol/uniform units get read-only task assignments
- Specialists get their role-specific sections only

### Mobile vs. Desktop Optimization:
- **Command Board:** Designed for large desktop display (2-3 monitors), can be sized down for iPad secondary view
- **Call-Out/OPS Plan:** Designed for iPad (portrait/landscape), can display on desktop for admin review

### Data Entry:
- iPad: Handwriting recognition, structured forms, voice notes
- Desktop: Full CRUD, admin panel, approval workflows, report generation

### Real-Time Updates:
- All changes sync within 2-3 seconds
- WebSocket connections keep both apps in sync
- Offline mode: iPad can work offline, syncs when connection restored

---

## HANDOVER POLICY (COMPLETE)

### Scope: ANY role at ANY time

```
HANDOVER TRIGGER:
- Detective becomes ill/injured
- Detective called to different case (priority override)
- Detective on planned vacation
- Detective emergency (family, personal)
- Detective transferred
- Role restructure during long investigation

HANDOVER PROCESS:

1. NOTIFICATION (Automatic)
   └─ System sends notification to:
      ├─ Supervisor
      ├─ Co-Lead (if applicable)
      └─ All other team members
      └─ Message: "[Detective Name] is unavailable for their role. [New person] is taking over."

2. REASSIGNMENT (Manual with system guidance)
   └─ Supervisor or Lead Detective:
      ├─ Opens Personnel Roster
      ├─ Clicks [UNAVAILABLE] on original role holder
      ├─ Selects replacement from available personnel
      ├─ Clicks [ASSIGN]
      └─ System logs handover

3. HANDOFF DOCUMENTATION (Auto-Logged)
   └─ System records:
      ├─ Date/Time of handoff
      ├─ From: [Name, Badge, Original Role]
      ├─ To: [Name, Badge, New Role]
      ├─ Reason: [Sick / Emergency / Vacation / Other]
      ├─ Expected Duration: [Hours / Days / Indefinite]
      ├─ Briefing Documents: [Auto-sent to new person]
      │  ├─ Case summary
      │  ├─ Current task list (their new tasks)
      │  ├─ Investigation status
      │  ├─ Timeline to date
      │  └─ Key evidence/leads
      └─ Sign-off: [Both parties confirm handoff]

4. TASK REASSIGNMENT (Auto or Manual)
   └─ If handover is >4 hours:
      ├─ All pending tasks for original person → listed as "reassign"
      ├─ New person reviews task list
      ├─ Can accept, decline, or redistribute to others
      └─ System tracks who's responsible for what
   
   └─ If handover is >24 hours:
      ├─ All active tasks → reassigned immediately (not optional)
      ├─ Supervisor confirms new task owner
      └─ New person notified with task details + deadline

5. RESTORATION (When original person returns)
   └─ Original person comes back:
      ├─ System offers to resume previous role or take new role
      ├─ Current role holder acknowledges handoff back (or moves to new role)
      ├─ Case investigation status updated
      └─ Handoff logged as "COMPLETED"

HANDOVER AUDIT TRAIL:
All handovers visible in case file:
├─ Timeline of who held what role and when
├─ Why each handoff occurred
├─ How long each person held the role
└─ Any gaps or conflicts in role coverage (alerts to supervisor)
```

---

## BUILD SEQUENCE

### Phase 1: COMMAND BOARD (Desktop Primary)
**Estimated effort:** 6-8 weeks
**Components:**
1. Desktop display layout (responsive to multiple monitors)
2. iPad input modes (handwriting recognition, form entry, voice notes)
3. Victimology tree manager (hierarchical data entry + display)
4. Suspect tracker (description, connections, motive)
5. FACT/WITHIN/VERIFY tracker (3-column framework)
6. Timeline visualization (dual timeline + map integration)
7. Task list management (assign, track, notify)
8. Personnel roster + live handover management
9. Evidence tracker (QR-based, chain of custody)
10. Interview tracker (link expiration, status)
11. Data sync engine (real-time between apps)

### Phase 2: CALL-OUT & OPS PLAN (Mobile Primary)
**Estimated effort:** 4-6 weeks (assumes Phase 1 database schema is complete)
**Components:**
1. Tier selector (auto-role assignment)
2. Role assignment with handover management
3. SMS link generator + confirmation tracker
4. OPS Plan form (digitized, exact PDF layout)
5. Equipment checklist (integrated, supervisor verification)
6. Supplement tracking (integrated, role-based)
7. Threat assessment form (digitized, exact PDF layout)
8. Briefing checklist (pre-execution confirmation)
9. Data sync from Phase 1 database
10. Desktop administrative view

### Phase 3: Integration & Testing
**Estimated effort:** 2-4 weeks
1. End-to-end testing (call-out → command board → investigation → OPS plan)
2. Handover scenario testing
3. Offline mode testing (mobile)
4. Real-world user testing with RCSO team
5. PDF print validation (against original forms)
6. Performance optimization

---

## SUMMARY

**Two-Application System:**

| Aspect | Command Board | Call-Out/OPS Plan |
|--------|---------------|-------------------|
| **Primary** | Desktop (war room) | Mobile (field/briefing) |
| **Secondary** | iPad (scene capture) | Desktop (admin) |
| **Focus** | Investigation management | Operation planning |
| **Key Feature** | Handwriting-to-data conversion | Tier-based role assignment |
| **Core Components** | Victimology, Timeline, FACT/WITHIN/VERIFY, Evidence | Call-out, OPS Plan, Equipment, Supplements |
| **Users** | Lead Detective, Supervisor, investigators | Lead Detective, Supervisor, briefing room |
| **Build Order** | Phase 1 (6-8 weeks) | Phase 2 (4-6 weeks after Phase 1) |

**Shared Database:** Both applications sync in real-time, so updates on iPad appear on desktop display, and vice versa.

