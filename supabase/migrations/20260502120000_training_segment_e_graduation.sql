-- Segment E, Prompt 13 — Graduation trigger + completion certificate.
--
-- Adds the `completion_certificates` table that backs the signature-routed
-- certificate document (doc_type='completion_cert', routing Coord → TS → LT
-- → Capt). One row per (dit_record_id) — a DIT graduates at most once, and
-- any re-issue reuses the same record (updated_at bumps).
--
-- Lifecycle:
--   draft      — record created, PDF not generated yet, signatures pending
--   issued     — PDF generated + stored, signature route opened
--   signed     — all four signers completed via document_signatures
--   voided     — explicit cancellation by a training writer
--
-- PDF bytes live in the `training-documents` storage bucket under
-- completion-certificates/<dit_record_id>.pdf. We store the object path on
-- the row (not the bytes) so storage RLS governs downloads.

create table if not exists public.completion_certificates (
  id uuid primary key default gen_random_uuid(),
  dit_record_id uuid not null references public.dit_records(id) on delete cascade,
  issued_by uuid references auth.users(id) on delete set null,
  issued_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft','issued','signed','voided')),
  pdf_object_path text,
  signature_route_id uuid references public.document_signatures(id) on delete set null,
  -- Snapshot fields captured at issue time so the PDF is reproducible even
  -- if the DIT profile or program window later changes.
  dit_full_name text,
  dit_badge_number text,
  program_start_date date,
  program_end_date date,
  effective_graduation_date date,
  notes text,
  signed_at timestamptz,
  voided_at timestamptz,
  voided_by uuid references auth.users(id) on delete set null,
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists completion_certificates_dit_record_id_uidx
  on public.completion_certificates(dit_record_id);

create index if not exists completion_certificates_status_idx
  on public.completion_certificates(status);

comment on table public.completion_certificates is
  'Graduation certificates for Detective in Training. One per dit_record; PDF object lives in the training-documents bucket and the signature chain lives on document_signatures (doc_type=completion_cert).';

-- updated_at trigger (reuses the shared helper from profiles).
drop trigger if exists set_completion_certificates_updated_at on public.completion_certificates;
create trigger set_completion_certificates_updated_at
  before update on public.completion_certificates
  for each row execute function public.set_profiles_updated_at();

-- RLS --------------------------------------------------------------------

alter table public.completion_certificates enable row level security;

-- Readable by training-reading staff, the DIT themselves, and the DIT's
-- currently-paired FTO. Matches document_signatures scope so UI joins are
-- symmetric.
drop policy if exists completion_certificates_select_scope on public.completion_certificates;
create policy completion_certificates_select_scope
  on public.completion_certificates
  for select
  using (
    public.profile_reads_all_training()
    or exists (
      select 1
      from public.dit_records r
      where r.id = completion_certificates.dit_record_id
        and r.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.fto_pairings p
      join public.dit_records r on r.user_id = p.dit_id
      where r.id = completion_certificates.dit_record_id
        and p.fto_id = auth.uid()
        and p.is_active = true
    )
  );

-- Writers (training coordinator + supervision+) can create / update / delete.
drop policy if exists completion_certificates_insert_writer on public.completion_certificates;
create policy completion_certificates_insert_writer
  on public.completion_certificates
  for insert
  with check (public.is_training_writer());

drop policy if exists completion_certificates_update_writer on public.completion_certificates;
create policy completion_certificates_update_writer
  on public.completion_certificates
  for update
  using (public.is_training_writer())
  with check (public.is_training_writer());

drop policy if exists completion_certificates_delete_writer on public.completion_certificates;
create policy completion_certificates_delete_writer
  on public.completion_certificates
  for delete
  using (public.is_training_writer());
