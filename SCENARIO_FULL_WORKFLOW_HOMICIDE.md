# Full Scenario Walkthrough: Homicide Investigation

## From Call-Out to Arrest to Closure

**Case:** I-24 Shooting (Interstate 24 East @ MM 64.8)  
**Date:** Saturday, July 12, 2025  
**Status:** Road rage incident escalates to homicide, suspects arrested July 18

---

## PHASE 0: PRE-CALL (Friday July 11, 11pm - Saturday July 12, 8:00am)

### What Actually Happened (Case Timeline)

- Victim and suspect had prior road rage incident (June 29)
- Night before shooting: Victim stays at friend's house with dog
- Morning of shooting: Victim leaves residence ~7:00am, stops at Red Bicycle Coffee ~7:25am
- ~7:32am: Suspect (in dark SUV) also at Red Bicycle Coffee (unknown to victim)
- Victim leaves coffee shop, heads to I-24 westbound

### System Status: IDLE

- No case in system
- No war room
- No tasks
- No team assembled

---

## PHASE 1: INCIDENT & CALL-OUT (Saturday July 12, 9:31am - 11:33am)

### T+0 — SGT RECEIVES CALL (9:31am)

**What Sgt. Does (OLD SYSTEM):**

- Gets call from patrol: "Shooting on I-24, victim in vehicle, possible fatal"
- Sgt. yells across bullpen: "We got a call-out! I-24 shooting!"
- Someone grabs a whiteboard marker
- Sgt. calls Lead Detective Amanda directly: "You're up"
- Sgt. texts group chat: "Shooting I-24 need CID"

**What Sgt. Does (NEW SYSTEM):**

1. Opens CID Portal on computer
2. Clicks: **"New Case"**
3. Fills intake form:
  - **Incident Type:** Shooting
  - **Location:** Interstate 24, near Mile Marker 64.8
  - **Date/Time:** Saturday July 12, 2025, ~09:31 (time of call)
  - **Description:** Patrol reports vehicle with gunshot victim, possible fatality, subject still in vehicle
  - **Initial Severity (Tier Estimate):** Homicide (Tier 3)
  - **Reporting Officer:** [Name]
4. System displays: **"Confirm Tier 3 Homicide - Auto-load task template?"**
5. Sgt. clicks **"Yes, Load Tier 3 Template"**
6. System auto-generates task list (~30 tasks):
  - Scene Security
  - Body Recovery & Transport
  - Initial Interviews (Witness, Suspect ID)
  - Video Collection (Nearby businesses, traffic cameras)
  - Evidence Collection (Casings, vehicle, phone)
  - Autopsy Scheduling
  - Canvass (Witness location, suspect vehicle)
  - Warrant Preparation (Cell phone, GPS, vehicles)
  - Timeline Documentation
  - Family Notification
  - Media Relations
  - ... and more
7. Sgt. **edits task list** before committing:
  - Removes: "Focus Time" (not applicable)
  - Adds: "Notify County ME for autopsy"
  - Checks: All tasks that require supplements
8. Sgt. clicks **"Assign Lead Detective"** → Selects **Amanda McPherson**
9. Sgt. clicks **"ACTIVATE CASE"**

### System Reaction (Instant):

- **Case created:** "250712-07867 | I-24 Shooting | Tier 3"
- **War room display lights up** (if connected to CID portal on TV)
- **Push notification to Amanda's phone:** "Case activated: I-24 Shooting, Tier 3. You are Lead Detective. 30 tasks loaded. Review and assign team."
- **Case dashboard appears** on Amanda's screen showing:
  - Task board (all 30 tasks in "Pending" state)
  - Team roster (empty, waiting for assignments)
  - Timeline (empty)
  - Evidence tracker (empty)
  - Supplements due (30 supplements auto-created, all "Outstanding")

---

## T+0:25 — LEAD DETECTIVE FIRST ACTION (9:56am)

**Amanda on her iPad (arriving to CID conference room):**

Sees:

```
CASE: I-24 Shooting | Tier 3 | ACTIVE
TASKS: 30 | Pending: 30 | In Progress: 0 | Waiting: 0 | Complete: 0

CRITICAL PATH (High Priority):
□ Scene Security (Assign)
□ Body Recovery (Assign)
□ Witness Initial Interview (Assign)
□ Suspect Vehicle Identification (Assign)
```

Amanda's first action on iPad:

1. Taps **Scene Security** task
2. Assigns to **Det. [Name]** (patrol officer first responder)
3. Assigns **Body Recovery** to **CSI Tech [Name]**
4. Assigns **Initial Witness Interview** to **Det. Quintana**
5. Assigns **Suspect Vehicle ID** to **Det. Whitaker**

**iPad shows each assignment:**

```
Assigned: Det. Quintana
Task: Initial Witness Interview
Status: Pending → Assigned
Supplement Required: YES (Interview Report)
Due: 2 days

Push notification sent to Det. Quintana
```

Det. Quintana's iPad immediately shows:

```
NEW TASK ASSIGNED:
Initial Witness Interview - I-24 Shooting
Assigned: 9:56am by Amanda McPherson (Lead)
Description: Interview witness at scene, obtain initial statement on suspect vehicle, shooter description, victim relationship
Location: I-24 MM 64.8
Deadline: July 14 (for supplement filing)
Supplement: Interview Report required by July 14

[ ACCEPT ]  [ VIEW DETAILS ]  [ QUESTIONS? ]
```

Det. Quintana taps **ACCEPT** → Task status changes to **"In Progress"**

**War room display updates in real-time:**

```
Task Board:
PENDING (30)  │ ASSIGNED (5)  │ IN PROGRESS (1)  │ WAITING (0)  │ COMPLETE (0)
─────────────────────────────────────────────────────────────────────────
             │ Scene Sec.    │ Init Interview  │              │
             │ Body Recov.   │ (Quintana)      │              │
             │ Veh ID        │                 │              │
             │ Witness Int.  │                 │              │
```

---

## T+2-6 hours (INITIAL RESPONSE & SCENE - 11:33am to 3:30pm)

### Scene Documentation (Multiple Detectives)

**Det. Quintana (Initial Interview) — iPad at scene, 11:45am:**

1. Opens interview form on iPad
2. Interacts with witness (already spoken to by patrol)
3. Takes notes directly on iPad (handwriting + form)
4. Captures witness description of suspect vehicle:
  - "Dark colored SUV"
  - "Black male driver"
  - "Rifle barrel visible out window"
5. Takes photo of witness with iPad camera (geotagged automatically)
6. Submits interview notes to CID portal

**System action:**

- Interview notes logged
- Evidence: "Witness statement - Initial" created in Evidence tracker
- Timeline event added: "11:45am - Witness interviewed at scene, suspect vehicle description obtained"
- Task "Initial Witness Interview" marked: **"Complete"** by Det. Quintana
- Supplement reminder auto-created: "Due July 14: Interview Report from Det. Quintana"

**Det. Whitaker (Suspect Vehicle ID) — iPad, remote search:**

1. Starts at 12:15pm
2. Receives task assignment
3. Opens **"Evidence Collection - Video Canvas"** sub-task (linked to main task)
4. Contacts Sgt. X at Metro Traffic Unit: "Need video from TDOT cameras on I-24 MM 63-66"
5. Logs in evidence tracker:
  ```
   Evidence: TDOT Video - I-24 MM 64.8
   Status: Requested
   Requested From: Metro Police Traffic Unit
   Requested Date: 7/12 12:15pm
   Requested By: Det. Whitaker
   Expected Return: Same day (emergency footage)
   Linked Task: Suspect Vehicle ID
   Supplement: Video Review Report (required)
  ```
6. Status shows on Amanda's war room display: **"Waiting For: TDOT video"**

**CSI on scene (Evidence Collection) — iPad or paper:**

1. Photographs shell casings (6 total, location tagged)
2. Collects casings into evidence bag
3. Photos uploaded from iPad:
  ```
   Evidence: .223 Fired Cartridge Casings (6)
   Photos: Geotagged, timestamped
   Status: Collected, Cataloged
   Sent To: Rutherford County Evidence Bay
   Next: TBI Ballistics Analysis
   Supplement: TBI Analysis Report (required, expected 7/20)
  ```

**Amanda (Lead Detective) — War room, managing case:**

War room display shows:

```
TASK BOARD
────────────────────────────────────────
PENDING          IN PROGRESS         COMPLETE
────────────────────────────────────────
□ Autopsy        ✓ Init Interview   ✓ Scene Sec.
□ Canvas          (Quintana)          (On-scene)
□ Canvass Lead   ✓ Veh ID
  Assignment      (Whitaker - 
□ Doorbell Ftg    waiting for TDOT)
□ Timeline Doc

EVIDENCE TRACKER
────────────────────────────────────────
□ Shell casings (6)        Collected, TBI pending
□ TDOT Video              Requested, Metro Traffic
□ Victim vehicle          Evidence Bay
□ Cell phone (victim)     Waiting for Sgt. X

SUPPLEMENTS DUE
────────────────────────────────────────
Outstanding: 27
Overdue: 0
Filed: 0

Next deadline: July 14 (Interview Report from Quintana)
```

Amanda makes notes in **"Case Notes"** section on iPad:

```
"7/12 11:33am - Case declared Tier 3 Homicide, Amanda McPherson (Lead)
Road rage escalation suspected. Suspect vehicle not yet identified.
Witness description: dark SUV, black male driver, rifle visible.
Video critical - waiting on TDOT footage to identify vehicle.
Autopsy scheduled for 7/13."
```

---

## PHASE 2: EARLY INVESTIGATION (Sunday July 13, all day)

### T+24 hours (9:31am Sunday)

**Amanda's War Room Display:**

```
CASE: I-24 Shooting (Homicide)
Last updated: 7/13 8:15am
Case Age: 23 hours

TASK STATUS SUMMARY:
Pending: 26 | In Progress: 2 | Waiting For: 2 | Complete: 5

CRITICAL PATH:
✓ Scene secured
✓ Body transported
✓ Initial interview (witness)
⏳ TDOT video (requested, not yet arrived)
⏳ Autopsy (scheduled 2pm)

SUPPLEMENTS OUTSTANDING (Due 7/14):
- Quintana: Interview Report (witness)
- Whitaker: Video Review Report (TDOT footage analysis)
- CSI: Scene Photos Documentation

Timeline shows:
7/12 09:31 - Call received
7/12 11:45 - Witness interviewed, vehicle description obtained
7/12 14:00 - Body removed from scene
7/12 16:30 - Evidence collected and logged
7/13 14:00 - Autopsy pending (scheduled)
```

**Det. Whitaker — 10:00am Sunday (Waiting Room)**

Whitaker checks iPad. Task status still **"Waiting For: TDOT video"**

Whitaker calls Sgt. X again: "Any sign of that I-24 video?"

Sgt. X: "Coming through. Meet me at TA Truck Stop."

At 10:45am, Whitaker meets Sgt. X at truck stop, gets zip drive with TDOT footage.

Whitaker returns to CID, begins reviewing footage.

**System update:**

```
Evidence: TDOT Video - I-24 MM 63-66
Status: Received (10:45am, 7/13)
Received By: Det. Whitaker
Content: Continuous video, 06:00am-09:00am 7/12

Task: Suspect Vehicle ID
Status: In Progress → Waiting For (lab analysis if needed)
or Complete (if suspect vehicle identified from video)
```

Whitaker watches video carefully. Notes:

- 07:31am: Red pickup (victim) passing northbound on I-24
- 07:32am: Dark SUV (suspect) enters I-24, rapidly approaches red pickup
- 07:32-07:35am: SUV swerves in front of pickup, driver of SUV points rifle barrel out window
- 07:35am: Multiple muzzle flashes visible
- Victim's vehicle swerves, crashes into median

**Whitaker immediately updates task:**

```
Task: Suspect Vehicle ID
Status: COMPLETE
Notes: Suspect vehicle identified as dark colored SUV (color appears charcoal or black)
Vehicle behavior: Road rage escalation, aggressive driving, deliberate shooting
Victim vehicle: Red pickup truck
Suspect details: Black male driver, visible rifle (appears to be AR-style rifle)

FINDINGS:
- Suspect vehicle distinctive, dark color with possible chrome trim
- Video shows clear premeditation - not accidental
- Shooter clearly visible but photo quality limited for identification
- Multiple angles from TDOT cameras show full sequence

Next: Enhance footage, distribute suspect vehicle description to area departments
```

**Amanda gets notified (push notification):**
"Det. Whitaker: Suspect Vehicle ID task COMPLETE. Dark SUV identified on TDOT video. Premeditation evident. See task details."

Amanda reviews video herself (war room display can stream video).

**Amanda's decision (recorded in case notes):**
"7/13 11:15am - TDOT video reviewed. Suspect vehicle clearly dark SUV. Shots fired deliberately. Homicide (not accident or self-defense claim viable). Escalate to full major case. Activate mobile video enhancement with Metro. Initiate statewide BOLO for dark SUV."

**Task board updates:**

- **New task created:** "BOLO Issuance - Dark SUV (Statewide)"
- **New task created:** "Video Enhancement & Facial Recognition"
- **New task created:** "Canvass - Red Bicycle Coffee (6:30am-8:00am window)"
- Task "Suspect Vehicle ID" → **COMPLETE** (supplement: Video Review Report due 7/15)

---

### Autopsy (Sunday 2:00pm, 7/13)

Amanda and Det. [Name] attend autopsy.

ME performs examination, documents:

- Multiple gunshot wounds to head/torso
- Skull cracked, cause of death confirmed: GSW
- Ballistics: .223 caliber wounds consistent with shell casings found

**Autopsy report filed as evidence:**

```
Evidence: Medical Examiner's Report - Autopsy
Type: Digital (PDF)
Date: 7/13 2:00pm
Filed By: ME [Name]
Status: Received, Cataloged
Linked Task: Autopsy
Supplement: Findings documented in ME report
```

Amanda updates task:

- **Autopsy** → **COMPLETE**
- Case notes: "7/13 14:00 - Autopsy confirms death by gunshot. .223 caliber consistent with shell casings."

---

## PHASE 3: VIDEO INVESTIGATION & CANVASS (Monday July 14)

### T+29 hours (Monday 9:00am)

**Lead Detective Amanda — War Room Dashboard:**

```
PROGRESS:
Tasks Complete: 8
Tasks In Progress: 4
Tasks Waiting For: 3
Tasks Pending: 15

CRITICAL UPDATES SINCE YESTERDAY:
✓ Autopsy complete - Cause of death confirmed
✓ TDOT video reviewed - Suspect vehicle identified (dark SUV)
✓ Video shows premeditation, deliberate shooting
⏳ Video enhancement in progress (Metro Video Unit)
⏳ Canvass beginning (witness background, suspect vehicle sightings)
⏳ Warrant prep: Cell phone data, GPS tracking (suspect/victim)

SUPPLEMENT STATUS:
Due Today (7/14): 3
- Whitaker: Video Review Report
- Quintana: Interview Report
- CSI: Scene Documentation

Due 7/15: 5
Due 7/16: 4
...
Outstanding: 24
```

### NEW TASK WAVE: EXPAND INVESTIGATION (Monday Morning)

Amanda assigns tasks to detectives arriving for 0800 briefing:

**To Det. Smith:**

- Task: **Canvas - Red Bicycle Coffee (6:30am-8:00am window)**
- Description: Victim was at Red Bicycle Coffee at ~7:25am. Suspect may have also been there. Interview staff, review doorbell/security footage, identify anyone who saw suspect vehicle in lot.
- Deadline: 7/15
- Supplement Required: Canvas Report (findings, interviews, video stills)

**To Det. Brown:**

- Task: **Video Enhancement & Facial Recognition**
- Description: Work with Metro Video Unit to enhance TDOT footage, pull stills of suspect driver, attempt facial recognition through databases
- Deadline: 7/16
- Supplement Required: Video Analysis Report (stills, identification attempts, results)

**To Det. Jones:**

- Task: **Canvas - Neighborhood witness interviews**
- Description: Expand beyond initial witness. Find anyone who saw dark SUV, heard gunshots, can provide additional vehicle description or direction of travel
- Deadline: 7/16
- Supplement Required: Canvas Report (witness list, statements)

**To Evidence Tech:**

- Task: **Cell Phone Data - Victim & Suspect (Warrant Prep)**
- Description: Draft subpoena/warrant for victim's phone (call records, location data, text messages). Prepare for suspect phone data request once suspect identified.
- Deadline: 7/15
- Supplement Required: Warrant Preparation Document

**Amanda updates Risk Assessment Form (auto-triggered for Tier 3):**

```
RISK ASSESSMENT / THREAT ASSESSMENT

Situation: Homicide (road rage escalation), shooter at large
Section A - Situation: Warrant for homicide = 5 points
Section B - Suspect: Violent crime (homicide), firearms proficiency (accurate shots) = 12 points
Section C - Dangerous Items: .223 rifle (shoulder-fired, multiple rounds) = 12 points
Section D - Location Risk: Multiple residents likely at or near residence = 3 points
Section E - Tactics: SWAT assist recommended if suspect located = -2 points (favorable conditions)

TOTAL SCORE: 30 points
THRESHOLD: 25+ requires SWAT assist

DECISION: SWAT TEAM WILL ASSIST IF SUSPECT LOCATED FOR ARREST
```

Risk Assessment pushed to SWAT Commander's iPad automatically.

---

### MONDAY (7/14) - CRITICAL DISCOVERY

**Det. Smith (Canvas at Red Bicycle Coffee, 10:30am):**

Interviews barista, reviews doorbell footage from 06:30am-08:30am window.

**Finds:** Coffee shop video shows suspect vehicle pulling into parking lot at 07:38am.

Doorbell footage shows:

- 07:38am: Dark SUV enters lot from Nolensville Pike
- 07:39-07:50am: Man exits vehicle (Black male, approximately 6 ft, dark clothing), enters coffee shop
- 07:45am: Man speaks with Red Bicycle employee
- 07:48am: Man walks back to vehicle
- 07:51am: Man exits vehicle again from driver's side, enters building (back entrance, secured by employee)
- 08:23am-08:29am: Two males exit building, walk to vehicle
- 08:57am: Man (different male) pulls into lot, picks up previous man

**Det. Smith updates task:**

```
Task: Canvas - Red Bicycle Coffee
Status: IN PROGRESS → WAITING FOR
Findings: Suspect vehicle confirmed at Red Bicycle Coffee, 07:38am-08:29am on morning of shooting
Timeline: Victim at location 07:25am (from initial interview), suspect vehicle arrives 07:38am
Connection: Both at same location ~13 minutes apart

Video: Doorbell footage shows suspect (likely), detailed timestamps
Next: Identify man in video (facial recognition), identify second male who assisted

Supplement: Canvas Report with video stills (due 7/15)
```

**Amanda gets notification (real-time):**
"Det. Smith: CRITICAL - Suspect vehicle at Red Bicycle Coffee morning of shooting. Video shows suspect driver exiting vehicle 07:38am. See task for timestamps and stills."

**Amanda's reaction:**
Amanda immediately reviews video, notes suspect was at same location as victim. This proves knowledge/premeditation.

**Amanda updates Case Notes:**
"7/14 10:45am - MAJOR DEVELOPMENT: Red Bicycle Coffee footage shows suspect vehicle and driver at same location as victim 13 minutes before shooting. Suspect exited vehicle, entered building, timeline consistent with road rage escalation at that location."

**Amanda adds NEW TASK (emergency priority):**

- Task: **Facial Recognition - Video Stills from Red Bicycle**
- Assign to: Metro Police Detective with access to facial recognition database
- Deadline: Today (7/14) EOD
- Supplement: Identification results
- PRIORITY: CRITICAL

---

## PHASE 4: SUSPECT IDENTIFICATION & WARRANT PREP (Monday-Tuesday 7/14-7/15)

### Monday Evening (7/14 Evening)

**Facial Recognition comes back (Metro PD):**
Detectives at Red Bicycle are contacted. They recognize one of the employees who helped the man — that employee is currently under investigation for something else (check database).

Detectives ask: "Who came in your shop this morning, talked to you?"

Employee describes man: "Looked like..." and provides name of acquaintance who frequents area.

Cross-reference: Man's vehicle on video matches description.

**Database check:**
Man has prior arrest for aggravated assault (7/14 discovery during warrant process). Also has firearms restrictions.

**Amanda gets update:**
"Suspect preliminarily identified via doorbell video and witness. [Name]. Prior arrest for Agg Assault. Vehicle matches description. Preparing arrest & search warrants."

---

### TUESDAY (7/15) — WARRANT PREPARATION

**Evidence Tech & Detective Brown (Cell Phone Warrants):**

Task: **Cell Phone Data - Warrant Prep**
Status: IN PROGRESS

They prepare subpoena/warrant for:

- Victim's phone: Call records, text messages, location data (0600am-0930am 7/12)
- Suspect's phone (once ID confirmed): Call records, location data, photos, apps
- Suspect's vehicle (Nissan North America): GPS/Telematics data

Warrant documents drafted, reviewed by DA.

**DA Amanda McPherson (Note: same first name as lead detective, different person):**

- Reviews warrants for legal sufficiency
- Approves and prepares for judge signature
- Coordinates with judge to get warrant signed ASAP

**Tuesday 2:00pm - WARRANT SIGNED (MILESTONE)**

DA calls Lead Detective Amanda: "Sw signed. We have the search warrant."

**Lead Detective Amanda takes action (OLD SYSTEM):**

- Yells to bullpen: "We got the warrant!"
- Grabs marker, writes on whiteboard: "SW SIGNED"
- Texts group chat: "Sw signed. Arrest warrants signed"

**Lead Detective Amanda (NEW SYSTEM):**
Same action, BUT ALSO:

1. Updates Task in system: "Search Warrant Preparation" → **COMPLETE**
2. Creates NEW TASK: "Execute Search Warrant"
3. **Milestone Event Triggered:**
  ```
   Milestone: Search Warrant Signed
   Type: BROADCAST (Lead Detective configured this as team-wide)
   Message: "Search warrant signed by Judge [Name]. Execution prepared for 7/18. Outstanding investigative work team."
   Recipients: All detectives on case (15 people)
   Notification: Push alerts + in-app notification + group message
  ```

**War Room Display Updates:**

```
MILESTONES
═════════════════════════════════════════════
✓ 7/13 14:00 - Autopsy complete
✓ 7/14 10:45 - Suspect vehicle identified (Red Bicycle footage)
✓ 7/15 14:00 - SEARCH WARRANT SIGNED ⭐

NEXT MILESTONE:
⏳ 7/18 - Execute search warrant & arrest
```

---

## PHASE 5: PRE-EXECUTION & ARREST (Wednesday-Thursday 7/16-7/18)

### Wednesday (7/16) — FINAL PREPARATIONS

**Amanda's War Room Dashboard shows:**

```
TASKS REMAINING BEFORE ARREST:
□ Confirm suspect residence (for search warrant execution)
□ Prepare SWAT briefing (risk assessment ready)
□ Identify second male (accomplice?) at Red Bicycle
□ Continue cell phone tracing (real-time location data)
□ Trash pull for evidence (suspect residence)

SUPPLEMENTS DUE TODAY (7/16):
- Det. Smith: Canvas Report (Red Bicycle) - ⏳ NOT FILED YET
- Det. Brown: Video Analysis Report - ⏳ NOT FILED YET
- Evidence Tech: Scene Documentation - ⏳ NOT FILED YET

⚠️ ALERTS:
3 supplements overdue! Remind detectives to file by EOD.
```

**Amanda sends notification to overdue detectives:**
"Supplements due today. File your reports immediately. Case moving toward arrest/execution. Need documentation complete."

Detectives receive push notifications, file supplements:

- Det. Smith uploads Canvas Report PDF (interviews, video stills, timeline)
- Det. Brown uploads Video Analysis Report (stills, enhancement notes)
- Evidence Tech uploads documentation

**System updates:**

```
Supplements Filed: 3
Outstanding: 26 (but team is focused, momentum is high)
```

**Thursday (7/17) — PRE-EXECUTION BRIEFING**

Amanda hosts briefing in conference room. iPad or laptop for each detective.

SWAT Commander joins (risk assessment already reviewed).

Amanda presents:

- Case summary (timeline, video, victim, suspect)
- Suspect residence location & description
- Risk assessment (30-point score = SWAT assists)
- Search warrant items to seize
- Team assignments for execution day

Team sees on their devices:

- Timeline of events
- Video stills of suspect
- Risk assessment details
- Team roster & roles

---

## PHASE 6: EXECUTION & ARREST (Friday 7/18)

### 0500 hours — BRIEFING

Amanda does final briefing:

**Message to team (broadcast via system):**
"All hands, 0500 in conference room for final briefing. Execution plan review. Search warrant execution scheduled 0700. Dress appropriately."

### 0700 hours — EXECUTION

SWAT team executes search warrant at suspect residence.

**In the field (Detective assigned to search team):**

- Opens iPad
- Logs in real-time: "Residence secured," "Suspect detained," "Searching home office"
- Uploads photos as evidence collected
- Updates evidence tracker live

**War Room Display (back at CID):**
Real-time update: **"Residence secured 0715. Suspect in custody."**

Amanda watches in real-time as evidence is documented, photos uploaded, suspect arrested.

### POST-ARREST (Friday 7/18)

**Arrest warrant tasks now trigger:**

Amanda creates NEW TASK WAVE:

- Task: "Interview Suspect (Miranda warned)"
- Task: "Interview Accomplice/Passenger"
- Task: "Evidence Documentation - Search Warrant Items"
- Task: "Weapon Analysis - .223 Rifle (if recovered)"
- Task: "Compare ballistics: Fired casings vs. rifle" (linked to TBI)
- Task: "Lab submissions: DNA, fingerprints, ballistics"

**Risk Assessment form completed** (now that suspect arrested):

```
RISK ASSESSMENT - POST ARREST
Threat level: CONTAINMENT COMPLETE (suspect in custody)
Action: Prepare prosecution package
```

---

## PHASE 7: POST-ARREST INVESTIGATION (7/18-8/???)

### Interviews

**Det. Jones (Interview Assigned):**
Task: Interview Suspect (Miranda warned)

Opens iPad, conducts interview (or interviews are recorded, transcribed).

Logs interview:

```
Interview: Suspect
Date: 7/18 11:00am
Interviewer: Det. Jones
Duration: 2 hours
Summary: Suspect admits to being at Red Bicycle Coffee, denies involvement in shooting initially, 
then explains circumstances. Claims victim was aggressor.

Notes: Contradictions in timeline vs. TDOT video. Contradictions with witness statements.
```

Task: Interview Suspect → **COMPLETE**
Supplement Required: Interview Report (due 7/20)

---

## PHASE 8: CLOSURE & PROSECUTION PACKAGE (7/18-8/3/)

### Supplement Completion (Critical Path)

Amanda checks **Supplement Tracker Dashboard:**

```
SUPPLEMENTS STATUS - 7/20

Filed: 15
Outstanding: 15
Overdue: 2 (Alert!)

Outstanding Supplements Due This Week:
- Det. Jones: Suspect Interview Report (due 7/20) - ⏳ NOT FILED YET
- TBI: Ballistics Analysis (due 7/20) - ⏳ WAITING FOR (not our control)
- Lab: DNA Analysis Results (due 7/25) - ⏳ PENDING
```

**Amanda sends reminder:**
"Interview reports and documentation due by 7/20. Prosecutor needs these for charging decision."

---

### All Supplements Filed (by 7/25)

Once all supplements are filed, Amanda updates case:

**Task: Case Documentation Complete**
Status: IN PROGRESS

Final checklist:

- ✓ Autopsy complete
- ✓ Video analysis complete
- ✓ Cell phone data obtained
- ✓ Lab results (ballistics, DNA) received
- ✓ All interviews documented
- ✓ All evidence documented
- ✓ Timeline complete
- ✓ Risk assessment complete

Amanda compiles **Case Summary** (auto-generated from system):

```
CASE SUMMARY: I-24 Shooting (Homicide)
Case #: 250712-07867
Dates: 7/12/2025 - 7/25/2025
Lead Detective: Amanda McPherson
Co-Lead: [Name]

TIMELINE:
7/12 09:31 - Call received, Tier 3 declared
7/12 11:45 - Initial witness interview
7/13 14:00 - Autopsy (COD: Gunshot)
7/14 10:45 - Suspect vehicle identified (TDOT video)
7/15 14:00 - Search warrant signed
7/18 07:15 - Residence secured, suspect arrested
7/25 17:00 - All supplements filed

EVIDENCE COLLECTED:
- Shell casings (6) → TBI ballistics ✓
- Victim vehicle → Evidence Bay ✓
- .223 rifle (recovered) → TBI ballistics ✓
- Cell phone data (victim & suspect) → Analyzed ✓
- Red Bicycle doorbell footage → Reviewed ✓
- TDOT video → Enhanced & analyzed ✓
- Interview statements (15+) → Documented ✓
- DNA samples → Lab ✓
- Autopsy report → ME ✓

CHARGES:
- First-degree murder (premeditation evident from road rage)
- Reckless endangerment (multiple shots fired, other vehicles at risk)

INVESTIGATIVE QUALITY:
Timeline reconstruction complete, key evidence analyzed, 
All detective work documented, case ready for prosecution.
```

---

### Case Closure

Amanda changes case status: **ACTIVE** → **CLOSED (FOR INVESTIGATION)**

Task: "Case Documentation Complete" → **COMPLETE**

**Case now shows as:**

```
Case #: 250712-07867
Status: CLOSED (Suspect arrested, prosecution phase)
All supplements filed: YES
All evidence documented: YES
Case ready for DA: YES
```

System generates export for DA:

- All documents
- All evidence chain of custody
- All supplement reports
- Timeline
- Video evidence links
- Lab results

**DA receives notification:**
"Case 250712-07867 ready for prosecution package. All investigation documents compiled and linked."

---

## WHAT THE SYSTEM PREVENTED/ENABLED

### Pain Points ELIMINATED:

1. **"Who's doing what?"** → Task assignments crystal clear, real-time visibility
2. **"Did Jones file his supplement?"** → Dashboard shows filed/outstanding, alerts if late
3. **"Where's the TDOT video?"** → Evidence tracker shows status, who has it, when obtained
4. **"What's the timeline again?"** → Auto-generated from task completion + timeline entries
5. **"Which team members haven't been notified?"** → All notifications logged, timestamps recorded
6. **Shift handoffs** → Incoming shift sees everything: tasks, status, timeline, evidence, supplements
7. **Lost information** → Everything timestamped, auditable, persistent
8. **Whiteboard chaos** → War room display automatically synced, readable from anywhere

### Morale MOMENTS PRESERVED:

1. ✓ **"SW signed"** — Team-wide broadcast, celebrated milestone
2. ✓ **"Suspect identified"** — Real-time updates as video analysis completes
3. ✓ **"Arrest warrant signed"** — Another milestone moment
4. ✓ **"Execution complete, suspect in custody"** — Real-time notification to war room
5. ✓ **"Case closed, ready for prosecution"** — Team sees completion

### Prosecutor's Needs MET:

- Complete timeline
- All evidence documented with chain of custody
- All interviews supplemented
- All lab results linked
- No missing documentation
- Audit trail of investigation process

---

## KEY INSIGHTS FOR BUILD

### Critical Features (MVP):

1. **Task management** with status tracking
2. **Supplement tracking** tied to tasks (outstanding/overdue alerts)
3. **Evidence tracker** with chain of custody
4. **Timeline events** logged as work progresses
5. **Notifications** (task assignments, supplement reminders, milestone broadcasts)
6. **War room display** showing real-time task board
7. **iPad form entry** for quick task updates, evidence intake, supplement filing
8. **Milestone configuration** (lead detective decides what gets broadcast to team)

### What Makes It Work:

- **Real-time synchronization:** War room display updates as detectives file reports
- **Persistent record:** Nothing erased; everything timestamped and auditable
- **Supplement enforcement:** Due dates, overdue alerts, no way to forget
- **Role clarity:** Detective knows exactly what they're supposed to do and when
- **Human moments preserved:** Team celebrations of milestones, group notifications when appropriate

### Configuration Points (User Controls):

- Which tasks are in Tier 1/2/3 templates
- Which tasks require supplements
- Supplement due date offsets
- Milestone broadcast rules
- Notification recipients for each event type
- Risk assessment thresholds and decisions

---

## Next Phase: Cold Case or Continuation

If suspect had NOT been arrested, or investigation hit a wall:

**Case status options:**

1. **ACTIVE → PAUSED** (waiting for lab results, warrant, etc.)
2. **ACTIVE → COLD CASE** (all leads exhausted, no arrest)
3. **CLOSED (Arrest) → CLOSED (Conviction)**

**Cold case system would show:**

- Last activity date
- Open questions (unsolved leads)
- Evidence available for future investigation
- Searchable for pattern matches (if suspect found in different case)
- Accessible for review years later with full audit trail

---

**This walkthrough proves the system works because:**

- Every step is tracked
- Nothing falls through cracks
- Lead detective has visibility at all times
- Supplements are enforced, not hoped for
- Evidence is organized, not scattered
- Timeline is auto-generated, not manually compiled
- Prosecutor gets complete package
- Audit trail is permanent

