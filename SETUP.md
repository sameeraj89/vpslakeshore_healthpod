# HealthPod — Setup Guide

## 1. Supabase Project

1. Go to [supabase.com](https://supabase.com) → New project
2. Note your **Project URL** and **anon public key** (Settings → API)
3. Open the SQL Editor → paste the entire contents of `supabase_schema.sql` → Run

## 2. Environment Variables

```bash
cp .env.example .env.local
```
Edit `.env.local` and fill in your Supabase URL and anon key.

## 3. Create First User

In Supabase → Authentication → Users → Invite user  
(or use "Add user" to create staff accounts manually)

## 4. Run Locally

```bash
npm install
npm run dev
```
Open `http://localhost:5173`

## 5. Deploy (Vercel — free)

```bash
npm install -g vercel
vercel
```
Set the two env vars in Vercel dashboard → Deployments → Environment Variables.

## User Roles (current)

All authenticated users have full access. For role-based access, adjust Supabase RLS policies per the `user_role` column you can add to `auth.users` metadata.

## Screening Flow

1. Register patient → UHID auto-generated
2. Go to patient → Risk Assessment tab → complete questionnaire
3. Switch to each cancer tab (Oral / Breast / Cervix / Colon / Prostate) → record findings
4. Upload clinical images directly from tablet camera
5. Create referral if needed
6. Export Excel linelist from Patients page anytime
