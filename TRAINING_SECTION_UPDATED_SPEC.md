# Training Section Renovation: Updated Specification

**RCSO CID Portal - DIT Training Program (10-Week + 1-Year Probation)**

**Date:** April 17, 2026  
**Version:** 2.0 (Incorporates Clarification Answers + Evaluation Criteria)  
**Status:** Ready for Cursor Build Prompts

---

## Table of Contents

1. [Quick Reference: User Answers](#quick-reference-user-answers)
2. [20 Competencies (Evaluation Criteria)](#20-competencies-evaluation-criteria)
3. [System Architecture Updates](#system-architecture-updates)
4. [Digital Signature Workflow (NEW)](#digital-signature-workflow-new)
5. [Build Sequence with Dependencies](#build-sequence-with-dependencies)
6. [Data Models Updates](#data-models-updates)

---

## Quick Reference: User Answers


| Question                           | Answer                                                                        | Impact                                                                                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Onboarding Survey Timing**       | Before first day, 2+ weeks prior                                              | Coordinator uses learning style data to plan FTO pairing & coaching approach before training starts                                                                 |
| **Learning Style Data Usage**      | Informs FTO pairing & coaching approach                                       | New field in DIT profile: learning_style (visual, auditory, kinesthetic, etc.). Coordinator considers when assigning FTOs.                                          |
| **Case Assignments**               | LT/SGT assigns via RMS/DCS/APS referrals                                      | DITs don't self-assign. Logged in system for activity tracking. Link case to exposures (e.g., "Sexual Assault case 2024-0912" = interview exposure).                |
| **Competency Mastery Score**       | **3 (Meets Standard)**                                                        | DIT must score 3+ on ALL 20 competencies to graduate. See eval criteria in next section.                                                                            |
| **Graduation Trigger**             | All 20 competencies 3+, 10 weeks complete, then certificate                   | New workflow: (1) 10 weeks complete, (2) Final eval submitted, (3) All 20 scores 3+, (4) System generates & signs certificate, (5) Certificate sent to DIT & filed. |
| **Post-Training Probation**        | 1 year (not currently tracked)                                                | NEW: Optional Phase 2 module to track probation performance. Can be implemented later. For now, training ends at week 10.                                           |
| **FTO Rating/Feedback**            | YES, desired                                                                  | NEW: After week 10, DIT completes FTO feedback survey (10 questions on FTO performance, teaching style, support). Results visible to FTO Coordinator & FTO Sgt.     |
| **Call-Out Exposure Tracking**     | Yes, includes after-hours & scheduled meetings (CAC, VAPIT, CPIT, SART, CDRB) | Call-outs logged with case/meeting type. Counts toward activity exposure requirements. Meetings pre-defined as activity templates.                                  |
| **Digital Signature System (NEW)** | iPad-based signatures on evals, deficiency forms, final certificate           | NEW: Signature workflow routing (FTO → Coordinator → Sgt → Lt → Capt, depending on form type). All signatures timestamped & audited.                                |


---

## 20 Competencies (Evaluation Criteria)

**Competency Mastery Definition:** Score of **3 or higher** = "Meets standard. Performs at the level expected of an average solo detective."

**All 20 competencies must be scored 3+ by end of Week 10 for graduation.**

### Competency Groups

#### 1. PROFESSIONALISM & DEMEANOR (5 competencies)


| #   | Competency                     | Score 1                                    | Score 3                                                    | Score 5                                                  |
| --- | ------------------------------ | ------------------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------- |
| 1   | General Appearance             | Unkempt, inappropriately dressed           | Consistently neat, appropriate, professional per standards | Exemplary at all times, represents dept well             |
| 2   | Acceptance of Feedback         | Dismissive, defensive, resistant           | Receptive, shows willingness to learn & adjust             | Actively seeks feedback, integrates constructively       |
| 3   | Attitude toward Investigations | Indifferent, lacks initiative, avoids work | Shows appropriate interest & ownership of cases            | Passionate, highly engaged, self-motivated, enthusiastic |
| 4   | Work Ethic                     | Unreliable, avoids work, cuts corners      | Dependable & consistent in assignments                     | Highly driven, willing to go above & beyond              |
| 5   | Stress Management              | Frequently overwhelmed, reacts poorly      | Maintains control & composure under pressure               | Thrives in high-pressure, stabilizes others              |


#### 2. KNOWLEDGE & PROCEDURES (3 competencies)


| #   | Competency                                | Score 1                                                       | Score 3                                                                       | Score 5                                              |
| --- | ----------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------- |
| 6   | Knowledge of Policy/Procedures            | Frequently unaware, violates policy                           | Solid working knowledge, proper application                                   | Deep understanding, advises others                   |
| 7   | Knowledge of Law/Criminal Procedures      | Misapplies basic concepts, violates rights, creates liability | Correctly applies laws in most situations, basic constitutional understanding | Applies law confidently & accurately, advises others |
| 8   | Computer/Data Entry (TriTech & Databases) | Repeated errors, lacks basic skills                           | Proficient in majority of systems, accurate data entry                        | Efficient, accurate, resourceful with digital tools  |


#### 3. INVESTIGATIVE CORE SKILLS (9 competencies)


| #   | Competency                          | Score 1                                                                  | Score 3                                                         | Score 5                                                        |
| --- | ----------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------- | -------------------------------------------------------------- |
| 9   | Response to Initial Investigation   | Misses key steps (responder contact, scene preservation, victim contact) | Timely, competent response; secures scene, initiates interviews | Confident, thorough, strategic initial response                |
| 10  | Crime Scene Management              | Fails to preserve scene, inadequate documentation                        | Competent securing & managing; follows evidence practices       | Expertly manages scenes, effectively coordinates all elements  |
| 11  | Interview Skills                    | Unprepared, struggles with rapport, passive, coercive                    | Competent, structured interviews; builds some rapport           | Exceptionally skilled, adapts style, obtains high-quality info |
| 12  | General Investigative Skills        | Needs continuous guidance, misses obvious connections                    | Capable of thorough investigations with oversight               | Skilled, resourceful, anticipates issues, uncovers details     |
| 13  | Self-Initiated Investigative Skills | Does not follow up without being prompted, passive                       | Pursues logical leads independently, proactive                  | Highly proactive, develops leads independently                 |
| 14  | Innovative Investigative Skills     | Rigid, rarely considers alternatives, lacks curiosity                    | Openness to creative methods when appropriate                   | Frequently identifies creative solutions, thinks outside box   |
| 15  | Problem Solving/Decision Making     | Consistently poor judgment, makes risky decisions                        | Sound decisions based on info, policy, procedure                | Analyzes complex problems effectively, excellent judgment      |
| 16  | Report Writing/Documentation        | Incomplete, inaccurate, vague, poorly written                            | Clear, accurate, meets professional standards                   | Detailed, well-organized, stands up to court scrutiny          |
| 17  | Officer Safety                      | Disregards safety protocols, creates risk                                | Maintains good awareness, doesn't create unnecessary risks      | Exemplifies tactical awareness, models safe behavior           |


#### 4. INTERPERSONAL & OPERATIONAL (3 competencies)


| #   | Competency                   | Score 1                                              | Score 3                                                | Score 5                                               |
| --- | ---------------------------- | ---------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| 18  | Relationships with Citizens  | Dismissive, disrespectful, unprofessional            | Courteous, respectful, represents office appropriately | Excellent community presence, builds trust            |
| 19  | Relationships with Coworkers | Negative team presence, dismissive, creates conflict | Cooperative, respectful, contributes to team           | Trusted team player, informal leader, improves morale |
| 20  | Time Management              | Frequently late, disorganized, misses deadlines      | Manages time adequately, meets deadlines mostly        | Highly organized, efficient, maximizes productivity   |


---

## System Architecture Updates

### 1. DIT Profile Enhancement

**New fields to add to `dit_records` table:**

```sql
-- Onboarding & Learning Style
onboarding_survey_sent_date DATE,
onboarding_survey_completed_date DATE,
learning_style TEXT,  -- 'visual', 'auditory', 'kinesthetic', 'mixed'
learning_style_notes TEXT,

-- Graduation & Probation
graduation_date DATE,  -- Week 10 completion
training_certificate_id UUID,  -- Generated PDF
training_certificate_signed_date DATE,
training_certificate_signer_id UUID,  -- Captain or Lt who signed

-- Probation (Optional Phase 2)
probation_start_date DATE,  -- Usually same as graduation_date
probation_status TEXT DEFAULT 'not_started',  -- 'active', 'completed', 'failed'
probation_end_date DATE,  -- 1 year from graduation
probation_notes TEXT,

-- Case Assignments
assigned_cases JSON,  -- Array of {case_id, case_type, assignment_date, role}

-- FTO Rating Survey
fto_feedback_survey_completed BOOLEAN DEFAULT false,
fto_feedback_survey_date DATE,
fto_rating_score INT,  -- 1-5 on FTO performance
fto_rating_comments TEXT
```

### 2. Activity Exposure Templates (Updated)

**Add pre-defined meeting types as activity templates:**

```sql
INSERT INTO training_activity_templates (activity_name, category, required_exposures_phase_1, description)
VALUES
-- Existing activities...
-- NEW: Scheduled Meetings
('CAC Meeting', 'Scheduled Meeting', 1, 'Child Advocacy Center meeting'),
('VAPIT Meeting', 'Scheduled Meeting', 1, 'Victim Advocate & Prosecution Integration Team'),
('CPIT Meeting', 'Scheduled Meeting', 1, 'Child Protection Integration Team'),
('SART Meeting', 'Scheduled Meeting', 1, 'Sexual Assault Response Team'),
('CDRB Meeting', 'Scheduled Meeting', 1, 'Child Death Review Board'),
('After-Hours Call-Out', 'Call-Out', 2, 'Exposure via off-duty call-out'),
('Business Hours Call-Out', 'Call-Out', 2, 'Exposure via scheduled call-out');
```

**Call-Out logging includes:**

- Date & time called
- Case/incident type
- FTO paired on call-out
- Duration
- Role (observer/assistant/lead)
- Counts as competency exposure for relevant areas

### 3. Digital Signature System (NEW)

**New table: `digital_signatures`**

```sql
CREATE TABLE digital_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL CHECK (
    document_type IN ('weekly_eval', 'deficiency_form', 'final_certificate', 'fto_feedback')
  ),
  document_id UUID NOT NULL,
  dit_user_id UUID NOT NULL REFERENCES auth.users (id),
  fto_user_id UUID REFERENCES auth.users (id),
  coordinator_user_id UUID REFERENCES auth.users (id),
  sergeant_user_id UUID REFERENCES auth.users (id),
  lieutenant_user_id UUID REFERENCES auth.users (id),
  captain_user_id UUID REFERENCES auth.users (id),
  
  -- Signature data
  current_signer_role TEXT NOT NULL CHECK (
    current_signer_role IN ('fto', 'coordinator', 'sergeant', 'lieutenant', 'captain')
  ),
  signature_data TEXT,  -- Base64-encoded signature image (iPad capture)
  signed_at TIMESTAMPTZ,
  signed_ip_address TEXT,
  signed_device TEXT,  -- 'iPad', 'Desktop', etc.
  
  -- Routing metadata
  routing_order TEXT[] NOT NULL,  -- ['fto', 'coordinator', 'sergeant', 'lieutenant']
  current_step INT NOT NULL,  -- 0 (FTO), 1 (Coordinator), etc.
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'signed', 'completed')
  ),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX digital_signatures_document_id_idx 
  ON digital_signatures (document_id);
CREATE INDEX digital_signatures_current_signer_role_idx 
  ON digital_signatures (current_signer_role);
```

**Signature Routing by Document Type:**


| Document            | Routing Order                                 | Notes                                             |
| ------------------- | --------------------------------------------- | ------------------------------------------------- |
| Weekly Eval         | FTO → Coordinator → (if deficiency: Sergeant) | Sergeant only if deficiency form generated        |
| Deficiency Form     | FTO → Coordinator → Sergeant                  | Always goes to sergeant for escalation tracking   |
| Final Certificate   | Coordinator → Lieutenant → Captain            | Captain signs final certificate                   |
| FTO Feedback Survey | DIT → Coordinator → FTO Sergeant              | FTO Sgt reviews feedback for coaching/development |


### 4. Certificate Generation (NEW)

**New table: `training_certificates`**

```sql
CREATE TABLE training_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dit_user_id UUID NOT NULL REFERENCES auth.users (id),
  dit_name TEXT NOT NULL,
  badge_number TEXT NOT NULL,
  graduation_date DATE NOT NULL,
  certificate_number TEXT UNIQUE NOT NULL,  -- Serial number for official record
  
  -- Signatory info
  signed_by_user_id UUID NOT NULL REFERENCES auth.users (id),
  signed_by_name TEXT NOT NULL,  -- Captain or Lt name
  signed_by_title TEXT NOT NULL,
  signed_date TIMESTAMPTZ NOT NULL,
  
  -- PDF & Storage
  certificate_pdf_path TEXT,  -- Stored path in storage
  certificate_pdf_base64 TEXT,  -- For email/download
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  digitally_signed_at TIMESTAMPTZ
);

-- Certificate template (HTML/PDF generation):
-- ┌─────────────────────────────────────┐
-- │  RCSO DETECTIVE IN TRAINING         │
-- │     PROGRAM CERTIFICATE             │
-- │                                     │
-- │  This certifies that                │
-- │                                     │
-- │  [DIT NAME]                         │
-- │  Badge: [BADGE NUMBER]              │
-- │                                     │
-- │  Has successfully completed the     │
-- │  10-Week Detective in Training      │
-- │  Program on [GRADUATION DATE]       │
-- │                                     │
-- │  All 20 competencies mastered       │
-- │  at Level 3 (Meets Standard) or     │
-- │  above.                             │
-- │                                     │
-- │  Signed: ________________           │
-- │  [CAPTAIN/LT NAME]                  │
-- │  Title: [TITLE]                     │
-- │  Date: [DATE]                       │
-- │                                     │
-- │  Certificate #: [SERIAL NUMBER]     │
-- └─────────────────────────────────────┘
```

### 5. Graduation Workflow (NEW)

**Trigger: Week 10 Weekly Eval Submitted**

```
STEP 1: System checks all 20 competencies
        IF any competency < 3:
          → Mark as "REVIEW NEEDED"
          → Email Coordinator: "DIT not ready for graduation"
          → Skip to Step 5 (deficiency form)
        ELSE:
          → Proceed to Step 2

STEP 2: System sets graduation_date = today
        → Creates training_certificate record
        → Generates PDF with placeholder signature

STEP 3: System routes certificate for signature
        → Coordinator reviews & signs
        → (Optional) Lt reviews & signs
        → Captain signs (final approval)

STEP 4: Once Captain signs:
        → Certificate marked "COMPLETE"
        → Email sent to DIT with PDF attachment
        → Certificate PDF filed in DIT record
        → training_status = "graduated"

STEP 5: (If deficiency in week 10)
        → Mark week as "needs remediation"
        → Create deficiency form
        → Follow standard escalation workflow
        → No graduation until all 20 are 3+
```

### 6. FTO Rating/Feedback Survey (NEW)

**Trigger: Day 1 of Week 10 (or after graduation)**

**Survey Structure:**

```
TITLE: "Feedback on Your FTO Experience"

DIT answers 10 questions (1-5 scale + comment box):

1. "My FTO was knowledgeable about investigative procedures."
2. "My FTO provided clear feedback when I made mistakes."
3. "My FTO created a safe environment for asking questions."
4. "My FTO was accessible and responsive to my needs."
5. "My FTO helped me understand the 'why' behind procedures, not just 'how.'"
6. "My FTO adapted their teaching style to match my learning style."
7. "My FTO provided opportunities for me to lead investigations."
8. "My FTO treated me with respect and professionalism."
9. "I feel prepared for solo detective work because of this FTO's training."
10. "Overall, rate your FTO's effectiveness as a trainer."

SCALE: 1 (Strongly Disagree) → 5 (Strongly Agree)
COMMENT: Optional text field for each question

ROUTING:
→ DIT completes survey
→ Results sent to Coordinator + FTO Sergeant
→ FTO Sergeant uses for FTO development/coaching
→ Results visible in DIT file under "Training Notes"
```

### 7. Call-Out Exposure Tracking (NEW)

**Call-Out Log Addition:**

```sql
ALTER TABLE training_activity_exposures ADD COLUMN (
  call_out_type TEXT CHECK (call_out_type IN ('after_hours', 'business_hours', 'scheduled_meeting')),
  meeting_type TEXT CHECK (meeting_type IN ('CAC', 'VAPIT', 'CPIT', 'SART', 'CDRB', NULL)),
  is_off_duty_exposure BOOLEAN DEFAULT false
);

-- Example call-out exposures:
-- Off-hours call-out for homicide (2am) = 1 exposure toward "Response to Initial Investigation"
-- SART meeting (scheduled) = 1 exposure toward "Interview Skills" + "Relationships with Citizens"
-- Business-hours call-out = 1 exposure toward relevant competency area
```

---

## Digital Signature Workflow (NEW)

### iPad Signature Hardware & Software

**Setup:**

- Dedicated iPad(s) at training hub/coordinator desk
- Signature capture via **Apple Pencil** or **finger**
- Pre-loaded with document to sign + form context
- Biometric lock (Face ID or Touch ID) after signature

### Signature Flow (Weekly Eval Example)

```
FRIDAY AFTERNOON (FTO submits weekly eval)
└─ System creates digital_signatures record
   status = 'pending'
   current_signer_role = 'fto'
   current_step = 0
   routing_order = ['fto', 'coordinator', 'sergeant'] (if deficiency)
                  OR ['fto', 'coordinator'] (if no deficiency)

FTO SIGNATURE
└─ FTO approaches iPad
└─ System displays: "Weekly Eval Pending Your Signature"
   └─ DIT name, week, signature summary (competencies, scores, deficiency Y/N)
   └─ [SIGN HERE] button → Canvas opens
   └─ FTO signs with pencil/finger
   └─ System captures: signature image, timestamp, IP, device type
   └─ Update: current_signer_role = 'coordinator', current_step = 1

NEXT BUSINESS DAY (Coordinator available)
└─ Coordinator receives notification: "Eval pending your signature"
└─ Coordinator opens iPad
└─ System displays: Same form + FTO signature (read-only)
└─ Coordinator reviews content
└─ Coordinator signs: [SIGN HERE]
└─ System captures signature, timestamp, IP
└─ Update: current_signer_role = 'sergeant' OR status = 'completed'

IF DEFICIENCY GENERATED:
└─ Sergeant receives notification: "Deficiency form pending review"
└─ Sergeant opens iPad (or desktop)
└─ Sergeant reviews deficiency details
└─ Sergeant signs off
└─ Document routed to Lieutenant (if escalated)

FINAL STATE:
└─ status = 'completed'
└─ All signatures captured, timestamped, immutable
└─ PDF generated with all signature pages
└─ PDF stored in dit_records.training_certificate_pdf_path
└─ Email sent to DIT: "Your weekly eval has been signed"
```

### Signature Authentication & Audit

**Security:**

- Each signer authenticates via biometric (Face ID) or password
- Signature timestamp immutable in database
- IP address & device type logged for audit trail
- Signatures cannot be edited or deleted (append-only log)
- Export to PDF includes all signature pages in order

**Audit Report Example:**

```
WEEKLY EVALUATION - ANDERSON, MICHAEL - WEEK 5

Document ID: abc123def456
Created: 2025-03-24 17:00
Status: COMPLETED (all signatures collected)

Signature Chain:
┌─ FTO: Smith, John (CID-12)
│  Signed: 2025-03-24 17:45
│  Device: iPad Pro (11-inch)
│  IP: 192.168.1.105
│  Signature Image: [captured]
│
├─ Coordinator: Brown, Sandra (Coordinator)
│  Signed: 2025-03-25 09:30
│  Device: iPad Pro (11-inch)
│  IP: 192.168.1.105
│  Signature Image: [captured]
│
└─ Status: SIGNED & FINAL
   PDF generated: 2025-03-25 09:31
   Filename: Weekly_Eval_Anderson_Week5_SIGNED.pdf
```

---

## Build Sequence with Dependencies

### Phase 1A: Foundation (Already Done ✓)

- ✓ Database schema (DIT_WEEKLY_TRAINING_SYSTEM_SPEC.md)
- ✓ API endpoints (DIT_WEEKLY_TRAINING_SYSTEM_SPEC.md)

### Phase 1B: Dashboard & UI Shell

**Cursor Prompt 1:** Training Dashboard layout shell (responsive, no data)
**Cursor Prompt 2:** Onboarding section (create profile, survey trigger, meeting brief)
**Cursor Prompt 3:** Active DIT Files grid (tile-based display, status color-coding)
**Cursor Prompt 4:** DIT File detail view tabs (structure + Overview tab)
**Cursor Prompt 5:** DIT File - Weekly Eval tab (form + activity context)
**Cursor Prompt 6:** DIT File - Activity Sheet tab
**Cursor Prompt 7:** DIT File - Case List & Call-Out tabs
**Cursor Prompt 8:** 10-Week Schedule grid
**Cursor Prompt 9:** Documents & Resources tiles

### Phase 1C: Core Training Features (Your Priority)

**Cursor Prompt 10:** Weekly Evaluation Form (combined with signature workflow)
**Cursor Prompt 11:** Deficiency Form Generation & Submission (with escalation routing)
**Cursor Prompt 12:** Digital Signature System (FTO iPad capture, routing, audit)

### Phase 1D: Graduation & FTO Rating (New)

**Cursor Prompt 13:** Graduation Trigger & Certificate Generation (PDF template, signature routing)
**Cursor Prompt 14:** FTO Rating/Feedback Survey (completion, results visibility, routing)

### Phase 2: Advanced (Future)

- Call-out tracking & exposure correlation
- Probation phase 2 tracking (optional, 1-year post-graduation)
- Reporting & analytics (trend analysis, FTO effectiveness, etc.)
- Mobile/iPad optimization for field use

---

## Data Models Updates

### Updated Training Database ERD

```
┌─────────────────────────────────────┐
│  dit_records (existing)             │
├─────────────────────────────────────┤
│ id (PK)                             │
│ user_id (FK → auth.users)           │
│ + NEW: learning_style               │
│ + NEW: graduation_date              │
│ + NEW: training_certificate_id      │
│ + NEW: fto_feedback_survey_...      │
│ + NEW: assigned_cases (JSON)        │
│ + NEW: probation_... (optional)     │
└────────┬────────────────────────────┘
         │
         ├─→ fto_pairings (existing)
         │   └─→ weekly_training_sessions
         │       └─→ weekly_competency_scores
         │       └─→ training_activity_exposures
         │       └─→ deficiency_forms
         │           └─→ deficiency_form_actions
         │
         └─→ NEW: digital_signatures
             ├─ weekly_eval signature chain
             ├─ deficiency_form signature chain
             ├─ final_certificate signature chain
             └─ fto_feedback signature chain

         └─→ NEW: training_certificates
             └─ PDF, serial #, signatures
```

---

## Glossary of Key Terms


| Term                   | Definition                                                                      |
| ---------------------- | ------------------------------------------------------------------------------- |
| **DIT**                | Detective in Training (trainee in 10-week program)                              |
| **FTO**                | Field Training Officer (supervisor pairing with DIT)                            |
| **FTO Coordinator**    | Oversees all DITs, schedules, escalates coaching                                |
| **Competency Mastery** | Score of 3+ on evaluation scale (meets standard)                                |
| **Graduation**         | Completion of 10 weeks + all 20 competencies at 3+                              |
| **Digital Signature**  | Captured on iPad, immutable, timestamped, audited                               |
| **Routing Order**      | Sequence of signers (FTO → Coordinator → Sergeant → etc.)                       |
| **Call-Out Exposure**  | Off-hours or scheduled meeting attendance counting toward activity requirements |
| **Learning Style**     | Visual/Auditory/Kinesthetic preference, guides FTO pairing & coaching           |
| **Probation Phase**    | Optional 1-year post-graduation tracking (Phase 2 future)                       |


---

## Success Criteria (Before Build Starts)

✓ **All clarification questions answered**
✓ **Competency mastery score defined:** 3+ 
✓ **Graduation criteria locked:** 10 weeks + all 20 competencies 3+ + certificate
✓ **Digital signature workflow approved:** iPad, routing order, audit trail
✓ **FTO rating survey scoped:** 10 questions, routing, visibility
✓ **Call-out exposure defined:** Counts toward activity requirements (after-hours, business hours, meetings)
✓ **Learning style usage confirmed:** FTO pairing + coaching approach selection

---

## Next Step

**You are ready for Cursor Build Prompts.**

These 14 prompts will be delivered in dependency order, each:

- 📋 **Concrete:** Exact component to build
- ⏱️ **Achievable:** One-session complexity
- 🔗 **Connected:** API endpoints, data sources, dependencies noted

**Prompts will include:**

- UI/UX mockup (exact layout expectations)
- Data flow diagram (what API calls, when)
- Form validation rules
- Success/error states
- Mobile responsiveness notes

---

## Questions Before We Proceed?

1. **iPad Signature Devices:** Do you have dedicated iPads, or will these be shared with other systems?
2. **Certificate Signatory:** Who signs the final certificate — Captain or Lieutenant? (Affects routing order)
3. **FTO Feedback Survey Visibility:** Should DITs see the FTO's response to their feedback, or just coordinators?
4. **Probation Phase 2:** Should we build a skeleton for this now (just date fields), or defer entirely until later?
5. **Call-Out Meeting Types:** Are there other meeting types beyond CAC/VAPIT/CPIT/SART/CDRB?

---

**Ready to generate the 14 detailed Cursor Prompts?** 🚀