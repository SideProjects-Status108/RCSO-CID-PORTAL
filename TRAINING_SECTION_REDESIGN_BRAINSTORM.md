# Training Section Redesign — Brainstorm & Framework

**Project:** RCSO CID Portal — Complete Training Module Renovation  
**Status:** Planning Phase (NO BUILD YET)  
**Date:** April 17, 2025

---

## Part 1: Inspiration Sources

### Existing Platforms We Can Learn From

#### 1. **LinkedIn Learning / Coursera**

- **Why useful:** Onboarding + progress tracking
- **What to steal:**
  - Progress percentage bars (Week 3 of 10)
  - "Next steps" nudges
  - Certificate of completion design
  - Learning path visualization (timeline)

#### 2. **Asana / Monday.com / Notion**

- **Why useful:** Training as project management
- **What to steal:**
  - Kanban-style phase tracking (Phase 1 → Phase 2 → Phase 3)
  - Timeline views (Gantt-style for 10-week schedule)
  - Checklist templates with sign-offs
  - Dependency views (must complete X before Y)

#### 3. **Onboarding-Specific: Welcome / BambooHR**

- **Why useful:** New hire onboarding workflows
- **What to steal:**
  - Pre-arrival communication via email forms
  - Learning style assessment surveys (visual, auditory, kinesthetic)
  - Guided onboarding checklists with timeline
  - Manager review dashboards

#### 4. **Medical Training: SimX / ECFMG**

- **Why useful:** High-stakes professional training (similar to detective training)
- **What to steal:**
  - Competency-based progression (not time-based)
  - Observed procedures checklist (signed off by supervisor)
  - Case exposure logging with context
  - Phase gates with evaluations before advancement

#### 5. **Police Training: NYPD / LA Sheriff training portals**

- **Why useful:** Law enforcement context
- **What to steal:**
  - Duty roster integration with training schedule
  - Badge/certification milestones
  - Field observation logs
  - Chain of command documentation

---

## Part 2: Current Pain Points vs. New System

### Current (Physical Binder + Spreadsheets)

```
❌ Weekly eval form + Activity checklist are separate
❌ No real-time progress tracking
❌ No automated reminders/notifications
❌ Sign-offs are scattered across documents
❌ Learning style never documented
❌ Schedule conflicts not visible
❌ Documents buried in folders
❌ No onboarding survey feedback
❌ Hard to see which activities are done vs. pending
❌ No integration between eval scores and activity completion
```

### New System (Goals)

```
✅ Weekly eval + Activity checklist combined view
✅ Live progress dashboard (Week X of 10, competencies, activities)
✅ Automated reminders for pending activities
✅ All sign-offs in one place with timestamps
✅ Learning style captured at onboarding
✅ Schedule visible to FTO, DIT, Coordinator
✅ Documents accessible from training hub
✅ Onboarding survey informs FTO approach
✅ Activity completion tied to eval scores
✅ Eval trends visualized (week-to-week improvement)
```

---

## Part 3: New Training Dashboard Framework

### Dashboard Layout: Hero Section (Top)

```
┌─────────────────────────────────────────────────────────────┐
│  TRAINING HUB                                               │
│                                                             │
│  Welcome, Amanda McPherson (FTO Coordinator)                │
│                                                             │
│  ACTIVE TRAINEES: 2  |  UPCOMING ONBOARDING: 1              │
│                                                             │
│  [🔔 Unreviewed Surveys: 1]  [⚠️ Phase Transitions: 0]      │
└─────────────────────────────────────────────────────────────┘
```

---

### Dashboard Layout: Main Tiles (Medium-sized cards)

```
┌──────────────────────────────────────────────────────────────┐
│  ONBOARDING                                                  │
│  ─────────────────────────────────────────────────────────  │
│  Create new detective trainee profile                       │
│  • Name, Email, Badge, Phone                                │
│  • Learning style assessment survey (sent via email)        │
│  • Onboarding meeting checklist                             │
│  • First day orientation                                    │
│                                                              │
│  [+ CREATE NEW TRAINEE]                                     │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  ACTIVE DIT FILES                                            │
│  ─────────────────────────────────────────────────────────  │
│  Michael Anderson (Week 5 of 10)                            │
│  Phase 2 - Senior Investigator (Smith, John)                │
│  Progress: ███████░░ 70%                                    │
│  [View File]                                                │
│                                                              │
│  Jessica Thompson (Week 2 of 10)                            │
│  Phase 1 - Senior Investigator (Jones, Sarah)               │
│  Progress: ██░░░░░░░ 20%                                    │
│  [View File]                                                │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  DOCUMENTS & MANUALS                                         │
│  ─────────────────────────────────────────────────────────  │
│  📖 Training Manual                                          │
│  📋 Case Notes Guide                                        │
│  📝 Report Templates                                        │
│  ⚖️  Legal References                                        │
│  🗂️  Investigation Procedures                               │
│                                                              │
│  [Browse All Documents]                                     │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  TRAINING SCHEDULE                                           │
│  ─────────────────────────────────────────────────────────  │
│  10-Week Rotation Calendar                                  │
│  • Phase assignments by week                                │
│  • FTO pairings & work hours                                │
│  • Special assignments (Crime Scene, Fraud, etc.)          │
│  • Final evaluation dates                                   │
│                                                              │
│  [View Full Schedule]                                       │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  RESOURCES & LINKS                                           │
│  ─────────────────────────────────────────────────────────  │
│  [RCSO Logo] → RCSO Website                                 │
│  [TBI Logo] → TBI Resources                                 │
│  [FBI Logo] → FBI Resources                                 │
│  [County Logo] → County Portal                              │
│  [TIBRS Logo] → TIBRS System                                │
│                                                              │
│  [+ Add Resource]                                           │
└──────────────────────────────────────────────────────────────┘
```

---

## Part 4: DIT File Structure (Inside Each Active Trainee)

When you click "View File" on an active DIT:

```
┌──────────────────────────────────────────────────────────────┐
│ Michael Anderson — Week 5 of 10 Training Program             │
│ FTO: John Smith (Phase 2)  |  Start: April 1, 2025          │
└──────────────────────────────────────────────────────────────┘

TABS:
┌─────────────────┬──────────────────┬────────────────┬──────────┐
│ WEEKLY EVAL     │ ACTIVITY SHEET   │ CASE TRACKING  │ CALL-OUT │
│ (This Week)     │ (All Completed)  │ (Assignments)  │ LOGS     │
└─────────────────┴──────────────────┴────────────────┴──────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[WEEKLY EVAL TAB — COMBINED VIEW]

┌─ PROGRESS OVERVIEW ────────────────────────────┐
│ Week 5 of 10 (50%)                             │
│ Current Phase: Phase 2 (Senior Investigator)   │
│ FTO: John Smith                                │
│ Status: In Progress                            │
│                                                │
│ COMPETENCY SCORES THIS WEEK:                   │
│ ✓ General Appearance: 4 (Prior: 4) →          │
│ ✓ Interview Skills: 3 (Prior: 2) ↗            │
│ ✓ Report Writing: 4 (Prior: 3) ↗              │
│ ? Crime Scene Mgmt: Not observed               │
│                                                │
│ [View Full Weekly Evaluation]                  │
└────────────────────────────────────────────────┘

┌─ ACTIVITY COMPLETION THIS WEEK ────────────────┐
│ Required Activities (2 exposures each):        │
│                                                │
│ Death Investigation:      ✓✓ COMPLETE         │
│   Exposure 1: 4/10, Smith, Case #2024-0847   │
│   Exposure 2: 4/12, Jones, Case #2024-0891   │
│                                                │
│ Search Warrant:          ✓✓ COMPLETE          │
│   Exposure 1: 4/8, Smith, Case #2024-0834    │
│   Exposure 2: 4/15, Smith, Case #2024-0915   │
│                                                │
│ Interview:               ✓░ IN PROGRESS (1/2) │
│   Exposure 1: 4/14, Jones, Case #2024-0901   │
│   Exposure 2: [Pending - Add activity]        │
│                                                │
│ Crime Scene Management:  ░░ NOT STARTED       │
│   Exposure 1: [Pending]                       │
│   Exposure 2: [Pending]                       │
│   ⚠️ Not observed this week                    │
│                                                │
│ [+ LOG NEW ACTIVITY] [View All Activities]    │
└────────────────────────────────────────────────┘

┌─ WEEKLY EVALUATION FORM ───────────────────────┐
│ [Form auto-populated with unobserved list]    │
│ [20 competencies grouped by category]         │
│ [Scores 1-5, explanations required for 1/2/5] │
│ [Prior week scores shown for comparison]      │
│                                                │
│ [SAVE DRAFT]  [SUBMIT EVAL]                   │
│               [GENERATE DEFICIENCY FORM]      │
└────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ACTIVITY SHEET TAB — FULL 10-WEEK CHECKLIST]

Categories (with expansion):
┌─ SCENE MANAGEMENT (Required: 2 exposures each) ┐
│ ✓ Death Investigation         ✓✓ COMPLETE     │
│ ✓ Scene Sketch                ✓✓ COMPLETE     │
│ ✓ Scene Photos                ✓░ IN PROGRESS  │
│ ░ Crime Scene Management      ░░ PENDING      │
│                                               │
│ [Click to see all exposures with dates/FTOs] │
└───────────────────────────────────────────────┘

┌─ VICTIM/WITNESS (Required: varies)            ┐
│ ✓ Interview                   ✓░ IN PROGRESS  │
│ ✓ Sexual Assault              ░░ PENDING      │
│ ✓ Domestic Violence           ✓✓ COMPLETE    │
└───────────────────────────────────────────────┘

[etc. for all activity categories]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[CASE TRACKING TAB]

Cases assigned to this DIT:
- Case #2024-0847 (Death Investigation)
- Case #2024-0891 (Property Crime)
- Case #2024-0834 (Search Warrant)
[etc.]

[View full case file + status]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[CALL-OUT LOGS TAB]

After-hours callouts logged by DIT/FTO:
- 4/10/25 10:30 PM - Traffic Homicide (Smith)
- 4/12/25 11:15 PM - Robbery Follow-up (Jones)
[etc.]
```

---

## Part 5: Training Schedule Module

### Visual Design (Two Views)

**View 1: Calendar Grid**

```
┌─ 10-WEEK TRAINING SCHEDULE ─────────────────────┐
│ Michael Anderson — Starts April 1, 2025         │
│                                                 │
│        WEEK    PHASE                FTO         │
│        ────    ──────────────────   ───────────│
│ Apr 1-4  (1)   Phase 1 (General)    Smith, J.  │
│ Apr 7-11 (2)   Phase 1 (General)    Smith, J.  │
│ Apr 14-18 (3)  Phase 2 (General)    Jones, S.  │
│ Apr 21-25 (4)  Phase 2 (General)    Jones, S.  │
│ Apr 28-2 (5)   Crime Scene          Brown, M.  │
│ May 5-9  (6)   Fraud/Cyber          Garcia, A. │
│ May 12-16 (7)  Narcotics            White, D.  │
│ May 19-23 (8)  General              Davis, R.  │
│ May 26-30 (9)  General              Davis, R.  │
│ Jun 2-6  (10)  Final Evaluation     All        │
│                                                 │
└─────────────────────────────────────────────────┘
```

**View 2: Gantt-Style Timeline**

```
DIT: Michael Anderson

Week 1 ██ Phase 1 (Smith) — Mon-Thu, 6am-4pm
Week 2 ██ Phase 1 (Smith)
Week 3 ██ Phase 2 (Jones) — Tue-Fri, 7am-5pm
Week 4 ██ Phase 2 (Jones)
Week 5 ██ Crime Scene (Brown)
Week 6 ██ Fraud/Cyber (Garcia)
Week 7 ██ Narcotics (White)
Week 8 ██ General (Davis)
Week 9 ██ General (Davis)
Week 10 ██ Final Eval

Legend:
██ = Week assigned
?? = Schedule conflict detected
```

**View 3: FTO Assignment Matrix** (for Coordinator view)

```
FTO Schedule for Next 10 Weeks

Smith, John:
├─ Michael Anderson (Weeks 1-2)
├─ Jessica Thompson (Weeks 3-4)
└─ [Available Weeks 5-10]

Jones, Sarah:
├─ Michael Anderson (Weeks 3-4)
├─ [Available Weeks 1-2, 5-10]
└─ Christopher Martin (Weeks 9-10)

[etc.]
```

---

## Part 6: Data Structure & Relationships

```
auth.users / profiles
    ├─ DIT (role: 'dit')
    ├─ FTO (role: 'fto')
    ├─ FTO Coordinator (role: 'fto_coordinator')
    └─ Supervision+

dit_records
├─ id, user_id, current_phase, start_date, graduation_date, status
└─ Linked to: fto_pairings, onboarding_surveys, training_schedules

onboarding_surveys (NEW)
├─ id, dit_id, survey_link, learning_style, completion_date
├─ Questions: Visual/Auditory/Kinesthetic preference
├─ Questions: Prior law enforcement experience
├─ Questions: Concerns/questions about training
└─ Linked to: dit_records, coordinator_notes

training_schedules (NEW)
├─ id, dit_id, week_number, phase, fto_id, start_date, end_date
├─ fto_schedule (days/hours worked that week)
├─ special_assignment (Crime Scene, Fraud, etc.)
└─ Linked to: fto_pairings

fto_pairings
├─ id, fto_id, dit_id, phase, start_date, end_date
└─ [EXISTING - reuse for phase transitions]

weekly_training_sessions
├─ [EXISTING - used for weekly evals]
└─ NOW LINKS TO: activity exposures, competency scores

training_activity_exposures
├─ [EXISTING - tracks activity completions]
└─ NOW SHOWS: Which week, which case, which FTO

weekly_competency_scores
├─ [EXISTING - the 20 competencies]
└─ NOW LINKED TO: activity exposures (what activities informed the score)

training_documents (NEW)
├─ id, category, title, file_url, last_updated
├─ Categories: Manual, Reports, Procedures, Legal, Forms
└─ Displayable as tiles with quick links

training_resources (NEW)
├─ id, name, logo_url, external_link, category
├─ Categories: Government, Law Enforcement, County, Tech
└─ Displayed as branded buttons

onboarding_checklist (NEW)
├─ id, dit_id, checklist_item, completed_date, completed_by
├─ Items: Welcome packet, Equipment issued, First day orientation, etc.
└─ Tracked by FTO Coordinator
```

---

## Part 7: Key UX Patterns & Interactions

### Pattern 1: Weekly Eval + Activity Combined

- **FTO starts evaluation**
- **System auto-loads:** Logged activities + prior week scores + unobserved competencies
- **FTO rates 20 competencies** (only those observed)
- **For each 1/2/5 score:** Explanation auto-attached to related activity
- **At bottom:** List of "Not Observed" competencies → Auto-message to DIT
- **[GENERATE DEFICIENCY FORM]** button (separate, optional)

### Pattern 2: Activity Logging with Context

- **FTO logs activity on the fly** or **at end of day**
- **Form:** Activity type → Date → FTO assigned → Case # → Role → Duration → Notes
- **System auto-links to:** Next pending activity in activity checklist
- **Shows progress:** "Death Investigation: 1 of 2 exposures complete"

### Pattern 3: Learning Style → Personalized Approach

- **Pre-arrival:** Onboarding survey (email link)
- **DIT answers:** Visual/Auditory/Kinesthetic preference
- **FTO Coordinator reviews:** "This DIT learns visually" → Brief them
- **Notes on file:** "Pair with FTO who uses diagrams and visual case breakdowns"

### Pattern 4: Schedule Conflict Detection

- **FTO's hours** vs. **DIT's assignment week**
- **Auto-warn:** "Smith is on vacation June 1-7 but assigned as FTO Week 8"
- **Coordinator resolve:** Reassign or adjust schedule

### Pattern 5: Phase Gate (Coordinator Workflow)

- **Week 2 ends → Evaluation marked "submitted"**
- **Coordinator reviews:** Competency scores, activity completion, progress
- **Decision:** "Ready for Phase 2" → Auto-transitions in schedule
- **Or:** "Extend Phase 1" → Extends weeks, flags for follow-up

---

## Part 8: Onboarding Flow (Complete)

### Step 1: Create New DIT Profile

```
Form:
- Name, Email, Badge #, Phone
- Start Date
- Preferred FTO (optional - coordinator can assign later)

Button: [CREATE DIT PROFILE]
Result: Account created, onboarding survey email sent automatically
```

### Step 2: DIT Receives Survey Email

```
Subject: "Welcome to RCSO CID! - Complete Your Onboarding Survey"
Body: 
  Hi [Name],
  
  Welcome to the Rutherford County Sheriff's Office Criminal Investigations 
  Division! Before your first day, we'd like to learn about you.
  
  [CLICK HERE TO COMPLETE SURVEY]
  Survey expires in 7 days.
```

### Step 3: DIT Completes Survey

```
Questions:
1. Learning Style: Visual / Auditory / Kinesthetic
2. Prior Law Enforcement Experience: Yes / No / Details
3. Concerns about training: Free-form text
4. Any medical/accessibility needs: Free-form text
5. Questions for your FTO: Free-form text

Button: [SUBMIT SURVEY]
Result: Goes to FTO Coordinator dashboard for review
```

### Step 4: Coordinator Reviews & Plans

```
Coordinator Dashboard:
- Shows unreviewed surveys: [1 New]
- Opens survey, sees: [DIT is kinesthetic learner, has prior patrol experience]
- Notes: "Assign FTO who does hands-on demonstrations"
- Assigns FTO from dropdown
- Schedules onboarding meeting (auto-calendar invite)
- Creates checklist for onboarding day

Checklist items:
☐ Welcome packet & binder issued
☐ Equipment issued (badge, cuffs, etc.)
☐ Introduce to chain of command
☐ Review schedule & call-out procedures
☐ Tour facility
☐ Review 10-week training plan
☐ Discuss learning style & approach
☐ Set expectations (dress code, punctuality, etc.)
☐ Give first case assignment

Button: [MARK CHECKLIST COMPLETE]
```

### Step 5: DIT Sees Their Training Plan

```
On first login, DIT sees:

┌─ YOUR 10-WEEK TRAINING PROGRAM ─────┐
│ Start Date: [Date]                  │
│ Expected Graduation: [Date]         │
│                                     │
│ Your Learning Style: KINESTHETIC    │
│ (Your FTO has been briefed on this) │
│                                     │
│ Week 1-2: Phase 1 (John Smith)      │
│ Week 3-4: Phase 2 (Sarah Jones)     │
│ [... rest of 10-week plan]          │
│                                     │
│ [Download Your Training Manual PDF] │
└─────────────────────────────────────┘
```

---

## Part 9: Documents & Resources Tiles

### Documents Section

```
Each document is a tile/card with:
- Icon (📖 for manual, 📋 for checklist, etc.)
- Title
- Brief description
- [OPEN] or [DOWNLOAD] button

Examples:
┌─ CID TRAINING MANUAL ─────────────────┐
│ 📖                                    │
│ Complete 10-week training guide       │
│ with topics to be covered             │
│ [OPEN AS PDF]  [DOWNLOAD]             │
└───────────────────────────────────────┘

┌─ CASE NOTES TEMPLATE ─────────────────┐
│ 📝                                    │
│ Format for case notes & supplements   │
│ [DOWNLOAD WORD DOC]                   │
└───────────────────────────────────────┘

┌─ INVESTIGATION PROCEDURES ────────────┐
│ ⚙️                                     │
│ Standard procedures for different     │
│ case types (homicide, fraud, etc.)    │
│ [OPEN AS PDF]                         │
└───────────────────────────────────────┘
```

### Resources Section

```
Branded buttons linking to external sites:

[🏛️ RCSO Website]  [🔍 TBI Resources]  [🕵️ FBI Portal]

[📋 TIBRS System]  [⚖️ TN Legal Code]  [🏢 County Portal]

[+ ADD RESOURCE] (Admin only)
```

---

## Part 10: Next Steps (When We Build)

### Phase A: Onboarding System

- New DIT profile creation
- Onboarding survey form + email
- Coordinator review dashboard
- Onboarding checklist

### Phase B: Weekly Eval + Activity (Combined)

- Refine existing weekly-eval-form.tsx
- Merge activity logging into same interface
- Link activities to competency explanations
- Auto-generate unobserved list

### Phase C: Training Schedule Module

- Create training_schedules table
- Build calendar/Gantt views
- Phase transition automation
- Conflict detection

### Phase D: DIT Files

- Organize tabs (Weekly Eval, Activity, Cases, Call-outs)
- Dashboard for FTO Coordinator
- Progress tracking by phase

### Phase E: Documents & Resources

- Create documents/resources tables
- Build tile-based UI
- Admin panel for adding resources

---

## Design Inspiration Summary


| Platform          | Steal This                   | Implementation                      |
| ----------------- | ---------------------------- | ----------------------------------- |
| LinkedIn Learning | Progress bars + timeline     | Week 5 of 10, phase visualization   |
| Asana             | Kanban phases + checklists   | Phase 1 → 2 → 3, activity checklist |
| BambooHR          | Onboarding surveys           | Learning style assessment           |
| SimX / Medical    | Competency-based progression | Eval-driven phase gates             |
| NYPD Training     | Duty roster integration      | Schedule + FTO pairings view        |


---

**Next: Get your feedback on this framework, then we'll build the Cursor prompts for each phase.**