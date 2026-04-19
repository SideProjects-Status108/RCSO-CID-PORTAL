# Training Module — Shadow Environment

A way to drive the full Detective-in-Training workflow end-to-end against
our live Supabase project **without** ever sending a real email to a real
supervisor.

Every seeded account uses:

- the person's **real** name, rank, badge, and role
- a **MailSlurp**-provisioned fake email address
- a single **shared dev password** so you can role-swap fast

On top of that, the email dispatcher enforces a **hard safelist** — even
if a code path accidentally sends to a real `@rcso.org` address, nothing
will leave the server.

---

## One-time setup

Add these to `.env.local`:

```
# --- Required by the seeder ---
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
MAILSLURP_API_KEY=<your-mailslurp-key>

# --- Optional overrides ---
TRAINING_SHADOW_PASSWORD=RCSOCID964!            # default used if unset

# --- Safelist (guards outbound email) ---
TRAINING_EMAIL_PROVIDER=stub                     # stub = log only, no real send
TRAINING_EMAIL_SAFELIST_DOMAINS=mailslurp.mx,mailslurp.com,mailslurp.net,example.com,test.rcso.local
```

Flip `TRAINING_EMAIL_PROVIDER=smtp` + the `SMTP_*` vars later when you
want to watch real emails flow through MailSlurp — but **only** when the
safelist is also set. With `provider=stub`, no mail is attempted at all.

---

## Seed the environment

```
npm run training:seed-shadow
```

On success it writes `.shadow-roster.local.json` (gitignored) with
every person's login credentials, e.g.:

```json
{
  "password": "RCSOCID964!",
  "people": [
    {
      "full_name": "Daniel McGee",
      "role": "dit",
      "email": "abc123@mailslurp.mx",
      "password": "RCSOCID964!"
    },
    …
  ]
}
```

The seeder is **idempotent** — run it as many times as you want. It:

1. Provisions/looks up MailSlurp inboxes named `rcso-shadow:<key>`
2. Creates or updates Supabase auth users (tagged `app_metadata.shadow=true`)
3. Upserts `profiles` (role, badge, FTO color, training-supervisor seat)
4. Upserts `dit_records` + active `fto_pairings`
5. Backfills McGee (9 weeks approved + activity exposures, cases,
   call-out, PBLE) so his graduation flow is ready to fire
6. Backfills Arrington's first two weeks so week 3 lands clean

**McGee's week 10 is intentionally left unsubmitted.** Log in as Detective
McCullough, open DIT Files → Daniel McGee → Weekly Evals → draft week 10,
submit + approve it, and watch the certificate auto-draft + signature
chain open.

---

## Who's in the seed

| Name | Role | Badge | Notes |
|---|---|---|---|
| Todd Sparks | supervision_admin (Capt) | 500 | Signs as `cpt` |
| Steve Craig | supervision_admin (Lt) | 501 | Signs as `lt` |
| Amanda McPherson | supervision_admin (Training Supervisor seat) | 523 | Signs as `training_supervisor` |
| Thomas Burnett | supervision (Sgt) | 506 | |
| Jeremy Murdock | fto_coordinator | 525 | Paired with Arrington |
| Jeffery VerBruggen | fto | 518 | |
| Christina Overton | fto | 524 | |
| Derrick McCullough | fto | 519 | Paired with McGee |
| Grant Quintal | fto | 522 | |
| Breanna Copeland | detective | 505 | No training role — good for read-only scoping checks |
| **Daniel McGee** | **dit** | 520 | Start 2026-02-09 · about to graduate |
| **Matthew Arrington** | **dit** | 514 | Start 2026-04-06 · entering week 3 |
| **Anna Olson** | **dit** | 541 | Start 2026-05-11 · queued, no pairing yet |

---

## Tear it down

```
npm run training:reset-shadow
```

Deletes every auth user whose `app_metadata.shadow === true` and whose
`shadow_key` is in the current roster (profiles, DIT records, pairings,
weekly sessions, scores, exposures, cases, call-outs, PBLEs, and
certificates are all removed via `ON DELETE CASCADE`). Then deletes
every MailSlurp inbox named `rcso-shadow:*` and the local credentials
file.

---

## Wipe old dev/test accounts (keep shadow + you)

If you had dev/test accounts in Supabase from before the shadow seeder
existed, you can clean them out with:

```
# 1. Preview only — prints who WOULD be deleted, no changes made
npm run training:purge-non-shadow

# 2. Actually delete
npm run training:purge-non-shadow -- --confirm
```

The script **always keeps**:

- every user tagged `app_metadata.shadow === true` (the 13 seeded)
- every email listed in `PROTECTED_EMAILS` inside
  `scripts/training-shadow/purge-non-shadow.ts` (currently
  `bstanley@rcsotn.org`)

Everything else is deleted. Deleting an auth user cascades through
profiles, DIT records, pairings, weekly sessions, scores, activity
exposures, cases, call-outs, PBLEs, certificates, equipment
check-offs, and feedback surveys — so one run clears the whole
training module for any non-shadow user.

To protect another admin in the future, add their email to
`PROTECTED_EMAILS` in that script.

---

## How the email guard actually protects you

`src/lib/email/training-notifications.ts` → `dispatchTrainingEmail`:

1. If `TRAINING_EMAIL_PROVIDER === 'stub'`, nothing leaves the server — the
   message is logged in dev only.
2. Otherwise, the recipient domain is checked against
   `TRAINING_EMAIL_SAFELIST_DOMAINS`. If it's not on the list, the send is
   **refused**, tagged `[training-email:BLOCKED]`, and logged (always —
   even in production) so you can audit what would have been sent.

So a typo in a real supervisor's profile can never leak a real email
while the safelist is in effect.
