-- HealthPods + Campaigns migration
-- Run in Supabase SQL Editor

-- ─────────────────────────────────────────────
-- healthpods
-- ─────────────────────────────────────────────
create table if not exists healthpods (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  code         text unique not null,      -- e.g. HP-EKM-001
  district     text,
  address      text,
  contact_phone text,
  active       boolean default true,
  created_at   timestamptz default now()
);

alter table healthpods enable row level security;
create policy "authenticated read healthpods" on healthpods for select to authenticated using (true);
create policy "coordinator write healthpods"  on healthpods for all    to authenticated using (true);

-- ─────────────────────────────────────────────
-- campaigns
-- ─────────────────────────────────────────────
create table if not exists campaigns (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  cancer_types text[] default '{}',       -- empty = all types
  start_date   date not null,
  end_date     date not null,
  active       boolean default true,
  created_at   timestamptz default now()
);

alter table campaigns enable row level security;
create policy "authenticated read campaigns" on campaigns for select to authenticated using (true);
create policy "coordinator write campaigns"  on campaigns for all    to authenticated using (true);

-- ─────────────────────────────────────────────
-- campaign_healthpods  (junction)
-- ─────────────────────────────────────────────
create table if not exists campaign_healthpods (
  campaign_id  uuid references campaigns(id)  on delete cascade,
  healthpod_id uuid references healthpods(id) on delete cascade,
  primary key (campaign_id, healthpod_id)
);

alter table campaign_healthpods enable row level security;
create policy "authenticated read campaign_healthpods" on campaign_healthpods for select to authenticated using (true);
create policy "coordinator write campaign_healthpods"  on campaign_healthpods for all    to authenticated using (true);

-- ─────────────────────────────────────────────
-- extend patients
-- ─────────────────────────────────────────────
alter table patients add column if not exists healthpod_id  uuid references healthpods(id);
alter table patients add column if not exists campaign_id   uuid references campaigns(id);

-- ─────────────────────────────────────────────
-- extend screenings
-- ─────────────────────────────────────────────
alter table screenings add column if not exists healthpod_id uuid references healthpods(id);
alter table screenings add column if not exists campaign_id  uuid references campaigns(id);

-- Indexes for common lookups
create index if not exists idx_patients_healthpod  on patients(healthpod_id);
create index if not exists idx_patients_campaign   on patients(campaign_id);
create index if not exists idx_screenings_healthpod on screenings(healthpod_id);
