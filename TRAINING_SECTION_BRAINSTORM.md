# Training Section Renovation: Brainstorm & UX Architecture

**RCSO CID Portal - DIT Training Program Digitization**

**Date:** April 17, 2026  
**Status:** Brainstorm Phase (NO BUILD YET)  
**Audience:** Cursor Build Prompts Coming Next

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Industry Research & Inspiration](#industry-research--inspiration)
3. [Existing Foundation](#existing-foundation)
4. [Current State Analysis](#current-state-analysis)
5. [Proposed Training Dashboard Architecture](#proposed-training-dashboard-architecture)
6. [Component Designs](#component-designs)
7. [UX Design Principles Applied](#ux-design-principles-applied)
8. [Data Flow Diagrams](#data-flow-diagrams)
9. [Next Steps: Cursor Prompts](#next-steps-cursor-prompts)

---

## Executive Summary

You're digitizing a **10-week Field Training Officer (FTO) program** currently managed with physical binders and paper forms. The new system needs to:

- **Reduce friction** for DITs (Detectives in Training), FTOs, and FTO Coordinators
- **Surface progress & gaps** at a glance (dashboard, not buried in PDFs)
- **Automate notifications** (unobserved competencies, coaching escalations)
- **Maintain compliance** (audit trails, signed evaluations, progression records)

**Key Insight:** Unlike generic HR onboarding platforms, this is a **specialized law enforcement training program** with structured phases, competency mastery requirements, and investigative skill prerequisites. This means we can't just adopt a commercial platform—we need to custom-build something that reflects your 10-week phased curriculum.

---

## Industry Research & Inspiration

### A. Law Enforcement Training Platforms

We searched for FTO-specific solutions and found several industry players:

#### Vector Solutions' Evaluations+

- **What it does:** Customizable FTO evaluation forms, daily observation reports (DORs), digital sign-off
- **Strengths:** Conforms to SJPD FTO model (national standard), automates documentation, reduces paper
- **Lessons:** Success = digitizing the evaluation form first, then layering on insights

#### FTO Academy & FTO Solutions

- **What it does:** Training resource libraries, case studies, deficiency tracking
- **Strengths:** FTO coordinator dashboards showing all active trainees at a glance, escalation workflows
- **Lessons:** FTOs need quick status summaries ("who needs coaching?"), not drowning in details

#### Blue Peak Logic, Frontline PSS, Revolution911

- **Common patterns:** Dashboard-first approach, weekly eval tracking, searchable records, reporting
- **Lessons:** Law enforcement values **dark theme** (command center aesthetic), **real-time status** (color-coded), **quick actions** (minimal clicks to find info)

**Key Takeaway:** Don't try to be a general LMS. Be specific to your 10-week phased curriculum, competency-based progression, and FTO pairing model. Specialize to win.

---

### B. Employee Onboarding Platforms (General)

We reviewed platforms like Enboarder, Eloomi, iSpring LMS, and others:

#### What Works

- **Guided onboarding journeys** (step-by-step, trackable)
- **Learning paths** (week 1 focus on X, week 2 focus on Y)
- **Progress indicators** (% complete, next steps)
- **Email notifications** (triggered by events: first day, week 4 check-in, graduation)
- **Manager (FTO) dashboards** (all my trainees, all their status)

#### What Doesn't Work (For You)

- Generic "day 1" onboarding (yours is 10 weeks, highly specific)
- Content libraries focused on HR/culture (yours is investigation skills)
- Standalone portal (yours needs to integrate with Command Board for case context)

**Key Takeaway:** Steal the **dashboard patterns**, **notification architecture**, and **progress-tracking UI** from commercial platforms, but adapt them to your law enforcement context.

---

### C. Dashboard Design Patterns

Industry research on modern dashboard design recommends:

#### Card-Based Layout

- **Why:** Independent, rearrangeable, clear single purpose per card
- **Rule:** Max 5-6 cards in initial view (cognitive load)
- **Structure:** Image/icon + title + metric + CTA (call-to-action)

#### Cognitive Load Management

- **Grouping:** Related metrics together (e.g., "Active DITs" section groups all trainee cards)
- **Progressive disclosure:** Expand/collapse for details, tabs for switching views
- **Visual hierarchy:** Most important info reads first (size, color, position)

#### Grid System

- **Standard:** 8pt or 12-column grid
- **Consistency:** Same margins, button sizes, typography across dashboard
- **Responsive:** Desktop (full grid), tablet (2-3 columns), mobile (stacked)

**Key Takeaway:** Your Training Dashboard should use **cards** to show overview, not buried in tabs. DITs and FTOs see status at a glance.

---

### D. Scorecard & Evaluation Design

Research on weekly evaluation systems shows:

#### Cadence

- **Weekly is ideal** — Monthly is too slow (problems fester), daily is too noisy
- **Same time, same day** — Consistency helps spot trends
- **Quick entry** — 5-10 min for competency scoring, optional detailed explanations

#### Structure

- **1-5 scale with clear anchors** (1=needs work, 3=meets expectations, 5=exceeds)
- **Mandatory explanations for extremes** (1/2/5 require justification)
- **Prior week comparison** (trend arrow showing progress/regress)
- **Context field** (case examples, specific incidents referenced)

#### Visualization

- **Scorecard trend graph** — Line chart showing week-over-week progression (visual pattern recognition)
- **Color-coded alerts** — Red (concerns), yellow (caution), green (on track)
- **Competency grouping** — Organize by category (Professionalism, Investigative Core, etc.)

**Key Takeaway:** Your weekly eval form should be **fast to fill**, **visually clear on progress**, and **automatically flag coaching needs** (don't make coordinators hunt for 1s and 2s).

---

## Existing Foundation

### What You've Already Built

You have a **complete DIT Weekly Training System specification** (DIT_WEEKLY_TRAINING_SYSTEM_SPEC.md) that covers:

- ✅ **Data models** (activity exposures, weekly sessions, competency scores, deficiency forms, escalations)
- ✅ **User roles** (DIT, FTO, FTO Coordinator, FTO Sergeant)
- ✅ **Feature flows** (activity logging, weekly eval, deficiency escalation, coaching)
- ✅ **RLS policies** (row-level access control)
- ✅ **API endpoints** (for all the above)
- ✅ **UI specifications** (card layouts, form designs, summary views)

### What You've Partially Built

- Type definitions (src/types/training.ts)
- API routes (src/app/api/training/*)
- Email/calendar integration sketches

### What's Missing: The Training Dashboard Shell

You have **building blocks** but not yet the **main dashboard** that ties it all together.

---

## Current State Analysis

### Physical Binder System (Today)

**Structure:**

1. CID Training Manual (thick binder with all policies, forms, procedures)
2. Activity Checklist (paper form showing required exposures per week)
3. Weekly Evaluation Critique (paper form with 20 competencies, 1-5 scale, narrative)
4. Training Schedule (printed grid showing FTO pairings week-by-week)
5. Case Assignment List (tracked manually)
6. Call-Out Logs (tracked manually)
7. Resources (printed company logos/links)

**Pain Points:**

- No real-time visibility (coordinator doesn't know status until form is signed)
- Paper shuffling (forms get lost, revisions hard to track)
- No trend analysis (hard to spot "Michael struggles with X across weeks 2-4")
- Duplicate entry (N.O./S.M.R. flags repeated on multiple forms)
- No escalation automation (coordinator has to manually find problem DITs)
- No email reminders (DITs don't know they should have been exposed to Y by week 3)

### Your Solution (Spec)

You've designed:

- ✅ Real-time activity logging (FTO logs exposure as it happens)
- ✅ Weekly eval form (digital, mandatory explanations for extremes)
- ✅ Auto-alert for unobserved competencies (email to DIT listing gaps)
- ✅ Optional deficiency form (FTO decides if coaching needed)
- ✅ Escalation workflow (coordinator → sergeant → lieutenant if needed)
- ✅ Audit trail (all actions timestamped, versioned)

### Missing Piece: The Dashboard Interface

Your spec defines **data flows and APIs** but the **Training Dashboard** (the "front door" users see) hasn't been fully designed yet. This is what you're asking me to brainstorm.

---

## Proposed Training Dashboard Architecture

### Overview Layout

The Training Dashboard serves different users with different needs:

```
┌─────────────────────────────────────────────────────────────────┐
│ NAVIGATION BAR (Top)                                            │
│ Logo | Dashboard | DIT Files | Schedule | Resources | Settings  │
├─────────────────────────────────────────────────────────────────┤
│                      TRAINING DASHBOARD                         │
│                                                                 │
│ Welcome, [FTO Name]                                             │
│ Active Week: Week 5 of 10 (Mar 17-23, 2025)                    │
│                                                                 │
│ ┌─────────────────────┐  ┌──────────────────────┐              │
│ │ ONBOARDING          │  │ ACTIVE DIT FILES     │              │
│ │ (Collapsible)       │  │ (Grid of trainees)   │              │
│ │                     │  │                      │              │
│ │ • New DIT Profile   │  │ ┌──────────────────┐ │              │
│ │ • Survey Link       │  │ │ Anderson, M.     │ │              │
│ │ • First Day Brief   │  │ │ Week 5 of 10     │ │              │
│ │                     │  │ │ FTO: Smith, J.   │ │              │
│ │ [+ New DIT]         │  │ │ Status: On Track │ │              │
│ │                     │  │ │ [OPEN] [EVAL]    │ │              │
│ │                     │  │ │ [NOTES] [CASES]  │ │              │
│ │                     │  │ └──────────────────┘ │              │
│ │                     │  │                      │              │
│ │                     │  │ ┌──────────────────┐ │              │
│ │                     │  │ │ Brown, J.        │ │              │
│ │                     │  │ │ Week 2 of 10     │ │              │
│ │                     │  │ │ FTO: Jones, M.   │ │              │
│ │                     │  │ │ Status: At Risk* │ │              │
│ │                     │  │ │ [OPEN] [EVAL]    │ │              │
│ │                     │  │ └──────────────────┘ │              │
│ │                     │  │                      │              │
│ └─────────────────────┘  └──────────────────────┘              │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ DOCUMENTS (Quick Links)                                    │ │
│ │ [Training Manual] [Policies] [Forms] [Case Law]           │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ SCHEDULE                                                   │ │
│ │ Next FTO Pairing Change: Friday 3/21 (Anderson moves to   │ │
│ │ Jones from Smith)                                          │ │
│ │                                                            │ │
│ │ [View Full 10-Week Schedule]                              │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ RESOURCES (External Links)                                │ │
│ │ [FBI] [TBI] [DA Office] [Training Academy] [Case Law DB] │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Component 1: Onboarding Section

**Purpose:** New DITs start here. Guided, step-by-step entry into the system.

**Cards/Sections:**

#### A. Create New Profile

```
┌────────────────────────────────────────┐
│ + NEW DETECTIVE IN TRAINING            │
│ ────────────────────────────────────── │
│ Click to create profile for new DIT    │
│ Entering: Name, Email, Cell, Badge #   │
│ Takes ~2 minutes                       │
│ [START PROFILE]                        │
└────────────────────────────────────────┘
```

- **Action:** Opens modal with form (Name, Email, Cell, Badge #)
- **Validation:** All required, email must be valid
- **Next:** Automatically generates survey link, sends email

#### B. Onboarding Survey (Email Sent)

```
┌────────────────────────────────────────┐
│ 📧 SURVEY LINK SENT                    │
│ ────────────────────────────────────── │
│ New DIT will receive email with link   │
│ Survey confirms first day attendance   │
│ & captures learning style preference   │
│ Status: [ ] Awaiting Response          │
│ Expires: 7 days                        │
│ [RESEND SURVEY] [TRACK RESPONSES]      │
└────────────────────────────────────────┘
```

- **Survey content:** First-day confirmation, learning style Q&A
- **Response tracking:** Shows # responded, # pending
- **Auto-action:** Once 80%+ respond, coordinator prepares onboarding brief

#### C. Onboarding Meeting Preparation

```
┌────────────────────────────────────────┐
│ 📋 ONBOARDING MEETING BRIEF            │
│ ────────────────────────────────────── │
│ Use this checklist to cover:           │
│ • 10-week program overview             │
│ • Probationary phase expectations      │
│ • Dress code, schedules, call-out      │
│ • Division areas, case management      │
│ • Chain of command                     │
│ • Equipment list                       │
│ • Office decorum                       │
│ [SCHEDULE MEETING] [PRINT BRIEF]       │
│ [EMAIL TO COORDINATORS]                │
└────────────────────────────────────────┘
```

- **Linked content:** Pulls from Documents section
- **Collaborative:** Multiple coordinators can add notes
- **Exportable:** Print or email to team

---

### Component 2: Active DIT Files (Tile Grid)

**Purpose:** Quick overview of all active trainees. Click to drill into details.

**Layout:** Responsive grid (1 column on mobile, 2-3 on tablet, 3-4 on desktop)

```
┌──────────────────────────────────┐
│ ANDERSON, MICHAEL                │
│ Week 5 of 10 (35%)               │
│ ────────────────────────────────│
│ FTO: Smith, John (Weeks 4-6)    │
│ Start: Mar 3  |  Expected End: May 11 │
│                                  │
│ STATUS INDICATOR                 │
│ 🟢 On Track (18/20 competencies) │
│                                  │
│ QUICK STATS                      │
│ Activities: 12 logged            │
│ Avg Score: 3.4/5                │
│ Red Flags: 0 this week          │
│ Coaching: None active           │
│                                  │
│ [OPEN DIT FILE] [EVAL] [NOTES]  │
│ [CASES] [SCHEDULE] [MORE ...]   │
└──────────────────────────────────┘
```

**Card Variants:**

- **On Track** (🟢) — All competencies observed, avg score 3+, no coaching needed
- **At Risk** (🟡) — Scores trending down, unobserved competencies, or coaching active
- **Needs Attention** (🔴) — Multiple 1s/2s, escalation pending, or behind schedule
- **On Leave** (⚪) — DIT not currently active (sick, vacation, transferred)

**Interactions:**

- Click card → Opens detailed DIT File view (see Component 3)
- Hover on FTO name → Shows FTO's schedule, contact
- Hover on status → Shows detail ("1 unobserved: Interview Skills")

---

### Component 3: DIT File (Detailed View)

**Purpose:** Deep dive into one DIT's entire training record. Multiple tabs.

```
┌──────────────────────────────────────────────────────────────────┐
│ ANDERSON, MICHAEL | Week 5 of 10 (35%)                           │
│ Badge: CID-47 | FTO: Smith, John | Start: 3/3 | End: 5/11       │
│ ──────────────────────────────────────────────────────────────── │
│                                                                  │
│ [Overview] [Weekly Eval] [Activity Sheet] [Case List] [Logs]    │
│ [Notes] [Progress Graph]                                        │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                         [OVERVIEW TAB]                           │
│                                                                  │
│ COMPETENCY SCORECARD (Current Week)                              │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Category: Professionalism & Demeanor                        │ │
│ │ ├─ General Appearance: [4] (↗ from 3)                      │ │
│ │ ├─ Attitude Toward Investigations: [3] (→)                │ │
│ │ ├─ Work Ethic: [5] ⭐ "Excellent" (↗ from 4)              │ │
│ │ └─ Time Management: [2] (↘ from 3)                         │ │
│ │    └─ FTO Note: "Struggled with prioritization."           │ │
│ │                                                            │ │
│ │ Category: Knowledge & Procedures                            │ │
│ │ ├─ Knowledge of Laws: [2] (↘ from 2)                      │ │
│ │ │  └─ FTO Note: "Review warrantless arrest doctrine"       │ │
│ │ ├─ Report Writing: [4] (→)                                │ │
│ │ └─ Case Management: [3] (↗ from 2)                        │ │
│ │                                                            │ │
│ │ ... (20 total competencies)                                │ │
│ │                                                            │ │
│ │ UNOBSERVED THIS WEEK:                                      │ │
│ │ ⚠️  Interview Skills (need 2, have 1, last: 3/8)          │ │
│ │ ⚠️  Crime Scene Management (need 2, have 1, last: 3/1)    │ │
│ │                                                            │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ COACHING STATUS                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ No active coaching                                          │ │
│ │ (Last week: Knowledge of Laws coaching completed 3/15)    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ PROGRESS INDICATORS                                              │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Weeks Complete: 5 of 10 (50%)                              │ │
│ │ Competencies Mastered: 8 of 20 (40%)                       │ │
│ │ Avg Weekly Score: 3.4 / 5.0                               │ │
│ │ Trajectory: ↗ (trending up overall)                        │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Tab: Weekly Eval**

```
┌──────────────────────────────────────────────────────────────────┐
│ WEEKLY EVALUATION — Week 5 (3/17-3/23)                           │
│ ──────────────────────────────────────────────────────────────── │
│ Status: ✓ SUBMITTED by Smith, John on 3/24 at 10:15am           │
│                                                                  │
│ [View Full Form] [Download PDF] [Print] [Email to DIT]         │
│                                                                  │
│ COMPETENCY SUMMARY                                               │
│ • Scored: 18 of 20                                              │
│ • Not Observed: 2 (Interview Skills, Crime Scene)              │
│ • Scores of 1/2/5: 4 total (Knowledge of Laws 2, Time Mgmt 2, │
│   Work Ethic 5, General Appearance 5)                          │
│                                                                  │
│ [VIEW DETAILED FORM]                                            │
│ [GENERATE DEFICIENCY FORM] (if coaching needed)                │
│                                                                  │
│ DEFICIENCY FORM STATUS                                           │
│ None active this week.                                           │
│ [CREATE DEFICIENCY FORM]                                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Tab: Activity Sheet**

```
┌──────────────────────────────────────────────────────────────────┐
│ ACTIVITY EXPOSURE LOG — Week 5 (3/17-3/23)                       │
│ ──────────────────────────────────────────────────────────────── │
│                                                                  │
│ Search: [________] | Filter: [All] [Complete] [Pending] [Obs]   │
│                                                                  │
│ Activity                    Date    FTO      Role      Status   │
│ ────────────────────────────────────────────────────────────── │
│ Death Investigation        3/17    Smith    Observer  ✓        │
│ Subpoena Preparation       3/18    Smith    Assistant ✓        │
│ Interview Skills           3/19    Smith    Lead      ✓        │
│ Evidence Collection        3/20    Jones    Observer  ✓        │
│ Sexual Assault Case        3/21    Smith    Assistant ✓        │
│ Case Management            3/22    Smith    Observer  ✓        │
│                                                                  │
│ COMPETENCY PROGRESS                                              │
│ Death Investigation: ✓ 2/2 complete (weekly requirement met)   │
│ Interview Skills: 1/2 complete ⚠️  (need 1 more by 3/30)      │
│ Evidence Collection: 3/2 complete (exceeds requirement)        │
│                                                                  │
│ [+ LOG NEW ACTIVITY] [PRINT] [EMAIL]                           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Tab: Case Assignment List**

```
┌──────────────────────────────────────────────────────────────────┐
│ CASE ASSIGNMENTS — Anderson, Michael                             │
│ ──────────────────────────────────────────────────────────────── │
│                                                                  │
│ Role: Co-Investigator (learning role)                           │
│                                                                  │
│ Case #        Incident       Status    Lead Detective  Assign   │
│ ──────────────────────────────────────────────────────────────── │
│ 2024-0847     Homicide       Closed    Smith, J.      3/8-4/2   │
│ 2024-0891     Robbery        Active    Brown, M.      3/15-?    │
│ 2024-0912     Assault        Active    Jones, L.      3/20-?    │
│                                                                  │
│ EXPOSURE CATEGORIES                                              │
│ Scene Management: 2 | Interviews: 1 | Evidence: 3 | Reports: 2  │
│                                                                  │
│ [REQUEST CASE ASSIGNMENT] [VIEW CASE DETAILS]                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Tab: Call-Out Logs**

```
┌──────────────────────────────────────────────────────────────────┐
│ CALL-OUT ACTIVITY                                                │
│ ──────────────────────────────────────────────────────────────── │
│                                                                  │
│ Date      Time Called  FTO        Case Type      Hours   Status  │
│ ──────────────────────────────────────────────────────────────── │
│ 3/17      2:30am       Smith      Death Scene   4h 15m  ✓       │
│ 3/19      11:10pm      Smith      Robbery       2h 30m  ✓       │
│ 3/20      1:45am       Jones      Sexual Crime  3h 45m  ✓       │
│                                                                  │
│ STATS                                                            │
│ Total Call-Outs: 12 (week 5)                                    │
│ Avg Duration: 3h 20m                                            │
│ Night Calls: 7 of 12 (58%)                                      │
│ Off-Day Calls: 1 (eligible for comp time)                       │
│                                                                  │
│ [EDIT LOG] [PRINT] [EMAIL]                                      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Tab: Notes**

```
┌──────────────────────────────────────────────────────────────────┐
│ TRAINING NOTES & OBSERVATIONS                                    │
│ ──────────────────────────────────────────────────────────────── │
│                                                                  │
│ Week 1 (Smith)                                                   │
│ "Good attitude, eager to learn. Slightly nervous on first scene │
│  but handled well. FTO: Smith"                                   │
│                                                                  │
│ Week 2 (Smith)                                                   │
│ "Second week progressing well. Shows initiative in interviews.  │
│  Needs to work on time management. FTO: Smith"                   │
│                                                                  │
│ Week 3 (Jones)                                                   │
│ "Transitioned smoothly to new FTO. Jones notes improvement in   │
│  scene awareness. Still struggling with case prioritization.    │
│  FTO: Jones"                                                     │
│                                                                  │
│ Week 4 (Smith)                                                   │
│ "Back with Smith for focused coaching on case management.       │
│  Deficiency form filed for Knowledge of Laws. DIT participated  │
│  in structured review. FTO: Smith"                               │
│                                                                  │
│ Week 5 (Smith)                                                   │
│ "Good recovery this week. Work ethic excellent. Time management │
│  improving but still needs attention. FTO: Smith"                │
│                                                                  │
│ [+ ADD NOTE] [EDIT] [DELETE]                                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Tab: Progress Graph**

```
┌──────────────────────────────────────────────────────────────────┐
│ COMPETENCY TREND (All 20)                                        │
│ ──────────────────────────────────────────────────────────────── │
│                                                                  │
│      5.0 │                                  ▲                    │
│          │                               ▗▖  │                    │
│      4.5 │                            ▗▖ ▀█▄ │                   │
│          │ ▄▖                      ▗▖ ▀█▄ │                    │
│      4.0 │ ██▄                  ▗▖ ▀█▄  │                   │
│          │ ██████▄          ▗▖▄▄███▄  │                    │
│      3.5 │ ███████▄▄▄▄▄▄▄▄▄██████▄│                   │
│          │ ████████████████████   │                    │
│      3.0 │─────────────────────── │─ Target Line    │
│          │                        │                    │
│      2.5 │                        │ Avg Score     │
│          │                                        │
│      2.0 │                                        │
│          │                                        │
│          └┴────┴────┴────┴────┴────┴────┴────┴───│
│           W1   W2   W3   W4   W5   W6   W7  W10   │
│                                                  │
│ Legend:                                          │
│ Red line (2.0) = Target minimum score            │
│ Blue line (4.0) = Excellence threshold           │
│ Green trend = Week-over-week improving           │
│                                                  │
│ [DOWNLOAD GRAPH] [PRINT] [FULL REPORT]           │
│                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

### Component 4: Schedule (10-Week Grid)

**Purpose:** Visual representation of FTO pairings across 10 weeks. Coordinator edits here.

```
┌──────────────────────────────────────────────────────────────────┐
│ DIT TRAINING SCHEDULE (10 Weeks)                                 │
│ ──────────────────────────────────────────────────────────────── │
│                                                                  │
│ ANDERSON, MICHAEL | Start: 3/3/2025 | Expected End: 5/11/2025   │
│                                                                  │
│ ┌─ APRIL ──┬─────────────────────┬─────────────────────────────┐│
│ │Week 1    │ W1: 3/3-3/9 (MON-FRI, 8am-5pm)                    ││
│ │ FTO:Smith│ FTO: Smith, John (CID-12)                          ││
│ │ Status: ✓│ Focus: Orientation, scene work, interviews        ││
│ └─────────┼─────────────────────┼─────────────────────────────┘│
│                                                                  │
│ ┌─ APRIL ──┬─────────────────────┬─────────────────────────────┐│
│ │Week 2    │ W2: 3/10-3/16 (MON-FRI, 8am-5pm)                  ││
│ │ FTO:Smith│ FTO: Smith, John (CID-12)                          ││
│ │ Status: ✓│ Focus: Case management, evidence, interviews      ││
│ └─────────┼─────────────────────┼─────────────────────────────┘│
│                                                                  │
│ ┌─ APRIL ──┬─────────────────────┬─────────────────────────────┐│
│ │Week 3    │ W3: 3/17-3/23 (MON-FRI, 8am-5pm)                  ││
│ │ FTO:Jones│ FTO: Jones, Michael (CID-13)                       ││
│ │ Status: ✓│ Focus: Witness interviews, crime scene theory     ││
│ │Change: → │ Change: Assigned 3/14, handover 3/15-16           ││
│ └─────────┼─────────────────────┼─────────────────────────────┘│
│                                                                  │
│ ┌─ APRIL ──┬─────────────────────┬─────────────────────────────┐│
│ │Week 4    │ W4: 3/24-3/30 (MON-FRI, 8am-5pm)                  ││
│ │ FTO:Smith│ FTO: Smith, John (CID-12)                          ││
│ │ Status: ✓│ Focus: Coaching (Knowledge of Laws deficiency)    ││
│ │Coaching: │ Deficiency form active — specific case review    ││
│ │  2 areas │ [VIEW DEFICIENCY FORM]                             ││
│ └─────────┼─────────────────────┼─────────────────────────────┘│
│                                                                  │
│ ┌─ MAY ────┬─────────────────────┬─────────────────────────────┐│
│ │Week 5    │ W5: 3/31-4/6 (MON-FRI, 8am-5pm)                   ││
│ │ FTO:Smith│ FTO: Smith, John (CID-12)                          ││
│ │ Status: ✓│ Focus: Follow-up on prior week coaching           ││
│ │          │ [THIS WEEK]                                        ││
│ └─────────┼─────────────────────┼─────────────────────────────┘│
│                                                                  │
│ ┌─ MAY ────┬─────────────────────┬─────────────────────────────┐│
│ │Week 6    │ W6: 4/7-4/13 (MON-FRI, 8am-5pm)                   ││
│ │ FTO:Brown│ FTO: Brown, Linda (CID-14)                         ││
│ │ Status: ✓│ Focus: New investigator pair for perspective      ││
│ │Change: → │ Change: Assigned 4/1, handover 4/4-5              ││
│ └─────────┼─────────────────────┼─────────────────────────────┘│
│                                                                  │
│ ... [Weeks 7-10] ...                                             │
│                                                                  │
│ ┌─ MAY ────┬─────────────────────┬─────────────────────────────┐│
│ │Week 10   │ W10: 5/5-5/11 (MON-FRI, 8am-5pm)                  ││
│ │ FTO:Smith│ FTO: Smith, John (CID-12)                          ││
│ │ Status:  │ Focus: Final evaluation and probation closeout    ││
│ │Final Eval│ [SCHEDULE FINAL EVAL]                              ││
│ └─────────┼─────────────────────┼─────────────────────────────┘│
│                                                                  │
│ [PRINT FULL SCHEDULE] [EMAIL TO DITs/FTOs] [EDIT SCHEDULE]     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Features:**

- **Color-coded status:** ✓ (complete), ⏳ (in progress), ❌ (pending start)
- **FTO info:** Name, badge, focus areas for that week
- **Coaching badge:** If deficiency form active, show it here
- **Quick edit:** Click FTO name to reassign mid-week (if needed)
- **Handover notes:** Show when DIT transitions to new FTO

---

### Component 5: Documents (Tile Grid)

**Purpose:** Quick access to all training materials. No friction.

```
┌─────────────────────────────────────────────────────────────────┐
│ TRAINING DOCUMENTS & RESOURCES                                  │
│ ──────────────────────────────────────────────────────────────── │
│                                                                 │
│ REQUIRED READING (For all DITs)                                 │
│ ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐│
│ │ Training       │  │ Division       │  │ Case Management    ││
│ │ Manual         │  │ Procedures     │  │ System             ││
│ │ (PDF, 47 pgs) │  │ (PDF, 28 pgs)  │  │ (PDF, 12 pgs)      ││
│ │                │  │                │  │                    ││
│ │ [OPEN] [DL]   │  │ [OPEN] [DL]   │  │ [OPEN] [DL]       ││
│ └────────────────┘  └────────────────┘  └────────────────────┘│
│                                                                 │
│ ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐│
│ │ Report         │  │ Activity       │  │ Dress Code &       ││
│ │ Writing Guide  │  │ Checklist      │  │ Decorum            ││
│ │ (PDF, 16 pgs) │  │ (XLSX, 2 tabs) │  │ (PDF, 4 pgs)       ││
│ │                │  │                │  │                    ││
│ │ [OPEN] [DL]   │  │ [OPEN] [DL]   │  │ [OPEN] [DL]       ││
│ └────────────────┘  └────────────────┘  └────────────────────┘│
│                                                                 │
│ REFERENCE MATERIALS                                             │
│ ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐│
│ │ Commonly Used  │  │ Legal Update   │  │ Equipment         ││
│ │ Investigative  │  │ Q&A            │  │ Checklist         ││
│ │ Resources      │  │ (DOCX, Q&A)    │  │ (PDF, 2 pgs)      ││
│ │ (DOCX, 8 pgs) │  │                │  │                    ││
│ │                │  │ [OPEN] [DL]   │  │ [OPEN] [DL]       ││
│ │ [OPEN] [DL]   │  └────────────────┘  └────────────────────┘│
│ └────────────────┘                                              │
│                                                                 │
│ FORMS & TEMPLATES                                               │
│ ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐│
│ │ Weekly         │  │ Competency     │  │ Call-Out Log       ││
│ │ Evaluation     │  │ Self-Review    │  │ Template           ││
│ │ Form (DOCX)    │  │ (DOCX)         │  │ (XLSX)             ││
│ │                │  │                │  │                    ││
│ │ [OPEN] [DL]   │  │ [OPEN] [DL]   │  │ [OPEN] [DL]       ││
│ └────────────────┘  └────────────────┘  └────────────────────┘│
│                                                                 │
│ EXTERNAL RESOURCES (Quick Links)                                │
│ ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐│
│ │ TBI Case Law   │  │ DA Office      │  │ FBI Training       ││
│ │ Database       │  │ Protocols      │  │ Library            ││
│ │ (Link)         │  │ (Link)         │  │ (Link)             ││
│ │                │  │                │  │                    ││
│ │ [OPEN]        │  │ [OPEN]        │  │ [OPEN]            ││
│ └────────────────┘  └────────────────┘  └────────────────────┘│
│                                                                 │
│ [+ UPLOAD NEW DOCUMENT] [ORGANIZE] [ARCHIVE]                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**

- **Categorization:** Required reading vs. reference vs. forms vs. external
- **File type icons:** PDF, DOCX, XLSX, Link (visual quick scan)
- **Quick access:** [OPEN] launches inline viewer, [DL] downloads
- **Version control:** Documents show "Last updated: 3/15/2025"
- **Search:** Search across all docs (Ctrl+F searches name + description)
- **Permissions:** DITs can view all, coordinators can upload/edit/archive

---

### Component 6: Resources (External Links)

**Purpose:** Branded tiles with external links (FBI, TBI, DA, etc.). Minimal but present.

```
┌─────────────────────────────────────────────────────────────────┐
│ EXTERNAL TRAINING RESOURCES                                     │
│ ──────────────────────────────────────────────────────────────── │
│                                                                 │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│ │              │  │              │  │                      │ │
│ │ [FBI LOGO]   │  │ [TBI LOGO]   │  │ [DA OFFICE LOGO]   │ │
│ │              │  │              │  │                      │ │
│ │ FBI Training │  │ TBI Case Law │  │ DA Prosecution      │ │
│ │ Resources    │  │ Database     │  │ Guidelines          │ │
│ │ [VISIT SITE] │  │ [VISIT SITE] │  │ [VISIT SITE]       │ │
│ └──────────────┘  └──────────────┘  └──────────────────────┘ │
│                                                                 │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│ │              │  │              │  │                      │ │
│ │ [STATE ACAD] │  │ [NFSTC]      │  │ [INTERPOL]         │ │
│ │              │  │              │  │                      │ │
│ │ State Law    │  │ Forensics    │  │ International       │ │
│ │ Enforcement  │  │ Standards    │  │ Resources           │ │
│ │ Academy      │  │              │  │                      │ │
│ │ [VISIT SITE] │  │ [VISIT SITE] │  │ [VISIT SITE]       │ │
│ └──────────────┘  └──────────────┘  └──────────────────────┘ │
│                                                                 │
│ [+ ADD RESOURCE] [EDIT] [MANAGE]                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**

- **Logo per resource:** Branded tiles for quick visual recognition
- **Description:** 1-2 lines explaining what each resource offers
- **Opens in new tab:** [VISIT SITE] doesn't navigate away
- **Admin-only edit:** Coordinators can add/remove resources as needed

---

## UX Design Principles Applied

### 1. **Visual Hierarchy** (Law Enforcement Context)

- **Most critical info at top:** DIT status cards show week/FTO/coaching status immediately
- **Color-coded alerts:** Red (at-risk), yellow (caution), green (on-track)
- **Glanceable:** FTO can scan roster in 5 seconds, spot who needs attention

### 2. **Progressive Disclosure** (Reduce Cognitive Load)

- **Dashboard:** Overview only (tiles, summary stats)
- **Click tile → DIT File:** Detail view (all tabs available)
- **Click tab → Specific data:** Eval scores, activity log, notes, etc.
- **Users don't see all 20 competencies at once** — they see categories first, expand if needed

### 3. **Consistency & Patterns** (Intuitive Navigation)

- **All DITs shown in grid format** (not a table, not a dropdown)
- **All forms have same structure:** Title, instructions, input fields, submit button
- **All status indicators use same color scheme:** Green/yellow/red across dashboard

### 4. **Feedback & Transparency** (Build Trust)

- **DIT sees their own eval immediately** — Not waiting for coordinator to sign off
- **FTO sees coaching status in real-time** — Knows if coordinator reviewed deficiency form
- **Coordinator sees escalation history** — Knows what was discussed with sergeant

### 5. **Minimize Friction** (Fast Data Entry)

- **Activity logging:** 1-minute form (activity type, date, FTO, case #, role)
- **Weekly eval:** 5-10 minutes for competencies; only extremes (1/2/5) need explanations
- **Pre-filled defaults:** Current date, logged-in FTO name, current week

### 6. **Mobile-First Responsive** (Field Reality)

- **DITs access on phone:** Want to check their progress
- **FTOs log activities on iPad:** Minimal friction, large touch targets
- **Coordinators use desktop:** Full dashboard, wide tables, scheduling

---

## Data Flow Diagrams

### Diagram 1: Activity Logging Flow (Throughout Week)

```
FTO (in field, on iPad)        System                  DIT + Coordinator
     │                          │                         │
     │ [+LOG ACTIVITY]         │                         │
     ├─────────────────────→   │                         │
     │                         │ Save exposure          │
     │                         │ POST /api/training/   │
     │                         │ training_activity_    │
     │                         │ exposures             │
     │                         │                       │
     │                         ├──→ Update progress   │
     │                         │    (1 of 2 done)     │
     │                         │                       │
     │                         ├────────────────────→ DIT sees update
     │                         │                       (activity logged)
     │                         │                       │
     │ [Activity appears       │                       │
     │  in week's log]         │                       │
     │                         │                       │
     ... [repeat throughout week] ...                   │
     │                                                  │
     └─ FRIDAY 5pm ──────────────────────────────────→ FTO is ready for
                                                       weekly eval
```

### Diagram 2: Weekly Evaluation Flow (End of Week)

```
FTO (Friday)                   System                  Coordinator / DIT
     │                          │                         │
     │ [START WEEKLY EVAL]      │                        │
     ├─────────────────────→    │                        │
     │                          │                        │
     │ Fill form                │                        │
     │ (20 competencies)        │                        │
     │ [Score 1, 2, or 5        │                        │
     │  → explanation required] │                        │
     │                          │                        │
     │ [SUBMIT EVALUATION]      │                        │
     ├─────────────────────→    │                        │
     │                          │ Save session           │
     │                          │ Score competencies   │
     │                          │ Identify unobserved  │
     │                          │ POST/PATCH            │
     │                          │ /api/training/       │
     │                          │ weekly_training_     │
     │                          │ sessions             │
     │                          │                       │
     │                          ├──→ Email coordinator
     │                          │    "Eval submitted"
     │                          │    [LINK to form]
     │                          │                       │
     │                          ├──→ Email DIT
     │                          │    "Unobserved
     │                          │     competencies"
     │                          │    [List of gaps]     │
     │                          │                       │
     │ [Can generate             │                       │
     │  deficiency form?]        │                       │
     │ [optional]               │                       │
     │                          │                       │
     └─────────────────────────→ Coordinator reviews
                                 within 2 business days
```

### Diagram 3: Deficiency Escalation Flow (If Coaching Needed)

```
FTO                    Coordinator            Sergeant            Lieutenant
 │                        │                      │                    │
 │ [GENERATE              │                      │                    │
 │  DEFICIENCY FORM]      │                      │                    │
 ├────────────────→       │                      │                    │
 │                        │                      │                    │
 │ Select flagged         │                      │                    │
 │ competencies           │                      │                    │
 │ Add coaching           │                      │                    │
 │ recommendations        │                      │                    │
 │                        │                      │                    │
 │ [SUBMIT TO             │                      │                    │
 │  COORDINATOR]          │                      │                    │
 ├────────────────────────→                      │                    │
 │                        │ Review within       │                    │
 │                        │ 2 business days     │                    │
 │                        │                     │                    │
 │                        │ [SCHEDULE MEETING  │                    │
 │                        │  WITH FTO]         │                    │
 │                        │ (Calendar integration)
 │                        │                     │                    │
 │                        │ Set status:         │                    │
 │                        │ "COACHING IN       │                    │
 │                        │  PROGRESS"         │                    │
 │                        │                     │                    │
 │ FTO attends coaching   │                     │                    │
 │ meeting (FTO +         │                     │                    │
 │ Coordinator)           │                     │                    │
 │                        │                     │                    │
 │ [Continue for 2 weeks] │                     │                    │
 │                        │                     │                    │
 │                        │ After 2 weeks,      │                    │
 │                        │ if no improvement:  │                    │
 │                        │                     │                    │
 │                        │ [ESCALATE TO        │                    │
 │                        │  SERGEANT]          │                    │
 │                        ├────────────────────→│                    │
 │                        │                     │ Attend meeting     │
 │                        │                     │ (Coordinator +     │
 │                        │                     │  FTO + DIT +       │
 │                        │                     │  Sergeant)        │
 │                        │                     │                    │
 │                        │                     │ Decide:            │
 │                        │                     │ • Continue coaching│
 │                        │                     │ • Change FTO       │
 │                        │                     │ • Formal meeting   │
 │                        │                     │ • Consider removal │
 │                        │                     │                    │
 │                        │                     │ [If still not      │
 │                        │                     │  improving]        │
 │                        │                     ├──────────────────→│
 │                        │                     │                   │
 │                        │                     │                   │
 │ (DIT remains aware throughout — notifications at each step)      │
```

---

## Next Steps: Cursor Prompts

Once you've reviewed this brainstorm, we'll build **specific Cursor prompts** for Cursor to implement. The prompts will be:

- **Small, focused chunks** (one component per prompt)
- **Achievable in one session** (low complexity)
- **Build-order dependent** (foundation first, then components)

**Proposed Build Sequence:**

### Phase 1A: Foundation (Existing)

- ✅ Database schema (done, in spec)
- ✅ API endpoints (done, in spec)
- ✅ RLS policies (in progress)

### Phase 1B: Training Dashboard Shell

1. **Prompt 1:** Training Dashboard layout shell (responsive grid, no data yet)
2. **Prompt 2:** Onboarding section tiles & modals
3. **Prompt 3:** Active DIT Files tile grid (display only)
4. **Prompt 4:** DIT File detail view (Overview tab + tabs structure)
5. **Prompt 5:** DIT File detail - Weekly Eval tab
6. **Prompt 6:** DIT File detail - Activity Sheet tab
7. **Prompt 7:** DIT File detail - Case List & Call-Out tabs
8. **Prompt 8:** 10-Week Schedule grid view
9. **Prompt 9:** Documents & Resources tile grids

### Phase 1C: Weekly Eval + Activity Checklist (Your Current Priority)

1. **Prompt 10:** Weekly Eval form (combined with Activity Sheet as context)
2. **Prompt 11:** Deficiency form generation & submission

### Phase 2: Advanced Features (Later)

- Mobile/iPad optimization
- Real-time sync
- Reporting & exports
- Admin panel

---

## Design Decisions & Rationale

### Decision 1: Why a Dashboard, Not Just Forms?

**Problem:** Your spec includes all the forms (eval, deficiency, activity log), but DITs/FTOs/Coordinators need a **command center** view to see who's on track and who needs attention.

**Solution:** Dashboard as landing page with:

- **DITs see:** Their progress tiles (one per DIT), progress graph, coaching status
- **FTOs see:** Their active DITs (tile grid), quick actions (start eval, log activity)
- **Coordinators see:** All DITs (filter by status: at-risk, on-track, coaching), escalation queue

### Decision 2: Why Tiles Instead of Tables?

**Problem:** Tables are dense; hard to scan. You typically have 1-3 active DITs max.

**Solution:** Card/tile format lets each DIT breathe, shows status at a glance, expandable to detail. Mobile-friendly.

### Decision 3: Why Combine Weekly Eval + Activity Checklist?

**Problem:** Your Activity Checklist and Weekly Eval are separate documents, but they're conceptually linked (eval scores are informed by observed activities).

**Solution:** Same view shows:

- Left: Competency scores (the eval)
- Right: Activities logged this week (the checklist)
- Coordinator sees correlation ("he scored 2 on Knowledge of Laws because he only had 1 interaction with that case type")

### Decision 4: Why Separate "Coaching" from "Deficiency Form"?

**Problem:** Not every low score = coaching. Sometimes it's just early-stage learning (week 2).

**Solution:**

- **Weekly eval:** FTO rates all 20 competencies
- **Optional deficiency form:** FTO only creates if coaching plan is needed
- **Escalation:** Only if coaching doesn't work after 2 weeks

This avoids bureaucratic overhead for normal progression issues.

---

## Design System & Styling Notes

### Color Palette

- **Status: On Track** — 🟢 #10b981 (Emerald)
- **Status: At Risk** — 🟡 #f59e0b (Amber)
- **Status: Needs Attention** — 🔴 #ef4444 (Red)
- **Coaching Active** — 🔵 #3b82f6 (Blue)
- **Background** — #111827 (Dark gray, law enforcement aesthetic)
- **Text** — #f3f4f6 (Light gray, high contrast)

### Typography

- **Headings:** Inter, 24px/700 (dashboard title), 18px/600 (section), 16px/600 (card title)
- **Body:** Inter, 14px/400 (standard), 12px/400 (labels)
- **Monospace:** JetBrains Mono (badge numbers, case #, contact info)

### Spacing

- **Grid system:** 8pt base unit (8, 16, 24, 32, 48px margins/padding)
- **Card gap:** 16px (desktop), 12px (tablet), 8px (mobile)
- **Desktop container:** 1280px max-width

---

## Success Criteria (Before Build)

Before Cursor starts building, we need agreement on:

1. **User Roles Confirmed**
  - ✅ DITs (trainees) — see own file + progress
  - ✅ FTOs (field training officers) — manage their DITs
  - ✅ FTO Coordinators — oversee all DITs, schedule meetings, escalate
  - ✅ FTO Sergeant — receives escalations (future phase)
2. **10-Week Curriculum Defined**
  - ✅ Week 1-2: Orientation, observation
  - ✅ Week 3-4: Assisted investigations
  - ✅ Week 5-7: Lead investigations with oversight
  - ✅ Week 8-10: Independent with review
  - ✅ 20 competencies across 5 categories (from your spec)
3. **Notification Strategy Locked**
  - ✅ Weekly eval submitted → Coordinator gets email
  - ✅ Unobserved competencies → DIT gets email
  - ✅ Deficiency form submitted → Coordinator gets email
  - ✅ Escalation → Sergeant/Lt get email + meeting invite
4. **Mobile Priority**
  - ✅ iPad (landscape): Form entry for FTOs logging activities
  - ✅ Phone: DITs checking progress
  - ✅ Desktop: Coordinators managing dashboard

---

## Questions for Clarification Before Build

1. **Onboarding Survey:** Do you want DITs to complete it before or after first day?
2. **Learning Styles:** What will you do with learning style data from survey? (Adjust FTO pairing? Coaching approach?)
3. **Case Assignments:** Should DITs be manually assigned to cases, or auto-suggested based on phase?
4. **Competency Mastery:** What score (3? 4?) counts as "competency mastered"?
5. **Graduation:** What triggers move from 10-week training to solo duty? (All competencies 3+? All phases complete?)
6. **Probation:** Does probation continue after 10 weeks? If so, how tracked?
7. **FTO Feedback:** Does DIT rate their FTO? (Could be valuable for FTO development)
8. **Call-Out Coverage:** If DIT is on call-out, does that count as "exposed" to activities? (How do you track off-duty exposures?)

---

## References

Industry research conducted April 17, 2026:

- [Transforming law enforcement training: Vector Solutions' Evaluations+](https://www.police1.com/police-products/police-technology/software/cad/articles/when-uiux-becomes-life-or-death-wp0VIpqEkSVRoMhG/)
- [Field Training Software for Law Enforcement (FTO) | Vector Solutions](https://www.vectorsolutions.com/solutions/vector-lms/law-enforcement/fto/)
- [Law Enforcement Training Platform](https://www.uxcabin.com/portfolio/law-enforcement-training-platform)
- [Card UI Design Examples and Best Practices](https://www.eleken.co/blog-posts/card-ui-examples-and-best-practices-for-product-owners)
- [Dashboard Design Best Practices](https://www.justinmind.com/ui-design/dashboard-design-best-practices-ux)
- [Employee Scorecard Guide for 2026](https://www.aihr.com/blog/employee-scorecard/)
- [How to Develop Training Scorecards](https://bscdesigner.com/training-kpis.htm)
- [Best Employee Onboarding Software 2026](https://www.docebo.com/learning-network/blog/employee-onboarding-software/)
- [Law Enforcement UI/UX Best Practices (When UI/UX Becomes Life or Death)](https://www.police1.com/police-products/police-technology/software/cad/articles/when-uiux-becomes-life-or-death-wp0VIpqEkSVRoMhG/)
- [UX Design Trends 2026](https://www.uxpin.com/studio/blog/ui-ux-design-trends/)

---

## Next Step

**Once you review this brainstorm and answer the clarification questions above**, we'll create specific Cursor prompts for building each component. Each prompt will be:

- **Concrete** (exact component to build)
- **Achievable** (done in one session)
- **Connected** (clear API endpoints, data sources, dependencies)

**Ready to proceed with Cursor prompts?** Let me know if you want to adjust the design or have questions on the approach.