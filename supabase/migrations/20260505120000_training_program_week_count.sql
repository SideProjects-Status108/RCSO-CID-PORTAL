-- Segment E, Prompt 15 (Training Settings) — program week count tunable.
--
-- Adds the program-week count knob to training_program_config so admins
-- can adjust the schedule grid length without a code change. The
-- existing DEFAULT_PROGRAM_WEEKS constant in
-- src/lib/training/scheduling.ts remains the fallback when this config
-- row is unreachable; schedule-data.ts reads this value to size the
-- per-DIT row.

alter table public.training_program_config
  add column if not exists program_week_count integer not null default 10
    check (program_week_count between 4 and 26);
