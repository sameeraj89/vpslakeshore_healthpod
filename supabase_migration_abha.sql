-- Run this in Supabase SQL Editor to add Aadhaar + ABHA fields

alter table patients
  add column if not exists aadhaar_last4 text,        -- last 4 digits only (never store full Aadhaar)
  add column if not exists abha_number text,           -- 14-digit: XX-XXXX-XXXX-XXXX
  add column if not exists abha_address text,          -- username@abdm format
  add column if not exists consent_given boolean default true,
  add column if not exists consent_timestamp timestamptz default now();

-- Index for ABHA lookups
create index if not exists patients_abha_number_idx on patients(abha_number);
create index if not exists patients_abha_address_idx on patients(abha_address);
