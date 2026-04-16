# Complete Investigation Workflow: Call-Out to Case Closure
## RCSO CID Portal — Full System Architecture

---

## OVERVIEW MAP

```
TIER DECISION → CALL-OUT → INITIAL RESPONSE → SCENE MANAGEMENT → INVESTIGATION → OPERATIONS (SW if needed) → CASE CLOSURE

[Pre-Scene]           [0-15 min]    [15-60 min]      [1-8 hrs]        [Days-Weeks]   [Hours-Days]        [Final]
```

---

## PHASE 0: TIER DECISION & CALL-OUT (Dispatch → SMS Link)

**Purpose:** Determine resource level, activate appropriate team, establish initial command structure

### Input:
- 911 call/dispatch info
- Type of incident (homicide, assault, property, etc.)
- Location
- Known suspects/victims
- Initial urgency assessment

### Tier Classification Decision:
**Tier 1 (Routine):** Non-violent property crime, cold case development
- Resources: 1-2 detectives, standard timeline
- Command: Lead detective only (no co-lead, no supervisor on-scene)
- Urgency: Next business day response OK

**Tier 2 (Major):** Assault, sexual assault, robbery, in-progress violent crime
- Resources: 3-5 detectives + supervisor
- Command: Lead detective + supervisor approval structure
- Urgency: Immediate response, 2-4 hour arrival window

**Tier 3 (Homicide/Critical):** Homicide, officer-involved shooting, kidnapping, major felony in-progress
- Resources: Full Major Crime Unit (8-12+), all specialized personnel, multi-agency coordination
- Command: Lead detective + co-lead + supervisor + lieutenant
- Urgency: Immediate response, first 15 minutes critical

### What RCSO Has Now:
- ✓ Tier criteria exist (in Sgt. discretion)
- ✗ No automated tier system in software
- ✗ No template-based role assignment per tier
- ✗ No link generation automation

### What We're Missing:
1. **Tier Decision Logic Component** (auto-suggest based on incident type)
2. **Role Template System** (Tier 1 = X roles, Tier 2 = Y roles, Tier 3 = Z roles + alternates)
3. **Handover Policy** (IF lead detective unavailable → auto-assign co-lead or next senior detective)
4. **Call-out SMS Generator** (Sgt. selects tier → system generates SMS with cloud link to each person)

### Output:
- Tier assigned
- Initial roles assigned (with handover chain if anyone unavailable)
- SMS sent to team with:
  - Cloud link (24-hour expiration)
  - Brief incident summary (type, location, victim/suspect count)
  - Tier designation
  - Command structure (who's lead, who's supervisor, etc.)
  - Briefing location (if known)
  - ETA window

### Software Component Needed:
**"Call-Out Initiation"** — Tier selector + Role template assignment + SMS link generator

---

## PHASE 1: INITIAL RESPONSE (0-60 minutes)

**Purpose:** Establish scene safety, preserve evidence, initial documentation, command authority

### Pre-Arrival (First Responders):
- Uniform units arrive first (fire, EMS, police)
- Scene is NOT yet under investigation control
- Initial life-safety measures taken

### What Happens Now:
**[CURRENTLY BROKEN]** First responders document scene, then evidence is lost when detective arrives.
Example: I-24 homicide — body moved before county took control. Det. Liedtke's notes were chicken-scratch, had to be manually transcribed to whiteboard.

**[SOLUTION]** First responder intake form (cloud link sent to them BEFORE county arrives):
- Quick incident info (victim, suspect, injuries, weapons, vehicles)
- Initial observations
- Photos/video
- Location pin
- Who's on scene (agency, badge, time arrived)

### Arrival (Detective Takes Command):
- Asserts jurisdiction/authority (like you did at I-24: "By authority of District Attorney...")
- Establishes chain of custody QR sign-in
- Sets up command post location
- Designates roles on scene
- Initiates formal case number/complaint number

### What RCSO Has Now:
- ✓ Jurisdiction assertion (you know how to do it)
- ✗ Pre-arrival incident intake system
- ✗ Automated QR chain-of-custody entry
- ✗ Digital command post setup checklist

### What We're Missing:
1. **Pre-Arrival Incident Intake Form** (for first responders, SMS link-based, auto-expires when county detective arrives)
2. **QR Sign-In System** (each person at scene scans QR to log: name, badge, role, time, purpose)
3. **Command Post Setup Checklist** (lead detective checks off: perimeter secured, evidence area marked, briefing area set, war room display starting, etc.)

### Output:
- Complaint number generated
- Initial incident data in system (structured, not chicken-scratch)
- All responders logged via QR
- Case officially opened in system
- War room display initialized

### Software Components Needed:
1. **"Pre-Arrival Incident Intake"** (form for first responders, auto-expires when lead detective claims case)
2. **"QR Chain-of-Custody Sign-In"** (generates QR, logs all scene entries)
3. **"Command Post Initialization"** (checklist for lead detective arrival)

---

## PHASE 2: SCENE MANAGEMENT & COMMAND BOARD (1-8 hours)

**Purpose:** Organize personnel, establish investigation priorities, coordinate multi-agency response, document everything

### Central Hub: COMMAND BOARD (War Room Display)

**What Goes On It:**
```
COMPLAINT #: 250712-XXXX
INCIDENT TYPE: Homicide (I-24, suspected shooting)
TIER: 3 (Critical)
TIME CALLED: 11:33am
TIME COUNTY TOOK CONTROL: 11:52am

COMMAND STRUCTURE:
  Supervisor: Sgt. Amanda McPherson
  Lead Detective: Detective Stanley
  Co-Lead: [Assigned if available]
  
SCENE LOCATION: I-24 Westbound, Rutherford/Davidson county line
BRIEFING LOCATION: [Location if established]

ON-SCENE PERSONNEL:
  Role                    Name            Badge   Location              Status
  ─────────────────────────────────────────────────────────────────────────────
  Lead Detective          Stanley         CID-47  Ravine/Body Area      Active
  Supervisor              McPherson       Sgt-12  Perimeter             Active
  Crime Scene Tech        Kendall         CST-08  Evidence Area         Active
  Sketch Tech             [Name]          [#]     [Location]            Active
  Photographer            [Name]          [#]     [Location]            Active
  [Continue for all roles]
  
  ROAMING/TRAFFIC: 
    Detective Jones       CID-34  I-24 North Approach    Active
    Dispatcher            --      Dispatch Center        Active
    [All uniformed units]

OUTER AGENCIES ON SCENE:
  Agency              Contact              Badge/ID    Purpose                  Status
  ──────────────────────────────────────────────────────────────────────────────
  LaVergne PD         Officer Smith        LP-456      Traffic Control          ON-SCENE
  THP                 Sgt. Johnson         THP-789     Highway Closure          ON-SCENE
  Fire/EMS            Chief Davis          FD-321      Life Safety              ON-SCENE
  Medical Examiner    Dr. Brown            ME-555      Preliminary Exam         EN ROUTE (ETA 12:30pm)
```

### Information Layers on Command Board:

**Layer 1: TIMELINE (Dual-Timeline)**
```
CRIME TIMELINE:                       INVESTIGATION TIMELINE:
11:00am - Shooting occurs             11:33am - Dispatch call received
11:05am - Victim in ravine            11:43am - County detective arrives at scene
11:20am - 911 call received           11:52am - Scene secured, jurisdiction asserted
11:33am - First responders arrive     12:15pm - Command board initialized
                                      12:30pm - Medical examiner arrives
                                      1:15pm - Preliminary scene walkthrough complete
                                      3:00pm - Evidence collection begins
```
**On MAP:** Each timeline event is a pin on the actual geographic map
- Red pins: Crime events
- Blue pins: Investigation milestones
- Green pins: Evidence found locations
- Yellow pins: Witness interview locations
- Orange pins: Suspect sighting locations

**Layer 2: VICTIMS & VICTIMOLOGY TREE**
```
VICTIM 1: John Smith, DOB 1955, Race: White Male

VICTIM DETAILS:
├─ Demographics: 70yo, retired teacher
├─ Physical Description: 5'10", 180 lbs, gray hair, glasses
├─ Location Found: I-24 shoulder, ravine ~30 yards, in vehicle
├─ Vehicle: 2019 Ford F-150, Blue, Tag: [ABC123]
├─ Injuries: GSW to [specific location], [other injuries]
├─ Condition: Deceased at scene
├─ Clothing: [Full description]
├─ Property On Body: [Wallet, keys, etc. - inventory]
├─ Medical History: [Known conditions, medications]
│
├─ IMMEDIATE FAMILY:
│  ├─ Wife: Sarah Smith, DOB 1958
│  │  ├─ Contact: 615-555-0123 (notified 12:15pm by McPherson)
│  │  ├─ Current Location: Home
│  │  ├─ Interview Status: Pending (suspect or grieving?)
│  │  └─ Link Sent: [SMS with interview request, expiration time]
│  │
│  ├─ Son: Michael Smith, DOB 1985
│  │  ├─ Contact: 615-555-4567
│  │  ├─ Current Location: Unknown
│  │  ├─ Last Contact with Victim: [When?]
│  │  └─ Link Sent: [Pending]
│  │
│  └─ Daughter: Jennifer Smith, DOB 1988
│     ├─ Contact: 615-555-7890
│     ├─ Current Location: Work
│     └─ Link Sent: [Pending]
│
├─ EXTENDED FAMILY:
│  ├─ Brother: Tom Smith
│  │  └─ Contact: [phone, address]
│  └─ Sister-in-law: [etc.]
│
├─ CLOSE FRIENDS:
│  ├─ Golf buddy: Robert Johnson
│  │  ├─ Contact: 615-555-9999
│  │  ├─ Last saw victim: [Date/Time]
│  │  └─ Link Sent: [timestamp]
│  └─ [Others]
│
├─ WORK/PROFESSIONAL:
│  ├─ Former employer: Rutherford County Schools
│  ├─ Colleagues: [Names and contacts]
│  └─ Professional associations: [Rotary Club, etc.]
│
├─ SOCIAL CONNECTIONS:
│  ├─ Church: First Baptist, Nashville
│  ├─ Active memberships: Rotary Club, Golf League
│  ├─ Social media accounts: Facebook (John_Smith70), Instagram [none]
│  └─ Online activity: [Any recent posts, activity?]
│
├─ NEIGHBORHOOD:
│  ├─ Address: 123 Maple St, Murfreesboro
│  ├─ Neighbors: [Names, contact info, relationship]
│  │  ├─ Across street: Mary Jones
│  │  │  └─ Link Sent: [interview request]
│  │  └─ Next door: [etc.]
│  └─ Neighborhood watch: [Active? Any reports?]
│
├─ PROPERTY & ASSETS:
│  ├─ Vehicle: 2019 F-150 (recovered at scene)
│  ├─ Wallet: [Found? Missing? Contents?]
│  ├─ Cash: [Amount found on body/in vehicle?]
│  ├─ Credit cards: [Use after death? Check within 24hrs]
│  ├─ Bank accounts: [Frozen? Unusual activity?]
│  ├─ Firearms: [Did victim own guns? Registered?]
│  └─ Property: [Home, investments, will on file?]
│
└─ BEHAVIORAL/MOTIVE FACTORS:
   ├─ Recent life changes: [Job, health, relationships?]
   ├─ Known conflicts: [Enemies? Disputes? Threats?]
   ├─ Substance use: [Known issues?]
   ├─ Gambling/debt: [Any issues?]
   ├─ Mental health: [Any known issues?]
   └─ Recent communications: [Threats, unusual calls/texts?]
```

**Layer 3: SUSPECTS & CONNECTIONS**
```
SUSPECT 1: Unknown (In Progress)

DESCRIPTION:
├─ Physical: [Race, approx age, height, build from witnesses]
├─ Clothing: [Description]
├─ Weapon: [Firearm type, if known]
├─ Vehicle: [Description, direction fled, last seen]
└─ Known Aliases: [If any]

CONNECTIONS TO VICTIM:
├─ Previous relationship: [Known to victim? How?]
├─ Motive: [Robbery? Personal? Mistaken identity?]
├─ Last interaction with victim: [Known?]
└─ Known associates: [Any co-conspirators?]

PRIOR CRIMINAL HISTORY: [If known]
├─ Arrests: [List]
├─ Convictions: [List]
├─ Weapons charges: [Any?]
└─ Violence history: [Any violent offenses?]

CURRENT STATUS:
├─ Location: UNKNOWN - ACTIVE MANHUNT
├─ Vehicle: [Description/tag if fled]
├─ Threat Level: IMMEDIATE (armed, active threat)
└─ BOLO Issued: [Time, agencies notified]
```

**Layer 4: FACT / WHAT I THINK / HOW TO VERIFY**
```
FACT COLUMN                    WHAT I THINK (Hypothesis)          HOW TO VERIFY
─────────────────────────────────────────────────────────────────────────────────
✓ Victim found in ravine       Could have been hit here, not       [ ] Scene reconstruction
  (confirmed)                   thrown after death                  [ ] Witness statements
                                                                    [ ] Medical examiner autopsy

✓ GSW to chest                 Suspect fired from nearby location  [ ] Ballistics evidence
  (confirmed by ME)                                                [ ] Gunshot residue on hands
                                                                    [ ] Scene walkthrough

? Witness says "blue pickup"   Suspect fled in vehicle             [ ] License plate check
  (heard, not confirmed)                                           [ ] Traffic camera footage
                                                                    [ ] Nearby parking lot video

? "Argument" overheard earlier Unknown if related to incident      [ ] Canvass neighborhood
  (one witness)                                                    [ ] Check victim's recent contacts
                                                                    [ ] Review phone records

✗ "Robbery" - assumption       Could be robbery, could be personal [ ] Check victim's wallet/cash
  (NOT VERIFIED YET)           dispute, could be mistaken identity [ ] Interview family about debts
                                                                    [ ] Gang/organized crime check

✗ "Random shooting" - theory   Unlikely without connection         [ ] Deep dive on victim associations
  (being considered)           but possible                        [ ] Cross-check suspect description
                                                                    [ ] Firearms registration check
```

### What RCSO Has Now:
- ✓ Can manually create command board on whiteboard
- ✓ Can write down victim/suspect info on paper
- ✗ No digital command board with live data entry
- ✗ No automated victimology tree structure
- ✗ No FACT/THINK/VERIFY tracking framework
- ✗ No integrated map overlay system

### What We're Missing:
1. **Command Board Digital Display** (read-only war room display, updates in real-time from tablet entries)
2. **Victimology Tree Manager** (structured form to build full victim picture, auto-generates contact list with link status)
3. **Suspect/Connection Tracker** (dynamic suspect database, motive assessment, connection mapping)
4. **FACT/THINK/VERIFY Framework** (3-column tracker on command board, shows evidence strength)
5. **Integrated Map Visualization** (crime timeline, investigation events, evidence locations, witness locations all as map pins, colorized)
6. **Personnel Schedule/Status Board** (shows every detective/officer on scene, badge number, role, location, status)

### Output:
- Complete command board initialized and visible on war room display
- All on-scene and en-route personnel logged with roles
- Victim information structured and shareable
- Initial suspect description logged
- Investigation task list generated
- Map with initial evidence/event pins

### Software Components Needed:
1. **"Command Board Display"** (real-time, read-only war room display)
2. **"Victimology Manager"** (hierarchical victim information tree)
3. **"Suspect Tracker"** (suspect descriptions, connections, motive, prior history)
4. **"FACT/THINK/VERIFY Logger"** (3-column evidence tracking on command board)
5. **"Map Overlay System"** (timeline events + investigation events + locations, colorized pins)
6. **"Personnel Roster"** (live status, badge numbers, current location, role)

---

## PHASE 3: INVESTIGATION (Days to Weeks)

**Purpose:** Develop timeline, identify suspects, interview witnesses, collect evidence, build prosecution narrative

### Key Components:

**A. Investigation Task List**
```
TASK                                    ASSIGNED TO      DUE DATE    STATUS       PRIORITY
──────────────────────────────────────────────────────────────────────────────────────────
[ ] Interview victim's immediate family  Stanley          Today 5pm    In Progress  CRITICAL
[ ] BOLO broadcast for suspect vehicle   Dispatch         Today 1pm    Complete     CRITICAL
[ ] Secure weapon evidence               CST Kendall      Today 3pm    Complete     HIGH
[ ] Interview 911 caller                 Det. Jones       Today 4pm    Assigned     HIGH
[ ] Canvass neighborhood for witnesses   Uniform Units    Today 8pm    In Progress  HIGH
[ ] Pull traffic camera footage (I-24)   Tech Support     Tomorrow     Assigned     MEDIUM
[ ] Ballistics analysis                  Lab              5 days       Submitted    MEDIUM
[ ] Gunshot residue testing              Lab              3 days       Submitted    MEDIUM
[ ] Phone records subpoena (victim)      Detective        Tomorrow     Assigned     MEDIUM
[ ] Financial records review             Detective        5 days       Pending      LOW
[ ] Social media deep-dive                Detective        5 days       Pending      LOW
```

**B. Evidence Tracker**
```
EVIDENCE #    LOCATION FOUND     DATE/TIME FOUND   COLLECTED BY    CHAIN OF CUSTODY    ANALYSIS STATUS    EXHIBIT TAG
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
EV-001        Body/Vehicle       7/12 11:43am      ME Davis        Logged              Autopsy Pending     [Photo]
EV-002        Ravine (left of    7/12 12:15pm      CST Kendall     → Evidence Room     Ballistics WIP      9mm shell
              body)
EV-003        10 yards from      7/12 12:45pm      CST Kendall     → Evidence Room     Lab WIP             Firearm, 9mm
              body (under        (Retrieved 1:30pm)                                     pistol
              brush)
EV-004        Victim's wallet    7/12 2:30pm       CST Kendall     → Evidence Room     Contents Logged     Leather wallet
              (in vehicle)
EV-005        Victim's phone     7/12 2:31pm       CST Kendall     → Evidence Room     Pending Unlock      iPhone 12
```

**C. Timeline (Crime + Investigation)**
```
TIMELINE                                         LOCATION                    EVIDENCE                INVESTIGATOR
───────────────────────────────────────────────────────────────────────────────────────────────────────────────
7/12 ~11:00am - Shooting occurs                 I-24 ravine                 EV-001, EV-002, EV-003  [Reconstructed]
7/12 ~11:05am - Victim found/911 called         Ravine                      —                       [Witness unknown]
7/12 11:33am  - Dispatch receives call          Dispatch                    —                       [911 Audio]
7/12 11:43am  - First responders arrive         I-24 shoulder               —                       [Fire/EMS logs]
7/12 11:52am  - County Detective Stanley        I-24 shoulder               —                       [Stanley arrival]
                arrives, takes command
7/12 12:15pm  - Scene secured, ME en route      I-24 shoulder               —                       [Stanley command]
7/12 12:30pm  - ME arrives at scene             Ravine                      —                       [ME logged]
7/12 1:30pm   - Firearm recovered from brush    Ravine                      EV-003                  [CST Kendall]
7/12 2:30pm   - Initial scene walkthrough       Ravine + Vehicle            EV-004, EV-005          [Team walkthrough]
                complete
7/12 3:00pm   - Victim's wallet photographed    Vehicle                     EV-004                  [Photography]
                and logged
7/12 4:00pm   - Initial interviews with family  Family home                 —                       [Stanley]
7/12 5:30pm   - Suspect vehicle description      —                          —                       [From witnesses]
                circulated (BOLO)
7/13 10:00am  - Traffic camera footage          Tech room                   EV-006 (video)          [Tech team]
                retrieved
```

**D. Witness Interview Tracker**
```
WITNESS NAME           RELATIONSHIP        CONTACT              INTERVIEW STATUS        NEXT STEPS
─────────────────────────────────────────────────────────────────────────────────────────────────
Sarah Smith            Victim's wife       615-555-0123         Interviewed 7/12 4pm   [ ] Follow-up questions
                                                                                        [ ] Polygraph (if suspect)

Michael Smith          Victim's son        615-555-4567         Assigned to Stanley    [ ] Interview this week
Jennifer Smith         Victim's daughter   615-555-7890         Link sent 7/12 11am    [ ] Awaiting response

Robert Johnson         Golf buddy/friend   615-555-9999         Interviewed 7/12 7pm   [ ] Background check
                       (last contact)                            (Alibi: at home)

911 Caller (Unknown)   Bystander           911 call audio       Phone number traced    [ ] Interview when contacted
                                           only                  to John Doe            

Witness #1             Overheard argument  Unknown              No contact yet         [ ] Canvass neighborhood
"Argument at 10:45am"  (Not IDed)                               (Heard, not seen)      [ ] Reconstruct statement

Officer Smith          First responder     Badge LP-456         —                      [ ] Formal statement
(LaVergne PD)          on scene                                                        [ ] Scene observations
```

### What RCSO Has Now:
- ✓ Manual task tracking (notebook, whiteboard)
- ✓ Manual evidence logs (paper)
- ✓ Manual timeline building
- ✓ Manual witness contact list
- ✗ No integrated digital system
- ✗ No task assignment automation
- ✗ No evidence chain-of-custody automation
- ✗ No timeline visualization
- ✗ No witness link tracking

### What We're Missing:
1. **Investigation Task Manager** (create, assign, track, due dates, priority, status)
2. **Evidence Tracker** (detailed, QR-based entry, chain of custody automated)
3. **Timeline Builder** (dual timeline, can pin to map, integrated)
4. **Witness Contact Manager** (hierarchical, link tracking, interview status, follow-up reminders)
5. **Map Integration** (all events pinned to actual location, searchable)

### Software Components Needed:
1. **"Task Manager"** (assign, track, notify)
2. **"Evidence Tracker"** (QR sign-in, chain of custody, analysis status)
3. **"Timeline Visualization"** (interactive, dual timeline, map-integrated)
4. **"Witness Interview Manager"** (contact tree, interview status, link expiration tracking)
5. **"Investigation Dashboard"** (summary of all active tasks, pending interviews, evidence analysis status)

---

## PHASE 4: OPERATIONS (Search Warrant Execution) — IF NEEDED

**Purpose:** Plan and execute authorized search to find evidence or locate suspect

### Components:

**A. Risk Assessment / Threat Assessment Form**
(Pre-existing RCSO form, needs digitization)
- Suspect threat level
- Weapon information
- Environmental hazards
- Resource requirements
- Recommended tactics

**B. OPS Plan Form** (MVP - Already defined)
- Complaint number (linked from case)
- Personnel assignments
- Equipment checklist (integrated)
- Supplement assignments (integrated)
- Supervisor approval workflow (integrated)

**C. Equipment Checklist** (Integrated into OPS Plan)
- Auto-generates per operation type
- Supervisor verification pre-execution
- Post-operation actual-vs-planned tracking

**D. Supplement Tracking** (Integrated into OPS Plan)
- Role-based assignments
- Auto-reminders
- Due date tracking
- Status visibility to lead detective

### What RCSO Has Now:
- ✓ Threat Assessment form (paper)
- ✓ OPS Plan form (paper)
- ✗ Digital versions of either
- ✗ Equipment verification system
- ✗ Supplement tracking automation

### What We're Missing:
1. **Threat Assessment Form (Digital)** (must match original form, printed exactly)
2. **OPS Plan Form (Digital)** (already defined in MVP, includes equipment + supplements)
3. **Pre-Execution Checklist** (all gear verified, all roles briefed, all supplements explained)

### Software Components Needed:
1. **"Threat Assessment Form"** (digital version of original RCSO form)
2. **"OPS Plan Form"** (as per MVP - CURSOR_PROMPTS_OPS_PLAN_MVP.md)

---

## PHASE 5: CASE CLOSURE

**Purpose:** Finalize documentation, file prosecution package, archive case

### Components:
- All supplements filed
- Evidence analysis complete
- Prosecutor briefing package generated
- Case marked "solved" or "cold case" or "pending charges"

### What RCSO Has Now:
- ✗ No automation

### What We're Missing:
1. **Prosecution Package Generator**
2. **Case Closure Checklist**
3. **Cold Case Archive System**

---

## COMPLETE COMPONENT INVENTORY

### ✓ HAVE (Defined or Started):
1. OPS Plan Form (MVP complete - ready for Cursor build)
2. Equipment Checklist (integrated into OPS Plan)
3. Supplement Tracking (integrated into OPS Plan)
4. Threat Assessment Form (paper original exists, needs digitization)
5. General case intake concept (discussed, not detailed)

### ✗ MISSING (Needed for full workflow):

**PHASE 0 (Call-Out):**
- [ ] Tier decision system (auto-suggest tier based on incident type)
- [ ] Role template library (Tier 1/2/3 role assignments)
- [ ] Handover policy (if lead detective unavailable)
- [ ] SMS link generator (auto-send to team with incident summary)

**PHASE 1 (Initial Response):**
- [ ] Pre-arrival incident intake form (for first responders)
- [ ] QR chain-of-custody sign-in system
- [ ] Command post initialization checklist

**PHASE 2 (Command Board):**
- [ ] Command board digital display (war room read-only)
- [ ] Victimology tree manager (hierarchical victim info)
- [ ] Suspect tracker (description, connections, motive)
- [ ] FACT/THINK/VERIFY tracker (3-column evidence framework)
- [ ] Map overlay system (timeline + investigation + locations)
- [ ] Personnel roster/status board

**PHASE 3 (Investigation):**
- [ ] Task manager (assign, track, notify)
- [ ] Evidence tracker (detailed, QR-based, chain of custody)
- [ ] Timeline builder (dual timeline, map-integrated)
- [ ] Witness interview manager (contact tree, link tracking)
- [ ] Investigation dashboard

**PHASE 4 (Operations):**
- [ ] Threat assessment form (digital)
- [ ] OPS Plan form (digital) ← MVP READY FOR CURSOR
- [ ] Equipment checklist (integrated) ← MVP READY FOR CURSOR
- [ ] Supplement tracking (integrated) ← MVP READY FOR CURSOR

**PHASE 5 (Case Closure):**
- [ ] Prosecution package generator
- [ ] Case closure checklist
- [ ] Cold case archive system

---

## DEPENDENCIES & BUILD SEQUENCE RECOMMENDATION

### Tier 0 (Blocking - must build first):
1. Authentication & user management (who logs in, what role do they have)
2. Complaint number generator & case creation
3. Basic database schema (to support everything else)

### Tier 1 (Foundation - needed before operations):
1. Call-out initiation (tier selection + SMS link generation)
2. Command board display (read-only war room display)
3. Victimology tree manager
4. Pre-arrival incident intake form
5. QR chain-of-custody sign-in

### Tier 2 (Operational - enables search warrants):
1. ✓ OPS Plan form (MVP ready)
2. ✓ Equipment checklist (integrated)
3. ✓ Supplement tracking (integrated)
4. Threat assessment form (digital)
5. Task manager

### Tier 3 (Investigation - supports post-operation):
1. Evidence tracker
2. Timeline builder
3. Witness interview manager
4. Map overlay system
5. Investigation dashboard

### Tier 4 (Administrative - case closure):
1. Prosecution package generator
2. Case closure checklist
3. Cold case archive

---

## HANDOVER POLICY (NEW - Not Yet Defined)

**Situation:** Lead Detective Stanley gets called to different case or emergency, unavailable for several hours mid-investigation.

**Current State:** ✗ Not defined - chaos and confusion
**What We Need:**

### Policy Rules:
1. **If lead detective goes unavailable:**
   - Automatically notify supervisor + co-lead (if assigned)
   - Co-lead assumes lead role (already briefed)
   - If no co-lead assigned, next senior detective assumes role
   - Handoff is logged: date/time, from/to, reason, duration

2. **If handover is >4 hours:**
   - New lead gets briefing document (OPS Plan or case summary)
   - New lead reviews command board and latest updates
   - New lead reviews task list and reassigns as needed

3. **If handover is >24 hours:**
   - All team members notified
   - New lead briefs all personnel on scene
   - All role assignments reviewed and confirmed
   - New lead marks themselves as "Case Lead" in system

4. **Handover log in system:**
   - Timestamp: [When]
   - Original lead: [Name, badge]
   - New lead: [Name, badge]
   - Reason: [Emergency, other case, medical, etc.]
   - Duration: [Expected duration]
   - Documents reviewed: [Task list, command board, etc.]
   - Sign-off: [Both detectives confirm]

### Software Component Needed:
- [ ] **"Role Handover Manager"** (trigger on lead detective status change, automated notification, handover logging)

---

## SUMMARY TABLE: What We Have vs. What's Missing

| Phase | Component | Have? | Status | Cursor Ready? |
|-------|-----------|-------|--------|---------------|
| 0 | Tier decision | ✗ | Concept only | No - needs refinement |
| 0 | Call-out SMS generator | ✗ | Discussed | No - needs specs |
| 1 | Pre-arrival intake form | ✗ | Discussed | No - needs specs |
| 1 | QR sign-in | ✗ | Discussed | No - needs specs |
| 2 | Command board display | ✗ | Discussed | No - needs specs |
| 2 | Victimology tree | ✗ | Outline only | No - needs schema |
| 2 | Suspect tracker | ✗ | Outline only | No - needs schema |
| 2 | FACT/THINK/VERIFY | ✗ | NEW (your idea today) | No - needs design |
| 2 | Map overlay | ✗ | Mentioned | No - needs specs |
| 3 | Task manager | ✗ | Mentioned | No - needs specs |
| 3 | Evidence tracker | ✗ | Mentioned | No - needs specs |
| 3 | Timeline builder | ✗ | Mentioned | No - needs specs |
| 3 | Witness manager | ✗ | Mentioned | No - needs specs |
| 4 | Threat assessment form | ✓ Paper | Original form exists | No - needs digitization specs |
| 4 | OPS Plan form | ✓ Paper | Original form exists | **YES - MVP ready** |
| 4 | Equipment checklist | ✓ Concept | Designed (integrated) | **YES - MVP ready** |
| 4 | Supplement tracking | ✓ Concept | Designed (integrated) | **YES - MVP ready** |
| 5 | Prosecution package | ✗ | Not started | No - needs specs |

