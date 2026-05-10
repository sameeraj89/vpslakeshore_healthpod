-- Staff alerts table — created when a patient scores RED tier on HRA
-- Run this in the Supabase SQL editor

create table if not exists staff_alerts (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid references patients(id) on delete cascade,
  alert_type  text not null default 'red_tier_hra',
  score       integer,
  message     text,
  resolved    boolean not null default false,
  resolved_by text,
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);

-- Index for dashboard queries (unresolved alerts, recent first)
create index if not exists staff_alerts_unresolved on staff_alerts(resolved, created_at desc);
create index if not exists staff_alerts_patient on staff_alerts(patient_id);

-- RLS: only authenticated users can read/write alerts
alter table staff_alerts enable row level security;

create policy "Authenticated users can read alerts"
  on staff_alerts for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert alerts"
  on staff_alerts for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update alerts"
  on staff_alerts for update
  using (auth.role() = 'authenticated');
