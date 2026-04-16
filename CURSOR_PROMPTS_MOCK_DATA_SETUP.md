# Cursor Prompt: Mock Data Setup for Testing

**⚠️ CRITICAL: MOCK DATA ONLY — Never mix with production data**

---

## Prompt 1: Create Mock Data Generator

**Objective:** Build a management page to seed and purge mock data in Supabase.

```
CONTEXT:
The RCSO CID Portal is under construction. We need mock data for testing the 
training system, forms, and workflows WITHOUT sending real invites or interfering 
with production personnel (Amanda McPherson, Jeffery VerBruggen, etc.).

REQUIREMENT:
Create a mock data system that:
1. Generates fake auth users with prefix "mock-" (e.g., mock-fto-001@rcso.local)
2. Creates profiles with appropriate roles
3. Is completely isolated (easy to identify and purge)
4. Can be activated/deactivated via admin page

BUILD:
Page: /admin/mock-data-setup
Access: Admin only (profile.role === 'admin')

ORGANIZATIONAL CHART (Mock):
- 1 Captain (supervision_admin)
- 1 Lieutenant (supervision)
- 4 Sergeants (supervision)
- 2 FTO Coordinators (fto_coordinator)
- 7 FTOs (fto)
- 12 Detectives (detective)
- 2 Investigative Assistants (detective)
- [NOTE: How many DITs do you want paired with FTOs for testing? 
  Suggest: 6 DITs (dit role) to pair with 7 FTOs]

UI:
┌─ MOCK DATA MANAGEMENT ─────────────────────┐
│                                             │
│ ⚠️ WARNING: MOCK DATA ONLY                 │
│ Do not use in production. All users         │
│ prefixed "mock-" are test accounts.        │
│                                             │
│ STATUS: [Not Seeded / Seeded / Active]      │
│                                             │
│ ORGANIZATIONAL STRUCTURE:                   │
│ • 1 Captain                                 │
│ • 1 Lieutenant                              │
│ • 4 Sergeants                               │
│ • 2 FTO Coordinators                        │
│ • 7 FTOs                                    │
│ • 6 DITs                                    │
│ • 12 Detectives                             │
│ • 2 Investigative Assistants                │
│ Total: 35 mock users                        │
│                                             │
│ [SEED MOCK DATA]  [PURGE MOCK DATA]         │
│                                             │
│ GENERATED ACCOUNTS:                         │
│ (Shows table after seeding)                 │
│ Email | Name | Role | Password             │
│ mock-captain-001@rcso.local | Cap. Smith... │
│ mock-lt-001@rcso.local | Lt. Johnson...    │
│ mock-sgt-001@rcso.local | Sgt. Brown...    │
│ ... etc                                     │
│                                             │
│ [COPY ALL PASSWORDS] [DOWNLOAD CSV]         │
│                                             │
└─────────────────────────────────────────────┘

FUNCTIONALITY:

1. [SEED MOCK DATA] button:
   a. Creates 35 mock users in auth.users:
      - Email: mock-[role]-[number]@rcso.local
      - Password: Random 16-char (show in table)
      - No email verification needed (internal)
   
   b. Creates matching public.profiles:
      - role: captain, lieutenant, sergeant, fto_coordinator, fto, dit, detective, investigative_assistant
      - full_name: Realistic first/last names (Captain Smith, Lt. Johnson, Sgt. Brown, etc.)
      - badge_number: Auto-generated (1001-1035)
      - phone_cell: Fake phone numbers (615-555-0100 format)
      - unit: "CID"
      - is_active: true
      - created_at: now()
   
   c. Creates sample FTO pairings (fto_pairings table):
      - Pair each of 6 DITs with 1-2 FTOs randomly
      - week_start_date: 2 weeks ago
      - week_end_date: 1 week from now
      - status: active
      - phase: 1 or 2
   
   d. Creates sample activity exposures (training_activity_exposures):
      - Log 3-5 activities per DIT
      - Random activities (Death, Interview, Search Warrant, etc.)
      - Various FTOs assigned
      - Past dates
   
   e. Creates sample weekly evaluations (weekly_training_sessions):
      - 1 session per pairing (last week)
      - status: submitted
      - Competency scores (1-5, some not observed)
      - Some explanations for 1/2/5 scores
   
   f. Shows table with all created accounts:
      - Display: email, name, role, generated password
      - Button: [COPY ALL PASSWORDS]
      - Button: [DOWNLOAD CSV] (for documentation)
   
   g. Sets status to "Seeded"

2. [PURGE MOCK DATA] button:
   a. Confirms: "Delete all mock-* accounts? (35 users)"
   b. Cascading delete:
      - Delete from fto_pairings (mock DITs/FTOs)
      - Delete from weekly_training_sessions (cascades)
      - Delete from weekly_competency_scores (cascades)
      - Delete from training_activity_exposures (cascades)
      - Delete from deficiency_forms (cascades)
      - Delete from public.profiles (where full_name contains "Mock" or email has "mock-")
      - Delete from auth.users (where email has "mock-")
   c. Shows: "Purged: X users, Y profiles, Z evaluations"
   d. Sets status to "Not Seeded"

3. Data seeding details:

CAPTAIN:
- 1 user: mock-captain-001@rcso.local, Captain Robert Smith, role: supervision_admin

LIEUTENANT:
- 1 user: mock-lt-001@rcso.local, Lieutenant David Johnson, role: supervision

SERGEANTS (4):
- mock-sgt-001@rcso.local, Sergeant Michael Brown, role: supervision
- mock-sgt-002@rcso.local, Sergeant Jennifer Davis, role: supervision
- mock-sgt-003@rcso.local, Sergeant Christopher Miller, role: supervision
- mock-sgt-004@rcso.local, Sergeant Amanda Wilson, role: supervision

FTO COORDINATORS (2):
- mock-ftoc-001@rcso.local, Jeremy Murdock (updated), role: fto_coordinator
- mock-ftoc-002@rcso.local, Patricia Martinez, role: fto_coordinator

FTOs (7):
- mock-fto-001@rcso.local, Field Training Officer James Garcia, role: fto
- mock-fto-002@rcso.local, Field Training Officer Maria Rodriguez, role: fto
- mock-fto-003@rcso.local, Field Training Officer Anthony Taylor, role: fto
- mock-fto-004@rcso.local, Field Training Officer Lisa Anderson, role: fto
- mock-fto-005@rcso.local, Field Training Officer Brian Thomas, role: fto
- mock-fto-006@rcso.local, Field Training Officer Susan Jackson, role: fto
- mock-fto-007@rcso.local, Field Training Officer Donald White, role: fto

DITs (6):
- mock-dit-001@rcso.local, Detective in Training Michael Lawrence, role: dit
- mock-dit-002@rcso.local, Detective in Training Emily Harris, role: dit
- mock-dit-003@rcso.local, Detective in Training Christopher Martin, role: dit
- mock-dit-004@rcso.local, Detective in Training Jessica Thompson, role: dit
- mock-dit-005@rcso.local, Detective in Training Kevin Garcia, role: dit
- mock-dit-006@rcso.local, Detective in Training Rachel Lee, role: dit

DETECTIVES (12):
- mock-det-001 through mock-det-012, role: detective

INVESTIGATIVE ASSISTANTS (2):
- mock-ia-001@rcso.local, Investigative Assistant John Smith, role: detective
- mock-ia-002@rcso.local, Investigative Assistant Sarah Wilson, role: detective

PAIRINGS (sample):
- mock-fto-001 paired with mock-dit-001, mock-dit-002 (phase 1)
- mock-fto-002 paired with mock-dit-003 (phase 2)
- mock-fto-003 paired with mock-dit-004, mock-dit-005 (phase 1)
- mock-fto-004 paired with mock-dit-006 (phase 2)
- Remaining FTOs available for pairing

ACTIVITY LOGS (sample per DIT):
Each DIT has 3-5 logged activities:
- Death Investigation (observer/assistant)
- Search Warrant (assistant/lead)
- Interview (observer)
- Scene Photos (lead)
- Arrest (observer)
With real-looking dates, case numbers (2024-0001 format), FTO names

WEEKLY EVALUATIONS (sample):
Each pairing has 1 submitted evaluation:
- 18-20 competencies scored
- Mix of 1s, 2s, 3s, 4s, 5s
- Required explanations for 1/2/5
- Some "not observed" (blank)
- Status: "submitted"

IMPORTANT:
- All emails MUST use "mock-" prefix and "@rcso.local" domain
- All names should be realistic but clearly marked as mock
- Generate random but valid-looking badge numbers (1001-1035)
- Use realistic phone numbers (615-555-0xxx pattern)
- Passwords: Generate 16-char random strings (uppercase, lowercase, digits, symbols)
- created_at timestamps: Use dates in past 2 weeks
- is_active: true for all
- Use Supabase Admin API for auth user creation (not exposed to browser)
- Create API endpoint: POST /api/admin/mock-data/seed and DELETE /api/admin/mock-data/purge
- Frontend page calls these endpoints

4. Security:
- Admin-only access (check profile.role === 'admin' server-side)
- Add warning banner: "⚠️ MOCK DATA ONLY"
- Log all seed/purge actions with timestamp
- Never allow purge to affect real users (check email pattern "mock-" only)

RETURN VALUE:
After seeding, show:
{
  "status": "seeded",
  "total_users": 35,
  "accounts": [
    {
      "email": "mock-captain-001@rcso.local",
      "name": "Captain Robert Smith",
      "role": "supervision_admin",
      "password": "aBcD1234xyzW!@#$"
    },
    ... (35 total)
  ]
}

NOTES:
- Test the full training workflow with these mock users
- DITs can see own evals and progress
- FTOs can log activities and submit evals
- Coordinators can manage deficiency forms
- Can easily purge everything and start fresh
```

---

## Prompt 2: Verify Mock Data & Create Test Scenarios (After Seeding)

```
CONTEXT:
After mock data is seeded, verify everything works and create test scenarios.

TASK:
1. Create test scenario page at /admin/mock-data-scenarios

2. Verify seeded data:
   - Count: 35 users total
   - Verify 6 FTO pairings active
   - Verify activity logs present
   - Verify weekly evaluations submitted
   - List any errors

3. Provide quick-access buttons for testing:
   [Test Weekly Evaluation Flow]
   [Test Activity Logging]
   [Test Deficiency Form]
   [Test DIT Dashboard]
   [Test Coordinator Views]

4. Each button shows:
   - Recommended user to login as (email + password)
   - What to test
   - Expected results
   - Screenshot guide (if available)

EXAMPLE:
Button: "Test Weekly Evaluation Flow"
├─ Login as: mock-fto-001@rcso.local / [password]
├─ DIT: mock-dit-001@rcso.local
├─ Step 1: Go to Training > Pairings
├─ Step 2: Select pairing with mock-dit-001
├─ Step 3: Start weekly evaluation
├─ Step 4: Rate competencies (fill some, leave some blank)
├─ Step 5: Submit evaluation
├─ Expected: Eval submits, unobserved list appears, DIT gets notified
└─ Verify: Check mock-dit-001's dashboard for new eval
```

---

## Once Mock Data Is Seeded

1. ✅ All 35 users will be able to login with their mock email + generated password
2. ✅ FTOs can log activities with DITs
3. ✅ DITs can see their training progress
4. ✅ Coordinators can view all training
5. ✅ Full workflow testable end-to-end
6. ✅ Easy to purge and start fresh
7. ✅ No interference with production data (Amanda, Jeffery, etc.)

---

## Important Notes

- **Do NOT send email invites** — Mock emails (@rcso.local) don't exist
- **Accounts work immediately** — Password is set, no reset email needed
- **Complete isolation** — All prefixed "mock-", easy to identify and delete
- **Cascade delete** — Purge removes everything cleanly
- **Safe to test** — Won't affect real personnel or production data

