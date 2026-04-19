-- Segment E, Prompt 13 (related doc) — Equipment Check-Off.
--
-- Tracks the agency-issued equipment / gear handed to a DIT at the end of
-- the program. One row per (dit_record_id); the signature chain lives on
-- document_signatures (doc_type='equipment_checkoff', routing
-- FTO Coordinator → Training Supervisor → Lieutenant; final at LT).

create table if not exists public.equipment_checkoffs (
  id uuid primary key default gen_random_uuid(),
  dit_record_id uuid not null references public.dit_records(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft','issued','signed','voided')),
  items jsonb not null default '[]'::jsonb,
  notes text,
  signature_route_id uuid references public.document_signatures(id) on delete set null,
  issued_by uuid references auth.users(id) on delete set null,
  issued_at timestamptz,
  signed_at timestamptz,
  voided_at timestamptz,
  voided_by uuid references auth.users(id) on delete set null,
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists equipment_checkoffs_dit_record_id_uidx
  on public.equipment_checkoffs(dit_record_id);

create index if not exists equipment_checkoffs_status_idx
  on public.equipment_checkoffs(status);

comment on table public.equipment_checkoffs is
  'Agency equipment check-off for a graduating DIT. items jsonb is an array of { key, label, checked, serial?, note? }. Signature chain: FTO Coordinator → Training Supervisor → LT.';

drop trigger if exists set_equipment_checkoffs_updated_at on public.equipment_checkoffs;
create trigger set_equipment_checkoffs_updated_at
  before update on public.equipment_checkoffs
  for each row execute function public.set_profiles_updated_at();

alter table public.equipment_checkoffs enable row level security;

drop policy if exists equipment_checkoffs_select_scope on public.equipment_checkoffs;
create policy equipment_checkoffs_select_scope
  on public.equipment_checkoffs
  for select
  using (
    public.profile_reads_all_training()
    or exists (
      select 1 from public.dit_records r
      where r.id = equipment_checkoffs.dit_record_id and r.user_id = auth.uid()
    )
    or exists (
      select 1 from public.fto_pairings p
      join public.dit_records r on r.user_id = p.dit_id
      where r.id = equipment_checkoffs.dit_record_id
        and p.fto_id = auth.uid()
        and p.is_active = true
    )
  );

drop policy if exists equipment_checkoffs_insert_writer on public.equipment_checkoffs;
create policy equipment_checkoffs_insert_writer
  on public.equipment_checkoffs
  for insert
  with check (public.is_training_writer());

drop policy if exists equipment_checkoffs_update_writer on public.equipment_checkoffs;
create policy equipment_checkoffs_update_writer
  on public.equipment_checkoffs
  for update
  using (public.is_training_writer())
  with check (public.is_training_writer());

drop policy if exists equipment_checkoffs_delete_writer on public.equipment_checkoffs;
create policy equipment_checkoffs_delete_writer
  on public.equipment_checkoffs
  for delete
  using (public.is_training_writer());
