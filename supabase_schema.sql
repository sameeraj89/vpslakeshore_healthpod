-- HealthPod — canonical schema (run this for a fresh setup)
-- Consolidates: original schema + migration_abha + migration_v2 + migration_v3
-- DO NOT re-run against a database that already has data.

-- ─────────────────────────────────────────────
-- patients
-- ─────────────────────────────────────────────
create table if not exists patients (
  id                 uuid primary key default gen_random_uuid(),
  uhid               text unique not null,
  name               text not null,
  dob                date,
  age                integer,
  gender             text,
  phone              text,
  phone2             text,
  email              text,
  address            text,
  district           text,
  occupation         text,
  education          text,
  marital_status     text,
  insurance          text,
  camp_name          text,
  referred_by        text,
  tobacco_use        text,
  alcohol_use        text,
  aadhaar_last4      text,
  abha_number        text,
  abha_address       text,
  consent_given      boolean default true,
  consent_timestamp  timestamptz default now(),
  risk_score         integer default 0,
  risk_level         text default 'low',
  referred           boolean default false,
  referral_notes     text,
  created_by         uuid references auth.users(id),
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- ─────────────────────────────────────────────
-- risk_assessments
-- ─────────────────────────────────────────────
create table if not exists risk_assessments (
  id                         uuid primary key default gen_random_uuid(),
  patient_id                 uuid references patients(id) on delete cascade,
  tobacco_use                text,
  alcohol_use                text,
  diet                       text,
  physical_activity          text,
  bmi_category               text,
  family_history_cancer      boolean default false,
  family_history_diabetes    boolean default false,
  family_history_hypertension boolean default false,
  previous_cancer            boolean default false,
  chronic_conditions         text,
  diabetes                   boolean default false,
  hypertension               boolean default false,
  sexual_partners            text,
  pap_smear_history          text,
  breast_symptoms            text,
  blood_in_stool             boolean default false,
  psa_symptoms               boolean default false,
  score                      integer default 0,
  answers                    jsonb,
  created_at                 timestamptz default now()
);

-- ─────────────────────────────────────────────
-- screenings
-- ─────────────────────────────────────────────
create table if not exists screenings (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid references patients(id) on delete cascade,
  cancer_type  text not null,
  method       text,
  finding      text,
  result       text,
  notes        text,
  screened_by  text,
  screened_at  timestamptz default now(),
  created_at   timestamptz default now()
);

-- ─────────────────────────────────────────────
-- screening_images
-- ─────────────────────────────────────────────
create table if not exists screening_images (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid references patients(id) on delete cascade,
  screening_id uuid references screenings(id) on delete cascade,
  file_path    text not null,
  file_name    text,
  caption      text,
  uploaded_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- referrals
-- ─────────────────────────────────────────────
create table if not exists referrals (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid references patients(id) on delete cascade,
  referred_to  text,
  department   text,
  reason       text,
  notes        text,
  priority     text default 'routine',
  status       text default 'pending',
  created_by   text,
  created_at   timestamptz default now()
);

-- ─────────────────────────────────────────────
-- staff_profiles
-- ─────────────────────────────────────────────
create table if not exists staff_profiles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  email      text not null,
  name       text,
  role       text not null default 'data_entry' check (role in ('data_entry','doctor','lab','coordinator','admin')),
  active     boolean not null default true,
  created_at timestamptz default now()
);

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

-- ─────────────────────────────────────────────
-- doctor_notes (append-only — one row per visit)
-- ─────────────────────────────────────────────
create table if not exists doctor_notes (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references patients(id) on delete cascade,
  doctor_name         text,
  clinical_assessment text,
  diagnosis           text,
  treatment_plan      text,
  followup_date       date,
  created_at          timestamptz default now()
);

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

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────
create index if not exists patients_uhid_idx         on patients(uhid);
create index if not exists patients_phone_idx        on patients(phone);
create index if not exists patients_abha_number_idx  on patients(abha_number);
create index if not exists patients_abha_address_idx on patients(abha_address);
create index if not exists screenings_patient_idx    on screenings(patient_id);
create index if not exists screenings_type_idx       on screenings(cancer_type);
create index if not exists follow_ups_patient_id_idx on follow_ups(patient_id);
create index if not exists follow_ups_date_idx       on follow_ups(followup_date);

-- ─────────────────────────────────────────────
-- Storage
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('screening-images', 'screening-images', false)
  on conflict do nothing;

-- ─────────────────────────────────────────────
-- RLS — see supabase_rls.sql for role-based policies
-- ─────────────────────────────────────────────
alter table patients           enable row level security;
alter table risk_assessments   enable row level security;
alter table screenings         enable row level security;
alter table screening_images   enable row level security;
alter table referrals          enable row level security;
alter table staff_profiles     enable row level security;
alter table camps              enable row level security;
alter table doctor_notes       enable row level security;
alter table follow_ups         enable row level security;
