-- HealthPod — Role-based RLS policies
-- Run this AFTER supabase_schema.sql (or after the existing migrations for existing DBs).
-- Replaces blanket "authenticated full access" with per-role enforcement.
--
-- Roles come from auth.jwt() -> user_metadata.role (set in Supabase Auth dashboard).
-- Valid roles: admin, coordinator, doctor, lab, data_entry (default)

-- ─────────────────────────────────────────────
-- Helper: extract role from JWT
-- ─────────────────────────────────────────────
create or replace function auth_role()
returns text language sql stable as $$
  select coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    'data_entry'
  )
$$;

-- ─────────────────────────────────────────────
-- Drop old blanket policies
-- ─────────────────────────────────────────────
drop policy if exists "authenticated full access" on patients;
drop policy if exists "authenticated full access" on risk_assessments;
drop policy if exists "authenticated full access" on screenings;
drop policy if exists "authenticated full access" on screening_images;
drop policy if exists "authenticated full access" on referrals;
drop policy if exists "staff_profiles_select"     on staff_profiles;
drop policy if exists "staff_profiles_insert"     on staff_profiles;
drop policy if exists "staff_profiles_update"     on staff_profiles;
drop policy if exists "camps_all"                 on camps;
drop policy if exists "doctor_notes_all"          on doctor_notes;
drop policy if exists "follow_ups_all"            on follow_ups;

-- ─────────────────────────────────────────────
-- Drop unique constraint on doctor_notes.patient_id
-- (switching to append-only — multiple notes per patient)
-- ─────────────────────────────────────────────
alter table doctor_notes drop constraint if exists doctor_notes_patient_id_key;

-- ─────────────────────────────────────────────
-- patients
-- data_entry: insert only (register patients)
-- doctor, lab, coordinator, admin: read + write
-- ─────────────────────────────────────────────
create policy "patients_select" on patients
  for select to authenticated using (true);

create policy "patients_insert" on patients
  for insert to authenticated with check (true);

create policy "patients_update" on patients
  for update to authenticated
  using (auth_role() in ('admin', 'coordinator', 'doctor'));

create policy "patients_delete" on patients
  for delete to authenticated
  using (auth_role() = 'admin');

-- ─────────────────────────────────────────────
-- risk_assessments
-- ─────────────────────────────────────────────
create policy "risk_assessments_select" on risk_assessments
  for select to authenticated using (true);

create policy "risk_assessments_write" on risk_assessments
  for all to authenticated
  using (auth_role() in ('admin', 'coordinator', 'doctor', 'data_entry'))
  with check (auth_role() in ('admin', 'coordinator', 'doctor', 'data_entry'));

-- ─────────────────────────────────────────────
-- screenings
-- ─────────────────────────────────────────────
create policy "screenings_select" on screenings
  for select to authenticated using (true);

create policy "screenings_write" on screenings
  for all to authenticated
  using (auth_role() in ('admin', 'coordinator', 'doctor', 'lab', 'data_entry'))
  with check (auth_role() in ('admin', 'coordinator', 'doctor', 'lab', 'data_entry'));

-- ─────────────────────────────────────────────
-- screening_images
-- ─────────────────────────────────────────────
create policy "screening_images_select" on screening_images
  for select to authenticated using (true);

create policy "screening_images_write" on screening_images
  for all to authenticated
  using (auth_role() in ('admin', 'coordinator', 'doctor', 'lab', 'data_entry'))
  with check (auth_role() in ('admin', 'coordinator', 'doctor', 'lab', 'data_entry'));

-- ─────────────────────────────────────────────
-- referrals
-- Only doctors, coordinators, admins can create/edit referrals
-- ─────────────────────────────────────────────
create policy "referrals_select" on referrals
  for select to authenticated using (true);

create policy "referrals_write" on referrals
  for all to authenticated
  using (auth_role() in ('admin', 'coordinator', 'doctor'))
  with check (auth_role() in ('admin', 'coordinator', 'doctor'));

-- ─────────────────────────────────────────────
-- doctor_notes
-- Only doctors and admins can write; all can read
-- ─────────────────────────────────────────────
create policy "doctor_notes_select" on doctor_notes
  for select to authenticated using (true);

create policy "doctor_notes_insert" on doctor_notes
  for insert to authenticated
  with check (auth_role() in ('admin', 'doctor'));

create policy "doctor_notes_delete" on doctor_notes
  for delete to authenticated
  using (auth_role() = 'admin');

-- ─────────────────────────────────────────────
-- follow_ups
-- ─────────────────────────────────────────────
create policy "follow_ups_select" on follow_ups
  for select to authenticated using (true);

create policy "follow_ups_write" on follow_ups
  for all to authenticated
  using (auth_role() in ('admin', 'coordinator', 'doctor', 'data_entry'))
  with check (auth_role() in ('admin', 'coordinator', 'doctor', 'data_entry'));

-- ─────────────────────────────────────────────
-- staff_profiles (admin only for write)
-- ─────────────────────────────────────────────
create policy "staff_profiles_select" on staff_profiles
  for select to authenticated using (true);

create policy "staff_profiles_write" on staff_profiles
  for all to authenticated
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

-- ─────────────────────────────────────────────
-- camps
-- ─────────────────────────────────────────────
create policy "camps_select" on camps
  for select to authenticated using (true);

create policy "camps_write" on camps
  for all to authenticated
  using (auth_role() in ('admin', 'coordinator'))
  with check (auth_role() in ('admin', 'coordinator'));

-- ─────────────────────────────────────────────
-- Storage policy (unchanged)
-- ─────────────────────────────────────────────
create policy "authenticated image access" on storage.objects
  for all to authenticated
  using (bucket_id = 'screening-images')
  with check (bucket_id = 'screening-images');
