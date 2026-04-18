# Onboarding Section - Detailed Specification

**RCSO CID Portal - Detective in Training Program**

---

## Overview

The Onboarding section is where FTO Coordinators enroll new DITs (Detectives in Training) into the 10-week program. It consists of four components:

1. **Create DIT Profile** (Coordinator-initiated)
2. **Learning Style Survey** (DIT-completed, 2+ weeks before start)
3. **Onboarding Meeting Brief** (Coordinator checklist)
4. **Equipment Issue Form** (DIT + FTO signature)
5. **Code of Conduct Acknowledgment** (DIT signature)

---

## Component 1: Create DIT Profile

**Who initiates:** FTO Coordinator  
**When:** Typically 2-3 weeks before training start date  
**Outcome:** New DIT record created, survey link generated and emailed

**Form fields:**
- First Name (required, max 50 chars)
- Last Name (required, max 50 chars)
- Email (required, valid format, unique in system)
- Cell Number (required, valid phone format)
- Badge Number (required, alphanumeric, unique)
- Start Date (required, date picker)

**API:**
```
POST /api/training/dit-records
Body: { firstName, lastName, email, cellNumber, badgeNumber, startDate }
Response: { dit_user_id, survey_link, survey_expires_at }
```

**On success:**
- Display: "Profile created. Survey link sent to [email]. Expires [DATE]."
- Survey link is 7-day expiration
- Email sent to DIT: "Welcome to CID Training Program! Complete this survey before [DATE]"

**Error handling:**
- "This email is already registered in the system"
- "This badge number is already in use"
- "Invalid phone format"

---

## Component 2: Learning Style Survey (VARK Model)

**What:** DIT completes a 16-question VARK assessment to determine learning preference  
**When:** 2+ weeks before start date (coordinator sends link via email)  
**Duration:** ~5 minutes  
**Outcome:** Learning style profile stored, visible to DIT, Coordinator, & Sergeant

### VARK Questions (16 total, each with 4 options)

The VARK model assesses four learning preferences:
- **Visual (V):** Prefer diagrams, charts, spatial understanding
- **Aural (A):** Prefer listening, discussion, verbal instruction
- **Reading/Writing (R):** Prefer text, notes, written details
- **Kinesthetic (K):** Prefer hands-on, doing, real-world application

**Sample question structure:**
"You are about to learn a new investigative procedure. You would prefer to:
a) Watch a video or diagram showing the steps (V)
b) Listen to an explanation from an experienced detective (A)
c) Read detailed written instructions (R)
d) Practice the procedure with a mentor (K)"

**Scoring:**
- Tally V, A, R, K responses
- Generate profile: "Strong Visual, Moderate Aural, etc."
- Provide brief explanation: "You learn best by seeing diagrams and spatial examples..."

### Survey Status Display (in Onboarding card)

**Before completion:**
- Status: "⏳ Awaiting Response"
- Countdown: "Expires in X days"
- [RESEND SURVEY] button (re-emails link)
- [TRACK RESPONSES] button (shows list if multiple DITs)

**After completion:**
- Status: "✓ Completed on [DATE]"
- Display VARK profile: "Strong Visual, Moderate Aural, Minimal Reading, Moderate Kinesthetic"
- Show brief interpretation
- Learning style profile now visible to:
  - ✓ DIT themselves (self-awareness)
  - ✓ FTO Coordinator (for FTO briefing)
  - ✓ FTO Sergeant (for pairing decisions)
  - ✗ Assigned FTO (Coordinator briefs them separately)

**API calls:**
```
GET /api/training/dit-records/{id}/survey-status
Returns: { status: 'pending'|'completed'|'expired', expires_at, completed_at, learning_style_profile }

POST /api/training/dit-records/{id}/resend-survey
Resends email with link

GET /api/training/dit-records/{id}/learning-style
Returns: { vark_profile: { visual: score, aural: score, reading: score, kinesthetic: score }, interpretation: "..." }
```

**Email template:**
```
Subject: Learning Style Survey - CID Training Program

Hi [FIRST NAME],

You've been enrolled in the 10-week Detective in Training program.

Before your first day on [START DATE], please complete this brief learning style survey. 
It takes about 5 minutes and helps us customize your training experience.

The survey identifies how you learn best (visual, aural, reading, or hands-on). 
Your FTO will use these insights to adapt their coaching style for you.

[SURVEY LINK] (expires in 7 days)

See you soon!
RCSO CID Portal
```

---

## Component 3: Onboarding Meeting Brief

**What:** Checklist for Coordinator to use during the initial DIT onboarding meeting  
**When:** First week or before start date  
**Who:** Coordinator + DIT (+ optionally FTO)  
**Outcome:** Checklist completed, optional PDF generated for DIT

**Checklist items:**
- ☐ 10-week program overview (expectations, graduation requirements)
- ☐ Probationary phase expectations (1-year post-graduation tracking)
- ☐ Dress code, work schedules, call-out procedures
- ☐ Division areas & geography (where cases occur)
- ☐ Activity exposure checklist (what DITs need to experience)
- ☐ Case management system (RMS/DCS/APS workflows)
- ☐ Chain of command & escalation procedures
- ☐ Weekly evaluation process (competencies, scoring, signatures)
- ☐ Equipment list & accountability
- ☐ Office decorum & confidentiality

**Buttons:**
- [SCHEDULE MEETING] (placeholder, future: calendar integration)
- [PRINT] (CSS print-friendly styling, dark theme converts to grayscale)
- [EMAIL] (generates PDF and emails checklist to DIT for reference)

**Notes field:** Coordinator can add hand-written or typed notes about meeting

---

## Component 4: Equipment Issue Form (NEW - with Signature)

**What:** DIT + FTO sign off that equipment was issued and received  
**When:** First day or during first week  
**Who:** FTO issues, DIT confirms receipt, Coordinator oversees  
**Signature routing:** FTO → DIT → Coordinator → Sergeant

### Equipment List Template

**Standard equipment:**
- Badge #: [______] (badge number tied to DIT record)
- Handcuffs (confirm type/serial)
- Vehicle key (assign vehicle #)
- Office key / Building access
- Computer login credentials
- RMS/DCS system access
- Cell phone or radio
- Training manual & printed materials
- Gym access / equipment

**Form fields:**
- DIT name (pre-filled)
- Badge number (pre-filled)
- FTO name (pre-filled)
- Date issued (date picker)
- Equipment checklist (checkboxes or table with item | serial | quantity)
- FTO notes (optional text field)
- DIT signature (iPad capture or e-signature)
- Coordinator acknowledgment (checkbox + signature)

**Signature flow:**
1. FTO fills form, checks equipment items
2. DIT reviews and signs (iPad): "I received all items listed above"
3. Coordinator reviews and signs: "Equipment issued and acknowledged"
4. Sergeant signs (optional): Approves record for file

**API:**
```
POST /api/training/equipment-forms
Body: { dit_id, fto_id, equipment_items: [{item, serial, quantity}], issued_date, fto_notes }
Response: { form_id, status: 'ready_for_dit_signature' }

POST /api/training/equipment-forms/{id}/sign
Body: { signature_data: base64, signer_role: 'dit'|'coordinator'|'sergeant', device_info }
Response: { current_step_updated, next_signer: {...} }
```

**Success states:**
- ✓ FTO issued → awaiting DIT signature
- ✓ DIT signed → awaiting Coordinator signature
- ✓ Coordinator signed → awaiting Sergeant review
- ✓ Sergeant signed → COMPLETED
- PDF generated with all signatures + timestamp + device info

**Routing:** FTO → DIT → Coordinator → SGT (see signature routing master reference)

---

## Component 5: Code of Conduct Acknowledgment (NEW - with Signature)

**What:** DIT confirms they've read and understand policies before starting  
**When:** Before first day or first week  
**Who:** DIT signs electronically  
**Signature routing:** DIT → Coordinator (review/archive)

### Required Policies

**Standard acknowledgments:**
- ☐ Confidentiality & Evidence Handling Policy
- ☐ Chain of Custody Procedures
- ☐ Use of Force Policy
- ☐ Professional Conduct Standards
- ☐ Mandatory Reporting Obligations
- ☐ Drug & Alcohol Policy
- ☐ Social Media / Public Conduct Guidelines
- ☐ FOIA & Records Disclosure
- ☐ Harassment & Discrimination Policy

**Form structure:**
- DIT name (pre-filled)
- Badge number (pre-filled)
- Policies listed with checkboxes (required to acknowledge each)
- Text area: "I have read, understand, and agree to comply with the above policies"
- DIT signature (iPad capture)
- Signature date/time (auto-captured)
- Coordinator acknowledgment (checkbox + signature)

**Policies available as PDFs:**
- Link to full policy documents (downloadable)
- Optional: Inline summary of each policy (collapsible)

**API:**
```
POST /api/training/code-of-conduct
Body: { dit_id, policies_acknowledged: [{policy_id, date_read}], signature_data: base64 }
Response: { form_id, status: 'submitted', signature_chain: {...} }

GET /api/training/code-of-conduct/{id}
Returns: Full form + signature chain + audit trail
```

**Success states:**
- ✓ DIT signed → Submitted to Coordinator
- ✓ Coordinator acknowledged → COMPLETED (filed in DIT record)
- Audit trail captures: DIT signature timestamp, IP, device
- PDF generated with all signatures

**Routing:** DIT (self-signs) → Coordinator (confirms receipt, archives)

---

## Onboarding Card Layout (Coordinator View)

```
┌─────────────────────────────────────────────────────────────┐
│ ONBOARDING                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. CREATE PROFILE                                           │
│    Status: ✓ Complete                                      │
│    [Anderson, Michael] | Badge: CID-47 | Enrolled: 2/15   │
│    [EDIT] [VIEW PROFILE]                                    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 2. LEARNING STYLE SURVEY                                    │
│    Status: ⏳ Awaiting Response (Expires 3/7)             │
│    [RESEND SURVEY] [VIEW RESPONSE]                          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 3. ONBOARDING MEETING BRIEF                                 │
│    Status: ⏳ Not Completed                                │
│    Use checklist to guide first meeting                    │
│    [OPEN CHECKLIST] [SCHEDULE MEETING]                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 4. EQUIPMENT ISSUE FORM                                     │
│    Status: ⏳ Not Started                                  │
│    [START FORM] [DOWNLOAD TEMPLATE]                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 5. CODE OF CONDUCT ACKNOWLEDGMENT                           │
│    Status: ⏳ Not Started                                  │
│    [EMAIL TO DIT] [VIEW POLICIES]                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Learning Style Profile Visibility & Usage

**For DIT:**
- Sees their own VARK profile after survey completion
- Understands their learning strengths
- Can share with FTO if desired (optional)

**For FTO Coordinator:**
- Views all active DITs' learning styles
- Uses profile when briefing assigned FTO: "Anderson learns best visually—use diagrams, show examples"
- Stores in notes: "Brief FTO: Strong Visual + Kinesthetic, minimal Reading"
- Can filter/sort DITs by learning style (future feature)

**For FTO Sergeant:**
- Sees all learning styles for DITs in their cohort
- Uses for FTO pairing decisions: "Pair visual learner with Smith (uses diagrams a lot)"
- Can identify patterns: "Our kinesthetic learners do better with hands-on FTOs"

**NOT directly for assigned FTO:**
- FTO receives brief from Coordinator: "Anderson is visual/kinesthetic learner, prefers diagrams and hands-on"
- FTO doesn't have portal access to learning style data (Coordinator acts as intermediary)
- This prevents DITs from seeing FTO see their profile and potentially adding social pressure

---

## Signature Requirements Summary

| Form | Type | Signers | Routing | Completed By |
|---|---|---|---|---|
| Create Profile | Admin | None | N/A | Coordinator fills form |
| Learning Style Survey | Self-Assessment | None | N/A | DIT completes survey |
| Onboarding Brief | Checklist | Optional (Coordinator notes) | N/A | Coordinator checks items |
| Equipment Issue | Legal Document | FTO, DIT, Coordinator, Sgt | FTO → DIT → Coord → SGT | End of first week |
| Code of Conduct | Legal Acknowledgment | DIT, Coordinator | DIT → Coordinator | Before first day |

---

## Document/Resource Integration

Related to Prompt 9 (Documents & Resources Tiles). The following should be available in the Resources section:

**Policy documents (linked from Code of Conduct):**
- Confidentiality & Evidence Handling (PDF)
- Chain of Custody Procedures (PDF)
- Use of Force Policy (PDF)
- Professional Conduct Standards (PDF)
- Mandatory Reporting Obligations (PDF)
- Drug & Alcohol Policy (PDF)
- Social Media / Public Conduct Guidelines (PDF)
- FOIA & Records Disclosure (PDF)
- Harassment & Discrimination Policy (PDF)

**Training materials (for Prompt 9 Documents section):**
- 10-Week Program Overview (PDF)
- Activity Exposure Checklist (PDF)
- Competency Definitions & Scoring Guide (PDF)
- FTO Training Manual (PDF)
- Division Area Maps (PDF)
- RMS/DCS/APS Quick Reference (PDF)

---

## Success Criteria

- ✓ Profile creation works, survey link generated and emailed
- ✓ Survey completes, VARK profile calculates correctly
- ✓ Learning style visible to DIT, Coordinator, Sergeant (not FTO)
- ✓ Meeting brief checklist prints/emails cleanly
- ✓ Equipment form signatures capture correctly on iPad
- ✓ Equipment routing: FTO → DIT → Coordinator → Sergeant
- ✓ Code of Conduct signature captures correctly
- ✓ All PDFs generated with signatures + timestamps
- ✓ Coordinator can view entire onboarding status at a glance
- ✓ No pre-training status gaps (all 5 components tracked)

---

## Revised Prompt 2 (Onboarding Section) Output

Once complete, Prompt 2 will need to be updated to include:
- Equipment Issue Form component (new)
- Code of Conduct Acknowledgment component (new)
- Learning style visibility rules (DIT, Coordinator, Sergeant only)
- Signature routing for both new forms
- API endpoints for all 5 components

This spec serves as reference for the updated Prompt 2.
