# RCSO CID Portal — public roadmap

Thin reference for stack decisions, roles vs modules, and build order.  
(Living doc — update as scope changes.)

## Locked stack

| Area | Choice |
|------|--------|
| Host | Vercel |
| App | Next.js (App Router), desktop-first + PWA companion |
| Data / auth | Supabase (Postgres, Auth, RLS, Storage) |
| Calendar | Google Calendar, **per-user OAuth** |
| TCA | In-house corpus + search; **Claude** for summary / lookup |
| Map | Static **event map** only — **no live tracking** |

## Roles

`Admin` · `SupervisionAdmin` · `Supervision` · `FTO Coordinator` · `FTO` · `Detective` · `DIT`

## Role × module (abbreviated)

Legend: **A** full admin · **U** normal use (scoped) · **R** read/search · **L** limited writes · **—** none  

| Module | Admin | SupAdm | Super | FTO Co | FTO | Det | DIT |
|--------|:-----:|:------:|:-----:|:------:|:---:|:---:|:---:|
| Org / users / audit | A | A | L | R | — | — | — |
| Directory | A | A | R | R | R | R | R |
| Cases | A | A | L | R | R | U | R |
| Forms (templates) | A | A | R | L | — | — | — |
| Forms (submit / print) | A | A | R | U | U | U | L |
| Schedule (org) | A | A | R | R | R | R | R |
| Schedule (personal + Google) | A | A | R | U | U | U | U |
| PTO / training / inservice | A | A | L | L | L | U | U |
| On-call / call-out | A | A | R | L | R | R | — |
| Call-out intake | A | A | R | U | U | U | — |
| Requests / notifications | A | A | L | U | U | U | L |
| FTO management | A | A | R | A | L | R | R |
| FTO evals / logs | A | A | R | R | U | R | R |
| DIT track | A | A | R | A | L | R | U |
| Event map | A | A | R | L | R | R | R |
| TCA + bookmarks / recents | R | R | R | R | R | R | R |
| TCA AI (summary / lookup) | U | U | R | R | R | R | R |

*RLS + policies must match this matrix; UI hides nav only as a convenience.*

---

## Role × module (expanded, with footnotes)

Use this when writing RLS policies and acceptance tests. Legend: **Full** = administer + normal use in module · **Use** = day-to-day create/edit (scoped) · **View** = read/search · **Lim** = narrow writes (see note) · **—** = no access

| Module | Admin | Supervision Admin | Supervision | FTO Coordinator | FTO | Detective | DIT |
|--------|:-----:|:-----------------:|:-----------:|:-----------------:|:---:|:-----------:|:---:|
| **Auth / org settings** (roles, units, feature flags, integrations) | Full | Full | View | View | View | — | — |
| **Users / invites** (disable user, reset invite, audit) | Full | Full | Lim¹ | — | — | — | — |
| **Directory** (roster, phones, units) | Full | Full | View | View | View | View | View² |
| **Cases** (metadata, assignments, status — not CJIS systems of record) | Full | Full | Lim³ | View | View⁴ | Use⁵ | View⁶ |
| **Forms – templates** (build / version / publish) | Full | Full | View | Lim⁷ | — | — | — |
| **Forms – submit** (fill, draft, finalize, print) | Full | Full | View | Use | Use⁸ | Use | Lim⁹ |
| **Schedule – org view** (read-only board / coverage) | Full | Full | View | View | View | View | View |
| **Schedule – personal** (per-user Google OAuth + my shifts / PTO requests) | Full | Full | View | Use | Use | Use | Use¹⁰ |
| **Time off / training / inservice requests** | Full | Full | Lim¹¹ | Lim¹² | Lim¹³ | Use | Use¹⁰ |
| **On-call / call-out roster** | Full | Full | View | Lim¹⁴ | View | View | — |
| **Call-out intake** (address / info form) | Full | Full | View | Use | Use | Use | — |
| **Requests / notifications** (generic workflows) | Full | Full | Lim¹⁵ | Use | Use | Use | Lim¹⁶ |
| **FTO management** (pairings, phases, coordination) | Full | Full | View | Full | Lim¹⁷ | View | View⁶ |
| **FTO evaluations / observation logs** | Full | Full | View | View | Use⁸ | View | View⁶ |
| **DIT track** (milestones, assignments, progress) | Full | Full | View | Full | Lim¹⁸ | View | Use¹⁹ |
| **Event map** (static pins / layers, no live tracking) | Full | Full | View | Lim²⁰ | View | View | View |
| **TCA** (browse, citation lookup, keyword search) | Full | Full | View | View | View | View | View |
| **TCA – bookmarks / recents** | Own | Own | Own | Own | Own | Own | Own |
| **TCA – AI summary / AI lookup (Claude)** | Full | Full | View | View | View | View | View²¹ |
| **Audit / exports** (who changed what, CSV / PDF) | Full | Full | View | — | — | — | — |

### Footnotes

1. **Supervision – users:** e.g. deactivate in-unit accounts, not global tenant destroy.  
2. **DIT – directory:** optional masked fields (e.g. personal cell) if policy requires.  
3. **Supervision – cases:** e.g. reassign lead, approve closure, add supervision comments — not arbitrary delete.  
4. **FTO – cases:** read trainee-linked cases only (via assignment join).  
5. **Detective – cases:** create/edit **own** cases or cases explicitly assigned; no org-wide case admin.  
6. **DIT – cases:** read-only on cases explicitly linked to training.  
7. **FTO Coordinator – form templates:** publish training / FTO pack forms; not necessarily all department templates (split in schema if needed).  
8. **FTO – forms:** submit/evaluate forms for **assigned trainees** + own HR-ish forms.  
9. **DIT – forms:** assigned training forms only; no ad-hoc criminal case forms unless policy allows.  
10. **DIT – schedule / PTO:** self-service only (own calendar connect, own requests).  
11. **Supervision – PTO / training:** approve/deny for unit members.  
12. **FTO Coordinator – PTO / training:** approve for FTO program conflicts + schedule coordination (scope tightly).  
13. **FTO – PTO / training:** propose changes affecting trainee pairing; optional small “coordination” write.  
14. **FTO Coordinator – on-call:** maintain rotations / pairings with Admin override.  
15. **Supervision – requests:** approve/deny / route within unit.  
16. **DIT – requests:** limited types (e.g. training room, equipment) if you want; otherwise **—**.  
17. **FTO – management:** edit **own** pairing notes, session logs, availability — not global roster unless also Coordinator.  
18. **FTO – DIT:** update trainee progress items they own; Coordinators own structure.  
19. **DIT – track:** complete assigned tasks, upload required docs, acknowledge policies — no editing others’ records.  
20. **Event map:** Coordinators / Admins maintain event layers; everyone else views.  
21. **DIT – TCA AI:** optional **View** with tighter rate limits / logging; or **—** if you want zero AI for trainees — policy call.

### PWA + per-user OAuth

- **Schedule – personal** applies to each user who connects Google; **org schedule** stays mostly **View** except Admin / Coordinator maintenance surfaces.  
- The companion PWA should rely on the **same RLS** as desktop; hiding nav is UX only.

---

## Build phases

### Phase 0 — Scaffold

- Next.js on Vercel, Supabase client, env pattern, basic layout shell (dark “case file” theme stub).
- **Exit:** deploy preview runs; no secrets in repo.

### Phase 1 — Auth, profiles, RLS pattern

- Supabase Auth (email/password + signup policy as you define).
- `profiles` with role enum; first RLS policies (read own row; Admin read/write per policy).
- Login / signup pages; post-login redirect; session refresh.
- **Exit:** user can sign in; role on `profiles` drives a stub gated route.

### Phase 2 — App shell + navigation

- Side nav, header, role-based menu visibility (mirror matrix).
- Design tokens: noir palette, typography, folder / stamp accents (accessible contrast).
- **Exit:** all roles see correct nav set; empty placeholders for modules.

### Phase 3 — Directory

- CRUD for Admin/SupAdm; read for others; optional field masking for DIT.
- **Exit:** roster live; RLS enforced.

### Phase 4 — PWA companion baseline

- Web app manifest, icons, service worker strategy (offline optional / cache static).
- Mobile-first routes or `/m/*` for Schedule, call-out, directory, FTO snapshot (read-only stubs OK).
- **Exit:** installable PWA; shared auth with desktop.

### Phase 5 — Schedule + Google (per user)

- Connect / disconnect Google; store tokens per user (Supabase secure pattern).
- Org schedule view (read); personal calendar sync (read-first, then write if needed).
- PTO / training / inservice request flow + Supervision approval path.
- **Exit:** OAuth works in prod; schedule pages usable on PWA.

### Phase 6 — Requests + notifications

- Generic request model (type, payload, status, assignee).
- In-app notifications; email optional (Resend / similar).
- **Exit:** create → approve/deny → audit fields.

### Phase 7 — Forms

- Template builder (Admin/SupAdm); versioning; publish.
- Fill / draft / finalize; print stylesheet or PDF export matching paper layout.
- **Exit:** 1–2 pilot forms end-to-end.

### Phase 8 — Cases (lightweight)

- Case metadata, assignment, status; attachments via Storage with RLS.
- **Exit:** Detective scoped create/edit; Supervision limited actions per matrix.

### Phase 9 — FTO + DIT

- Pairings, phases, milestones; FTO eval / observation logs.
- DIT dashboard: assigned tasks and forms only.
- **Exit:** Coordinator full workflow; FTO/DIT RLS tied to assignments.

### Phase 10 — On-call + call-out

- Rotation model; call-out intake form; notifications to relevant roles.
- **Exit:** roster + form + PWA access for field use.

### Phase 11 — Event map (static)

- Mapbox (or static map): layers, pins, no live tracking; Admin/Coordinator maintain data.
- **Exit:** view on desktop + PWA.

### Phase 12 — Tennessee Code Annotated

- Ingestion job for agreed titles (36–40, 55, 57), polite rate limits, normalized tables.
- Browse, keyword search, citation lookup; bookmarks + recents per user.
- Claude: retrieve-then-generate summaries / Q&A with statute excerpts + disclaimers.
- **Exit:** search + AI features logged; caching to control cost.

---

*File: `public/cid-portal-roadmap.md` — served as static asset at `/cid-portal-roadmap.md` once the app is deployed.*
