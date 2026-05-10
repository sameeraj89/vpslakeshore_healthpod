-- Run this in the Supabase SQL Editor
-- Adds lifestyle fields to patients table (captured at registration for quick access)

alter table patients
  add column if not exists tobacco_use text,
  add column if not exists alcohol_use text;
