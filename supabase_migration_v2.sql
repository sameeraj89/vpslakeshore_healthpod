-- HealthPod Migration v2
-- Run this in Supabase SQL editor after supabase_schema.sql and supabase_migration_abha.sql

-- ─────────────────────────────────────────────
-- staff_profiles
-- ─────────────────────────────────────────────
create table if not exists staff_profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  email       text not null,
  name        text,
  role        text not null default 'data_entry' check (role in ('data_entry','doctor','lab','coordinator','admin')),
  active      boolean not null default true,
  created_at  timestamptz default now()
);

alter table staff_profiles enable row level security;

-- Admins and coordinators can manage staff
create policy "staff_profiles_select" on staff_profiles for select using (true);
create policy "staff_profiles_insert" on staff_profiles for insert with check (true);
create policy "staff_profiles_update" on staff_profiles for update using (true);


-- ─────────────────────────────────────────────
-- camps
-- ─────────────────────────────────────────────
create table if not exists camps (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  date        date not null,
  location    text,
  district    text,
  coordinator text,
  notes       text,
  created_at  timestamptz default now()
);

alter table camps enable row level security;
create policy "camps_all" on camps for all using (auth.role() = 'authenticated');


-- ─────────────────────────────────────────────
-- doctor_notes (one record per patient, upserted)
-- ─────────────────────────────────────────────
create table if not exists doctor_notes (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references patients(id) on delete cascade,
  doctor_name         text,
  clinical_assessment text,
  diagnosis           text,
  treatment_plan      text,
  followup_date       date,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  unique (patient_id)
);

alter table doctor_notes enable row level security;
create policy "doctor_notes_all" on doctor_notes for all using (auth.role() = 'authenticated');

-- auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists doctor_notes_updated_at on doctor_notes;
create trigger doctor_notes_updated_at
  before update on doctor_notes
  for each row execute function update_updated_at();


-- ─────────────────────────────────────────────
-- follow_ups
-- ─────────────────────────────────────────────
create table if not exists follow_ups (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references patients(id) on delete cascade,
  followup_date date not null,
  reason        text,
  assigned_to   text,
  status        text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  created_at    timestamptz default now()
);

alter table follow_ups enable row level security;
create policy "follow_ups_all" on follow_ups for all using (auth.role() = 'authenticated');

-- Index for efficient patient lookups
create index if not exists follow_ups_patient_id_idx on follow_ups(patient_id);
create index if not exists follow_ups_date_idx on follow_ups(followup_date);
