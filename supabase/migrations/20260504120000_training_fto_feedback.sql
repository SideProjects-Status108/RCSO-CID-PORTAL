-- Segment E, Prompt 14 — FTO Feedback Survey.
--
-- DIT-facing survey that collects structured ratings + free-text comments
-- about an FTO. Writers (Coordinator / Training Supervisor / Supervision
-- Admin) see aggregate dashboards. FTOs see anonymized aggregates only
-- (no DIT names, no raw comments). Submission opens a doc_type='fto_feedback'
-- signature route (dit → fto_coordinator → training_supervisor) that
-- serves as the acknowledgment chain.

create table if not exists public.fto_feedback_surveys (
  id uuid primary key default gen_random_uuid(),
  dit_record_id uuid not null references public.dit_records(id) on delete cascade,
  fto_id uuid not null references auth.users(id) on delete restrict,
  pairing_id uuid references public.fto_pairings(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft','submitted','acknowledged','voided')),
  ratings jsonb not null default '{}'::jsonb,
  comments text,
  signature_route_id uuid references public.document_signatures(id) on delete set null,
  submitted_at timestamptz,
  acknowledged_at timestamptz,
  voided_at timestamptz,
  voided_by uuid references auth.users(id) on delete set null,
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A DIT submits at most one survey per FTO per pairing. Multiple pairings
-- across separate windows each get their own row.
create unique index if not exists fto_feedback_surveys_uidx
  on public.fto_feedback_surveys(dit_record_id, fto_id, coalesce(pairing_id, '00000000-0000-0000-0000-000000000000'::uuid));

create index if not exists fto_feedback_surveys_fto_idx
  on public.fto_feedback_surveys(fto_id);
create index if not exists fto_feedback_surveys_status_idx
  on public.fto_feedback_surveys(status);

comment on table public.fto_feedback_surveys is
  'DIT-facing survey of an FTO. ratings jsonb is a map of rubric key \u2192 integer 1\u20135. Writers see aggregates; FTOs see anonymized aggregates only.';

drop trigger if exists set_fto_feedback_surveys_updated_at on public.fto_feedback_surveys;
create trigger set_fto_feedback_surveys_updated_at
  before update on public.fto_feedback_surveys
  for each row execute function public.set_profiles_updated_at();

alter table public.fto_feedback_surveys enable row level security;

-- SELECT: training readers (full row), DIT owner (their own drafts +
-- submitted rows), FTO (row exists but RLS column-level filtering is
-- enforced in application layer via anonymized queries \u2014 see queries
-- helper \u2014 so we expose submitted rows to the FTO here and rely on the
-- app to strip identifying fields).
drop policy if exists fto_feedback_surveys_select_scope on public.fto_feedback_surveys;
create policy fto_feedback_surveys_select_scope
  on public.fto_feedback_surveys
  for select
  using (
    public.profile_reads_all_training()
    or exists (
      select 1 from public.dit_records r
      where r.id = fto_feedback_surveys.dit_record_id
        and r.user_id = auth.uid()
    )
    or (
      fto_feedback_surveys.fto_id = auth.uid()
      and fto_feedback_surveys.status in ('submitted','acknowledged')
    )
  );

-- INSERT: the DIT themselves (owner of the record) or a training writer.
drop policy if exists fto_feedback_surveys_insert_scope on public.fto_feedback_surveys;
create policy fto_feedback_surveys_insert_scope
  on public.fto_feedback_surveys
  for insert
  with check (
    public.is_training_writer()
    or exists (
      select 1 from public.dit_records r
      where r.id = fto_feedback_surveys.dit_record_id
        and r.user_id = auth.uid()
    )
  );

-- UPDATE: DIT may edit while status='draft'; writers may edit any status.
drop policy if exists fto_feedback_surveys_update_scope on public.fto_feedback_surveys;
create policy fto_feedback_surveys_update_scope
  on public.fto_feedback_surveys
  for update
  using (
    public.is_training_writer()
    or (
      fto_feedback_surveys.status = 'draft'
      and exists (
        select 1 from public.dit_records r
        where r.id = fto_feedback_surveys.dit_record_id
          and r.user_id = auth.uid()
      )
    )
  )
  with check (
    public.is_training_writer()
    or (
      fto_feedback_surveys.status = 'draft'
      and exists (
        select 1 from public.dit_records r
        where r.id = fto_feedback_surveys.dit_record_id
          and r.user_id = auth.uid()
      )
    )
  );

-- DELETE: writers only.
drop policy if exists fto_feedback_surveys_delete_writer on public.fto_feedback_surveys;
create policy fto_feedback_surveys_delete_writer
  on public.fto_feedback_surveys
  for delete
  using (public.is_training_writer());
