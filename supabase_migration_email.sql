-- Migration: add email column to patients table
-- Run this in Supabase SQL editor if upgrading from an earlier schema version

alter table patients add column if not exists email text;
create index if not exists patients_email_idx on patients(email);
