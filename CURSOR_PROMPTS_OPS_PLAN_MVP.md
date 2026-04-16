# Cursor Prompts: Digital OPS Plan Form (MVP)
## For Search Warrants — Structures & Locate Person Operations

**Goal:** Digitize the existing RCSO OPS Plan form (exact layout, no changes) with integrated Equipment Checklist and Supplement Tracking. Print must match original form exactly. Must support photo uploads.

---

## PROMPT 1: OPS Plan Form — Basic Structure & Database Schema

**For Cursor:**

Build the database structure and data model for the digital OPS Plan form. Requirements:

**Form Metadata:**
- Case Agent Name
- Date of Operation
- Complaint Number
- Radio Channel
- Operation Type (checkboxes: UC-Buy/Walk, UC-Buy/Bust, Search Warrant, Reverse, Flash Roll, Other)
- Auto-generated Operation ID (for linking to case system)

**Suspect Information Section:**
- Up to 3 suspects (S-1, S-2, S-3)
- Fields per suspect: Name, Description, Priors/Weapons
- Photo upload per suspect (minimum 1, up to 2 photos per suspect)

**Suspect Address Section:**
- Address (text field)
- Notes/Cautions (text area)
- Address photos (minimum 1, up to 2 photos)

**Case Background Section:**
- Large text area for complete case synopsis
- Support for: Previous charges, previous buys, related cases, etc.
- Searchable text (indexed for search functionality)

**Suspect Vehicles Section:**
- Up to 5 vehicles (V-1 through V-5)
- Fields per vehicle: Year, Make/Model, Color, License Plate, Other details
- Vehicle photos (minimum 1, up to 2 per vehicle)

**Case Agent Instructions Section:**
- Large text area for primary plan
- Large text area for alternate plan
- Both plans searchable and printable

**Contingency Plans Section:**
- Officer In-Charge designation (text field)
- LifeFlight Landing Zone (text area with location field)
- Emergency Transport Plan (text area)

**Undercover Personnel Section:**
- Table: Undercover Personnel name + Vehicle assignment
- Support for multiple entries
- Link to overall Personnel table

**Bust Signals Section:**
- Primary signal (text field)
- Secondary signal (text field)
- Rip-off signal (text field)

**Personnel Assisting & Assignment Section:**
- Table: Name, Vehicle, Unit #, Assignment
- Support for 15+ entries (dynamic rows)
- Sortable by name, unit, role
- Linked to case system (pull from user database)

**Special Equipment Section:**
- Checkboxes: Kel-Set, Surveillance Van, Aircraft, Other
- Checkboxes: Recorder, Transmitter
- Other equipment text field

**Database Schema:**
- `ops_plan_id` (primary key)
- `case_agent_id` (foreign key to user)
- `complaint_number` (unique)
- `date_created`, `date_modified`, `date_operation`
- `operation_type` (enum)
- `case_background_text` (full-text indexed)
- `prepared_by` (user), `prepared_date`
- `approved_by` (user), `approved_date`
- `status` (draft, prepared, approved, in-progress, completed, archived)
- All suspect, vehicle, personnel, equipment data normalized into related tables

**Output:**
- Database schema (relational design)
- API endpoints for CRUD operations
- Data validation rules (no empty required fields, photo upload constraints, etc.)
- Audit trail (all changes timestamped and attributed)

**User Controls:** 
- All field names, table structures, photo limits
- Required vs. optional fields
- Searchable fields
- Print formatting options

---

## PROMPT 2: OPS Plan Form — Web UI (Form Entry)

**For Cursor:**

Build the web interface for detectives to fill out the digital OPS Plan form. Requirements:

**Form Layout (Must Match Original PDF Exactly):**
- Horizontal layout follows original form structure
- Sections flow: Header → Suspect Info → Address → Background → Vehicles → Instructions → Contingency → Personnel → Equipment → Checklist
- Print styling must produce exact PDF layout
- Form must be fillable on desktop and tablet
- Save progress at any point

**User Experience:**
- Auto-save every 30 seconds (user can turn off)
- Clear error messages if required fields empty
- Tab navigation between sections
- Expandable/collapsible sections
- Image preview (user sees photo before upload)

**Photo Upload Integration:**
- For each photo field: [Choose File] button + preview
- Drag-and-drop support
- File types: JPG, PNG (max 5MB per file)
- Photo appears inline in form
- Can replace/delete photo before saving
- Photos embedded in printed PDF

**Suspect/Vehicle/Personnel Tables:**
- Can add/remove rows dynamically
- Inline editing (click field to edit)
- Delete buttons (with confirmation)
- Copy row function (duplicate data to new row)

**Form Validation:**
- Required field indicators (red asterisk)
- On-save validation (shows errors at top)
- On-field-blur validation (immediate feedback)
- Cannot submit form if required fields empty

**Save/Submit Flow:**
- Save as Draft: Saves without approval
- Submit for Approval: Sends to supervisor/commander
- Status shows at top: "DRAFT", "AWAITING APPROVAL", "APPROVED", "IN-PROGRESS", "COMPLETED"

**Revision History:**
- View who changed what and when
- Can revert to previous version (if not yet executed)
- Timestamp on every save

**Output:**
- React/Vue component (or framework of choice)
- Form styling (CSS) that matches original PDF print layout
- File upload handler
- Form validation logic
- Auto-save mechanism
- Revision tracking UI

**User Controls:**
- Font sizes, colors, spacing
- Required field list
- Print page breaks
- Photo placement in PDF

---

## PROMPT 3: OPS Plan Form — Print to PDF (Exact Layout Match)

**For Cursor:**

Build the PDF export functionality that prints the digital OPS Plan in exact format of the original form. Requirements:

**PDF Generation:**
- Print-to-PDF library (e.g., html2pdf, pdfkit, etc.)
- Must match original form layout exactly (same spacing, fonts, headers)
- Multi-page form (currently 5 pages, must expand if needed)
- Page headers/footers with form name, case number, page numbers

**Content Mapping:**
- Form data fields → PDF locations (exact positioning)
- Photos embedded in correct locations on PDF
- Tables formatted correctly (Personnel, Vehicles, Equipment)
- Text areas expand to fit content
- Checkboxes show as marked/unmarked

**Page Breaks:**
- Intelligent page breaks (don't split sections)
- If personnel table extends beyond page, continues to next page with headers
- Page numbering updates automatically

**Print Quality:**
- Vector fonts (not rasterized)
- Images at 300 DPI (for printing)
- Black & white print-friendly (but also color if printed in color)

**PDF Metadata:**
- Title: "[Case Number] - OPS Plan"
- Author: "[Case Agent Name]"
- Created Date: [Date form was created]
- Subject: "Operations Plan - RCSO SEB"

**Print Workflow:**
1. Case agent fills out form on web UI
2. Clicks "Generate PDF"
3. System creates PDF with exact layout
4. PDF opens in browser (can save or print)
5. Printed output matches original form exactly

**Distribution:**
- Email PDF to team members
- Text message link to PDF (secure cloud storage)
- QR code to PDF (printed on briefing materials)
- Print copies for briefing

**Output:**
- PDF generation function
- HTML template that matches original form layout
- CSS for print media
- Page break logic
- Image embedding code

**User Controls:**
- Paper size (letter, legal)
- Margins
- Font selection (Arial, Times, etc.)
- Logo/branding on header
- Watermark options (DRAFT, APPROVED, etc.)

---

## PROMPT 4: Equipment Checklist (Integrated into OPS Plan)

**For Cursor:**

Build the Equipment Checklist as an integrated component of the OPS Plan form. Requirements:

**Checklist Design:**
- Generates automatically based on operation type (Search Warrant, UC-Buy, etc.)
- Auto-populates from operation-specific templates
- Manual add/remove items capability

**Checklist Items:**
For Search Warrant operations:
- [ ] Vest per searcher (auto-count: 3 vests for 3 searchers)
- [ ] Gloves per searcher
- [ ] Flashlight per searcher
- [ ] Radio per searcher
- [ ] Evidence intake forms (per compliance #)
- [ ] Camera/photography equipment
- [ ] Digital sketch tool tablet
- [ ] Oscar device (if applicable)
- [ ] Phone charger (for target phone — specs pulled from "Suspect Vehicles" or custom field)
- [ ] First aid kit
- [ ] Contingency equipment (per plan)

**Dynamic Checklist:**
- If Personnel Assisting table has 8 people, checklist auto-calculates:
  - 3 vests (for 3 searchers)
  - 1 Oscar equipment
  - 1 Sketch tablet
  - etc.
- Supervisor can add custom items ("Ropes", "Bolt cutters", etc.)
- Pre-save checklists as templates for future operations

**Supervisor Verification:**
- Before execution, supervisor reviews checklist
- Can check off items as they verify physical equipment
- If any unchecked at execution time, system warns
- Cannot mark operation "Ready to Execute" until all items checked

**Equipment Tracking:**
- Log which items were actually used
- Post-operation: Compare planned vs. actual
- Feedback: "We planned for X but actually used Y"
- Informs next operation's checklist

**Integration with Form:**
- Checklist appears on printed PDF (last page or appendix)
- Checkbox column for supervisor signature during briefing
- Dated and signed

**Mobile Companion:**
- Supervisor can access checklist on iPad during briefing
- Tap to check items off as verified
- Real-time sync to case system

**Output:**
- Checklist component
- Template library (by operation type)
- Auto-calculation logic (count personnel → calculate items)
- Supervisor verification UI
- PDF generation for checklist section
- Mobile checklist app component

**User Controls:**
- Checklist items per operation type
- Dynamic calculations
- Template management
- Custom item capability

---

## PROMPT 5: Supplement Tracking (Integrated into OPS Plan)

**For Cursor:**

Build Supplement Tracking as an integrated component of the OPS Plan form. Requirements:

**Supplement Assignment Section (On Form):**
For each role/personnel in the "Personnel Assisting" table:
- Role: [Searcher 1]
- Name: [Detective Smith]
- Supplement Required: [YES / NO]
- Supplement Type: [Searcher Report / Photo Log / Video Report / etc.]
- Due: [Auto-calculated: Operation Date + 2 days]
- Status: [Not Filed / Filed / Overdue]

**Automatic Supplement Rules:**
Based on role, system pre-populates supplement requirement:
```
Searcher → "Searcher Report" required
Crime Scene Tech (Photography) → "Evidence Photography Log" required
Sketch Tech → "Digital Crime Scene Sketch" required
Oscar Operator → "360 Video Documentation Report" required
Lead Detective → "Search Warrant Execution Report" required
Supervisor → "Post-Operation Debrief" required
```

**Role-Specific Supplement Fields:**
- For Sketch Tech:
  - Supplement: "Digital Crime Scene Sketch"
  - Tool: "Use digital sketch app (uploaded directly, no paper redraw)"
  - Due: Auto-calculated

- For Oscar Operator:
  - Supplement: "360 Video Documentation Report"
  - Tool: "Describe footage captured, provide timestamp index"
  - Due: Auto-calculated

- For Crime Scene Tech:
  - Supplement: "Evidence Photography Log"
  - Tool: "Verify all photos uploaded with timestamps"
  - Due: Auto-calculated

**Integration with OPS Plan PDF:**
- Supplement requirements printed on PDF (separate page or integrated)
- Each person gets printout showing their required supplements
- Due dates clear and visible
- Role-specific tool recommendations printed

**Post-Operation Supplements:**
- After operation marked "completed", system auto-generates supplement reminders
- Each person gets: Email + SMS + in-app notification
- Reminder includes:
  - What supplement they need to file
  - Due date
  - Tool/method to use
  - Link to upload portal

**Supplement Status Tracking:**
- Lead detective view: See all supplements, status (filed/outstanding/overdue)
- System auto-updates status when detective uploads supplement
- Overdue supplements trigger escalation alerts to lead and supervisor

**Output:**
- Supplement assignment component
- Role-to-supplement mapping logic
- Auto-calculation of due dates
- Supervisor view (all supplements status)
- Individual detective view (their supplements)
- PDF section with supplement requirements
- Reminder trigger logic
- Upload portal for supplements

**User Controls:**
- Supplement types per role
- Due date offset (default 2 days, configurable)
- Reminder timing (1 day before, on day of, overdue)
- Escalation thresholds
- Supplement tools/recommendations

---

## PROMPT 6: OPS Plan Form — Supervisor Approval Workflow

**For Cursor:**

Build the approval workflow so supervisors/commanders can review and approve OPS Plans before execution. Requirements:

**Approval Flow:**
1. Case Agent fills out OPS Plan, clicks "Submit for Approval"
2. Form status changes to "AWAITING APPROVAL"
3. Supervisor/Commander receives notification (email + SMS + in-app)
4. Supervisor opens form, reviews all sections
5. Supervisor can:
   - [ ] Approve (form ready for execution)
   - [ ] Request Changes (with comment)
   - [ ] Deny (with comment)
6. If approved: Status changes to "APPROVED", briefing materials print
7. If changes requested: Case Agent sees comment, revises, resubmits
8. If denied: Case Agent sees reason, can ask for appeal

**Approval Checklist (For Supervisor):**
When supervisor opens form for approval, they see:
```
APPROVE OPS PLAN - CASE #250416-XXXX

Review Checklist:
[ ] All suspects documented (name, description, photos)
[ ] Address verified and photographed
[ ] Case background complete and clear
[ ] Personnel assigned (lead, searchers, support)
[ ] Equipment checklist complete and verified
[ ] Contingency plans documented
[ ] Radio channel assigned
[ ] Threat Assessment completed (linked to form)
[ ] All required photos present
[ ] All required fields filled

Comments/Concerns:
[Text area for supervisor notes]

[ APPROVE ]  [ REQUEST CHANGES ]  [ DENY ]
```

**Revision History:**
- Show all previous versions of form
- Highlight changes between versions
- Show approval/rejection comments
- Audit trail of who changed what

**Email Notification:**
When case agent resubmits after changes:
```
OPS Plan Resubmitted for Approval
Case #: 250416-XXXX
Case Agent: [Name]
Original Submit: [Date/Time]
Resubmitted: [Date/Time]

Supervisor: [Your Name], please review and approve
Link: [Form Link]
```

**Approved Form Distribution:**
Once approved:
- System generates printable briefing packet (OPS Plan + checklist + supplements)
- Automatically sends PDF to all team members
- Can be sent via email, text link, or QR code
- Timestamp shows approval date/time

**Output:**
- Approval workflow component
- Notification logic (email, SMS, in-app)
- Approval checklist UI
- Revision history view
- Audit logging
- Briefing packet generation

**User Controls:**
- Approval checklist items
- Required approvals (supervisor, commander, etc.)
- Notification templates
- Distribution method

---

## BUILD SEQUENCE (MVP)

**Phase 1 (Foundation):**
1. Prompt 1: Database schema & API
2. Prompt 2: Web UI for form entry
3. Prompt 3: PDF generation (print to exact layout)

**Phase 2 (Integration):**
4. Prompt 4: Equipment checklist
5. Prompt 5: Supplement tracking
6. Prompt 6: Supervisor approval workflow

**Testing & Refinement:**
- Test with real operation (TODAY'S WARRANT STRUCTURE)
- Print PDF, compare to original form
- Have supervisor use approval workflow
- Collect feedback, iterate

---

## KEY CONSTRAINTS

- **Print Layout:** Must match original RCSO OPS Plan form EXACTLY
- **No Changes to Form Structure:** All 5 pages, all sections, same order
- **Photo Support:** Must embed photos in print output cleanly
- **Mobile-Friendly:** Must work on iPad during briefing and field
- **Integration:** Complaint # links to case system, Personnel links to user database
- **Offline-Ready:** Can fill form offline, syncs when connected
- **Audit Trail:** Every change logged, timestamped, attributed to user
- **Secure Upload:** Photos and documents encrypted in transit and at rest

---

## NEXT STEP

Once Cursor builds Prompts 1-3 (Form + PDF), you'll have:
- ✓ Digital OPS Plan form (matches original exactly)
- ✓ Photo upload capability
- ✓ Printable PDF (briefing materials)

Then add Prompts 4-6:
- ✓ Equipment checklist (integrated)
- ✓ Supplement reminders (role-based)
- ✓ Supervisor approval workflow

This becomes the MVP: **One form that governs an entire search warrant operation.**

